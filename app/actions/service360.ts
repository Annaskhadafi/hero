"use server"

import { db } from "@/db"
import {
  service360Customers,
  service360Items,
  service360Quotations,
  service360QuotationItems,
  service360EmployeeLevels,
  service360RateSettings,
  service360FormHistory
} from "@/db/schema/service360"
import { attendanceRecords, employees, sites, masterDepartments, masterSections } from "@/db/schema/hero"
import {
  timesheetAttendanceRealOverrides,
  timesheetFieldBreakPlans,
  timesheetSchedulingPlans,
  timesheetSchedulingPlansV2,
  timesheetSchedulingConfigs,
} from "@/db/schema/timesheet"
import {
  buildContiguousQuotationRanges,
  DEFAULT_QUOTATION_BILLING_STATUS_CONFIG,
  getIsoDatesInRange,
  getPeriodsInDateRange,
  isQuotationAttendanceStatusBillable,
  normalizeQuotationBillingStatusConfig,
} from "@/lib/service360-quotation-attendance"
import { normalizeAttendanceStatus } from "@/lib/timesheet/attendance-real"
import { eq, desc, asc, and, sql, isNotNull, inArray, gte, lte, or, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function getCustomers() {
  return db.select().from(service360Customers).orderBy(desc(service360Customers.createdAt))
}

const ROMAN_NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

export async function generateNextQuotationNumber() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // Get the last quotation to create sequence safely (even if some were deleted)
  const lastQuotation = await db.select().from(service360Quotations).orderBy(desc(service360Quotations.id)).limit(1)
  let nextSeq = lastQuotation.length > 0 ? lastQuotation[0].id + 1 : 1
  
  const romanMonth = ROMAN_NUMERALS[currentMonth]
  const currentDate = new Date().getDate().toString().padStart(2, '0')
  
  let nextNumber = ""
  let isDuplicate = true
  
  // Keep checking and incrementing until we find a unique number
  while (isDuplicate) {
    const paddedSeq = nextSeq.toString().padStart(3, '0')
    nextNumber = `QUO/CP/${romanMonth}/${currentDate}/${paddedSeq}`
    
    const existing = await db.select().from(service360Quotations).where(eq(service360Quotations.quotationNumber, nextNumber)).limit(1)
    if (existing.length === 0) {
      isDuplicate = false
    } else {
      nextSeq++
    }
  }
  
  return nextNumber
}

export async function createCustomer(data: { customerName: string }) {
  const result = await db.insert(service360Customers).values(data).returning()
  revalidatePath("/dashboard/360-service/customers")
  return result[0]
}

export async function deleteCustomer(id: number) {
  try {
    await db.delete(service360Customers).where(eq(service360Customers.id, id))
    revalidatePath("/dashboard/360-service/customers")
    return { success: true }
  } catch (e: any) {
    if (e.code === '23503') { // Foreign key constraint
      return { error: "Cannot delete this customer because they have existing quotations." }
    }
    return { error: "Failed to delete customer." }
  }
}

export async function saveItemToMaster(data: { name: string, category: string, price: number }) {
  try {
    const [item] = await db.insert(service360Items).values({
      name: data.name,
      category: data.category || "General",
      price: data.price.toString()
    }).returning()
    return { success: true, item }
  } catch (error) {
    console.error("Error setting active revision:", error)
    return { success: false, error: "Failed to set active revision" }
  }
}

export async function getFormHistory(customerId: number) {
  return db.select().from(service360FormHistory).where(eq(service360FormHistory.customerId, customerId)).orderBy(desc(service360FormHistory.createdAt))
}

export async function saveFormHistory(customerId: number, data: { attn?: string, cc?: string, fromName?: string, subject?: string }) {
  const entries: any[] = []
  if (data.attn?.trim()) entries.push({ customerId, field: 'attn', value: data.attn.trim() })
  if (data.cc?.trim()) entries.push({ customerId, field: 'cc', value: data.cc.trim() })
  if (data.fromName?.trim()) entries.push({ customerId, field: 'fromName', value: data.fromName.trim() })
  if (data.subject?.trim()) entries.push({ customerId, field: 'subject', value: data.subject.trim() })

  if (entries.length > 0) {
    await db.insert(service360FormHistory).values(entries).onConflictDoNothing()
  }
}

export async function deleteFormHistory(id: number) {
  await db.delete(service360FormHistory).where(eq(service360FormHistory.id, id))
  return { success: true }
}

export async function getItems() {
  const allItems = await db
    .select({
      id: service360Items.id,
      name: service360Items.name,
      category: service360Items.category,
      price: service360Items.price,
      siteId: service360Items.siteId,
      siteName: sites.name,
      jobTitle: service360Items.jobTitle
    })
    .from(service360Items)
    .leftJoin(sites, eq(service360Items.siteId, sites.id))
    .orderBy(desc(service360Items.id))
    
  // Also get the labours and map them as virtual items so they show up everywhere Master Data is used
  const labours = await getEmployeeLabours()
  const labourItems = labours.map(emp => ({
    id: 1000000 + emp.id, // Virtual ID to avoid conflict with real items
    name: emp.name,
    category: "Labour Cost",
    price: emp.price || "0",
    siteId: emp.siteId,
    siteName: emp.siteName,
    jobTitle: emp.jobTitle || emp.section, // fallback to section if no job title
    level: emp.level
  }))

  return [...allItems, ...labourItems]
}

const quotationAttendanceSyncSchema = z.object({
  items: z.array(z.object({
    rowId: z.number().int(),
    itemId: z.number().int().min(1000001),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).refine((item) => item.endDate >= item.startDate, {
    message: "End Date must be greater than or equal to Start Date",
    path: ["endDate"],
  }).refine((item) => getIsoDatesInRange(item.startDate, item.endDate).length > 0, {
    message: "Date range is invalid",
    path: ["startDate"],
  })).min(1).max(250),
})

type SchedulingRow = {
  employeeId: number
  schedule: string[]
}

export async function syncQuotationLabourAttendance(
  input: z.infer<typeof quotationAttendanceSyncSchema>
) {
  const parsed = quotationAttendanceSyncSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: "Data Labour Cost atau periode belum valid." }
  }

  const requested = parsed.data.items.map((item) => ({
    ...item,
    employeeId: item.itemId - 1000000,
  }))
  const employeeIds = [...new Set(requested.map((item) => item.employeeId))]
  const employeeRows = await db
    .select({ id: employees.id, siteId: employees.siteId })
    .from(employees)
    .where(and(
      inArray(employees.id, employeeIds),
      eq(employees.department, "Central Services"),
      eq(employees.isActive, true)
    ))
  const employeesById = new Map(employeeRows.map((employee) => [employee.id, employee]))
  const siteIds = [...new Set(employeeRows.flatMap((employee) => employee.siteId == null ? [] : [employee.siteId]))]

  if (!siteIds.length) {
    return { success: false as const, error: "Site karyawan Labour Cost belum terisi di Employee Data." }
  }

  const periods = [...new Set(requested.flatMap((item) => getPeriodsInDateRange(item.startDate, item.endDate)))]
  const earliestDate = requested.reduce((value, item) => item.startDate < value ? item.startDate : value, requested[0].startDate)
  const latestDate = requested.reduce((value, item) => item.endDate > value ? item.endDate : value, requested[0].endDate)
  const earliestAt = new Date(`${earliestDate}T00:00:00.000Z`)
  const latestAt = new Date(`${latestDate}T23:59:59.999Z`)

  const [v2Plans, v1Plans, fieldBreakPlans, attendanceOverrides, realAttendanceRecords, schedulingConfigs] = await Promise.all([
    db
      .select({
        siteId: timesheetSchedulingPlansV2.siteId,
        period: timesheetSchedulingPlansV2.period,
        activeSchedule: timesheetSchedulingPlansV2.activeSchedule,
      })
      .from(timesheetSchedulingPlansV2)
      .where(and(
        eq(timesheetSchedulingPlansV2.status, "active"),
        inArray(timesheetSchedulingPlansV2.siteId, siteIds),
        inArray(timesheetSchedulingPlansV2.period, periods)
      )),
    db
      .select({
        siteId: timesheetSchedulingPlans.siteId,
        period: timesheetSchedulingPlans.period,
        fixedSchedule: timesheetSchedulingPlans.fixedSchedule,
      })
      .from(timesheetSchedulingPlans)
      .where(and(
        inArray(timesheetSchedulingPlans.siteId, siteIds),
        inArray(timesheetSchedulingPlans.period, periods)
      )),
    db
      .select({
        siteId: timesheetFieldBreakPlans.siteId,
        employeeId: timesheetFieldBreakPlans.employeeId,
        fieldBreakDate: timesheetFieldBreakPlans.fieldBreakDate,
        fieldBreakEndDate: timesheetFieldBreakPlans.fieldBreakEndDate,
      })
      .from(timesheetFieldBreakPlans)
      .where(and(
        inArray(timesheetFieldBreakPlans.siteId, siteIds),
        inArray(timesheetFieldBreakPlans.employeeId, employeeIds),
        lte(timesheetFieldBreakPlans.fieldBreakDate, latestDate),
        or(
          gte(timesheetFieldBreakPlans.fieldBreakEndDate, earliestDate),
          and(
            isNull(timesheetFieldBreakPlans.fieldBreakEndDate),
            gte(timesheetFieldBreakPlans.fieldBreakDate, earliestDate)
          )
        )
      )),
    db
      .select({
        siteId: timesheetAttendanceRealOverrides.siteId,
        period: timesheetAttendanceRealOverrides.period,
        employeeId: timesheetAttendanceRealOverrides.employeeId,
        day: timesheetAttendanceRealOverrides.day,
        status: timesheetAttendanceRealOverrides.status,
      })
      .from(timesheetAttendanceRealOverrides)
      .where(and(
        inArray(timesheetAttendanceRealOverrides.siteId, siteIds),
        inArray(timesheetAttendanceRealOverrides.employeeId, employeeIds),
        inArray(timesheetAttendanceRealOverrides.period, periods)
      )),
    db
      .select({
        siteId: attendanceRecords.siteId,
        employeeId: attendanceRecords.employeeId,
        eventTime: attendanceRecords.eventTime,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .where(and(
        inArray(attendanceRecords.siteId, siteIds),
        inArray(attendanceRecords.employeeId, employeeIds),
        gte(attendanceRecords.eventTime, earliestAt),
        lte(attendanceRecords.eventTime, latestAt)
      )),
    db
      .select({
        siteId: timesheetSchedulingConfigs.siteId,
        fieldBreakConfig: timesheetSchedulingConfigs.fieldBreakConfig,
      })
      .from(timesheetSchedulingConfigs)
      .where(inArray(timesheetSchedulingConfigs.siteId, siteIds)),
  ])

  const activeSchedules = new Map(
    v2Plans.map((plan) => [`${plan.siteId}:${plan.period}`, plan.activeSchedule as SchedulingRow[]])
  )
  const legacySchedules = new Map(
    v1Plans.map((plan) => [`${plan.siteId}:${plan.period}`, plan.fixedSchedule as SchedulingRow[]])
  )
  const attendanceOverridesByDay = new Map(
    attendanceOverrides.map((item) => [
      `${item.employeeId}:${item.period}-${String(item.day).padStart(2, "0")}`,
      item.status,
    ])
  )
  const attendanceRecordDates = new Set(
    realAttendanceRecords
      .filter((record) => normalizeAttendanceStatus(record.status) === "present")
      .map((record) => `${record.employeeId}:${record.eventTime.toISOString().slice(0, 10)}`)
  )
  const quotationBillingConfigBySite = new Map(
    schedulingConfigs.map((config) => {
      const fieldBreakConfig =
        config.fieldBreakConfig && typeof config.fieldBreakConfig === "object"
          ? config.fieldBreakConfig as Record<string, unknown>
          : {}
      return [
        config.siteId,
        normalizeQuotationBillingStatusConfig(fieldBreakConfig.quotationBillingConfig),
      ] as const
    })
  )

  const syncedItems = requested.map((item) => {
    const employee = employeesById.get(item.employeeId)
    if (!employee) {
      return { rowId: item.rowId, ranges: [], fieldBreakDays: 0, remove: true, error: null }
    }
    if (!employee?.siteId) {
      return { rowId: item.rowId, ranges: [], fieldBreakDays: 0, remove: false, error: "Site karyawan belum terisi." }
    }
    const quotationBillingConfig = quotationBillingConfigBySite.get(employee.siteId)
      ?? DEFAULT_QUOTATION_BILLING_STATUS_CONFIG

    const fieldBreakDates = new Set<string>()
    const rosterOffDates = new Set<string>()
    for (const period of getPeriodsInDateRange(item.startDate, item.endDate)) {
      const rows = activeSchedules.get(`${employee.siteId}:${period}`)
        ?? legacySchedules.get(`${employee.siteId}:${period}`)
        ?? []
      const row = rows.find((candidate) => candidate.employeeId === item.employeeId)
      row?.schedule.forEach((code, index) => {
        const date = `${period}-${String(index + 1).padStart(2, "0")}`
        const normalizedCode = code.trim().toUpperCase()
        if (normalizedCode === "FB") fieldBreakDates.add(date)
        if (normalizedCode === "OFF" || normalizedCode === "LIBUR") rosterOffDates.add(date)
      })
    }

    fieldBreakPlans
      .filter((plan) => plan.siteId === employee.siteId && plan.employeeId === item.employeeId && plan.fieldBreakDate)
      .forEach((plan) => {
        for (const date of getIsoDatesInRange(
          plan.fieldBreakDate!,
          plan.fieldBreakEndDate || plan.fieldBreakDate!
        )) {
          if (date >= item.startDate && date <= item.endDate) fieldBreakDates.add(date)
        }
      })

    const billableDates = getIsoDatesInRange(item.startDate, item.endDate).filter((date) => {
      if (fieldBreakDates.has(date)) return false
      if (rosterOffDates.has(date)) return true
      const overrideKey = `${item.employeeId}:${date}`
      if (attendanceOverridesByDay.has(overrideKey)) {
        return isQuotationAttendanceStatusBillable(
          normalizeAttendanceStatus(attendanceOverridesByDay.get(overrideKey)) as any,
          quotationBillingConfig
        )
      }
      if (attendanceRecordDates.has(overrideKey)) return true
      return quotationBillingConfig.countEmpty
    })

    return {
      rowId: item.rowId,
      ranges: buildContiguousQuotationRanges(billableDates),
      fieldBreakDays: [...fieldBreakDates].filter((date) => date >= item.startDate && date <= item.endDate).length,
      remove: false,
      error: null,
    }
  })

  return { success: true as const, items: syncedItems }
}

export async function createItem(data: { name: string; category: string; price: string; siteId?: number | null; jobTitle?: string | null }) {
  const result = await db.insert(service360Items).values({
    name: data.name,
    category: data.category,
    price: data.price,
    siteId: data.siteId,
    jobTitle: data.jobTitle,
  }).returning()
  revalidatePath("/dashboard/360-service/items")
  return result[0]
}

export async function updateItem(id: number, data: { name: string; category: string; price: string; siteId?: number | null; jobTitle?: string | null }) {
  if (id >= 1000000) return null // Prevent editing virtual items
  
  const result = await db.update(service360Items).set({
    name: data.name,
    category: data.category,
    price: data.price,
    siteId: data.siteId,
    jobTitle: data.jobTitle,
    updatedAt: new Date()
  }).where(eq(service360Items.id, id)).returning()
  
  revalidatePath("/dashboard/360-service/items")
  return result[0]
}

export async function deleteItem(id: number) {
  if (id >= 1000000) return
  await db.delete(service360Items).where(eq(service360Items.id, id))
  revalidatePath("/dashboard/360-service/items")
}

export async function duplicateItem(id: number) {
  if (id >= 1000000) return null // Prevent duplicating virtual items directly

  const sourceItem = await db.select().from(service360Items).where(eq(service360Items.id, id)).limit(1)
  if (sourceItem.length === 0) return null

  const item = sourceItem[0]
  const result = await db.insert(service360Items).values({
    name: `${item.name} (Copy)`,
    category: item.category,
    price: item.price,
    siteId: item.siteId,
    jobTitle: item.jobTitle
  }).returning()

  revalidatePath("/dashboard/360-service/items")
  return result[0]
}

// Basic import function for items
export async function importItems(items: { category: string; name: string; price: string; siteId?: number }[]) {
  if (items.length === 0) return { success: true, count: 0 }
  await db.insert(service360Items).values(items)
  revalidatePath("/dashboard/360-service/items")
  return { success: true, count: items.length }
}

export async function getQuotations() {
  return db
    .select({
      quotation: service360Quotations,
      customer: service360Customers,
    })
    .from(service360Quotations)
    .leftJoin(service360Customers, eq(service360Quotations.customerId, service360Customers.id))
    .orderBy(desc(service360Quotations.createdAt))
}

export async function getQuotationById(id: number) {
  const [quotation] = await db
    .select()
    .from(service360Quotations)
    .where(eq(service360Quotations.id, id))
    .limit(1)

  if (!quotation) return null

  const customer = await db
    .select()
    .from(service360Customers)
    .where(eq(service360Customers.id, quotation.customerId))
    .limit(1)

  const items = await db
    .select({
      quotationItem: service360QuotationItems,
      item: service360Items,
    })
    .from(service360QuotationItems)
    .leftJoin(service360Items, eq(service360QuotationItems.itemId, service360Items.id))
    .where(eq(service360QuotationItems.quotationId, id))
    .orderBy(asc(service360QuotationItems.id))

  return {
    ...quotation,
    customer: customer[0],
    items: items,
  }
}

export async function getLatestSignatureByFromName(fromName: string) {
  if (!fromName) return null;

  const [quotation] = await db
    .select({ fromSignatureUrl: service360Quotations.fromSignatureUrl })
    .from(service360Quotations)
    .where(and(
      eq(service360Quotations.fromName, fromName),
      isNotNull(service360Quotations.fromSignatureUrl)
    ))
    .orderBy(desc(service360Quotations.createdAt))
    .limit(1);

  if (quotation && quotation.fromSignatureUrl) {
    const { resolveUploadUrl } = await import('@/lib/s3-storage');
    const readableUrl = resolveUploadUrl(quotation.fromSignatureUrl);
    return {
      signatureUrl: quotation.fromSignatureUrl,
      readableUrl
    };
  }

  return null;
}

export async function createQuotation(data: any) {
  const { 
    quotationNumber, customerId, quotationDate, taxRate, taxAmount, subTotal, totalAmount, status, 
    items, attn, cc, fromName, fromSignatureUrl, subject, poNumber, projectName, poPeriod, showLevel, notes, showIntro, customIntro, showQty, hideBackupPrice, hideBackupDate, hideMonthColumn, discountType, discountValue, showDays, includeBast, includeRoster
  } = data
  
  const [quotation] = await db.insert(service360Quotations).values({
    quotationNumber,
    customerId,
    quotationDate,
    attn,
    cc,
    fromName,
    fromSignatureUrl,
    subject,
    poNumber,
    projectName,
    poPeriod,
    taxRate,
    taxAmount,
    subTotal,
    totalAmount,
    status,
    showLevel: showLevel ?? true,
    showQty: showQty ?? false,
    notes,
    showIntro: showIntro ?? true,
    customIntro,
    hideBackupPrice: hideBackupPrice ?? false,
    hideBackupDate: hideBackupDate ?? false,
    hideMonthColumn: hideMonthColumn ?? false,
    discountType: discountType || null,
    discountValue: discountType ? discountValue ?? 0 : 0,
    showDays: showDays ?? true,
    includeBast: includeBast ?? false,
    includeRoster: includeRoster ?? false,
  }).returning()

  if (items && items.length > 0) {
    const quotationItems = items.map((item: any) => ({
      quotationId: quotation.id,
      itemId: (item.itemId && item.itemId > 1000000) ? null : item.itemId, // Ignore virtual IDs for FK
      monthPeriod: item.monthPeriod,
      level: item.level,
      customDescription: item.customDescription,
      quantity: item.quantity.toString(),
      price: item.price.toString(),
      subtotal: item.subtotal.toString(),
      isBackup: item.isBackup || false,
      backupStartDate: item.backupStartDate || null,
      backupEndDate: item.backupEndDate || null,
      backupMonthPeriod: item.backupMonthPeriod || null,
      backupLevel: item.backupLevel || null,
      backupDescription: item.backupDescription || null,
      backupPrice: (item.backupPrice !== undefined && item.backupPrice !== null) ? item.backupPrice.toString() : "0",
    }))
    await db.insert(service360QuotationItems).values(quotationItems)
  }

  // Save history
  await saveFormHistory(customerId, { attn, cc, fromName, subject })

  revalidatePath("/dashboard/360-service/quotations")
  return quotation
}

export async function updateQuotation(id: number, data: any) {
  const { 
    quotationNumber, customerId, quotationDate, taxRate, taxAmount, subTotal, totalAmount, status, 
    items, attn, cc, fromName, fromSignatureUrl, subject, poNumber, projectName, poPeriod, showLevel, notes, showIntro, customIntro, showQty, hideBackupPrice, hideBackupDate, hideMonthColumn, discountType, discountValue, showDays, includeBast, includeRoster
  } = data
  
  const [quotation] = await db.update(service360Quotations).set({
    quotationNumber,
    customerId,
    quotationDate,
    attn,
    cc,
    fromName,
    fromSignatureUrl,
    subject,
    poNumber,
    projectName,
    poPeriod,
    taxRate,
    taxAmount,
    subTotal,
    totalAmount,
    status,
    showLevel: showLevel ?? true,
    showQty: showQty ?? false,
    notes,
    showIntro: showIntro ?? true,
    customIntro,
    hideBackupPrice: hideBackupPrice ?? false,
    hideBackupDate: hideBackupDate ?? false,
    hideMonthColumn: hideMonthColumn ?? false,
    discountType: discountType || null,
    discountValue: discountType ? discountValue ?? 0 : 0,
    showDays: showDays ?? true,
    includeBast: includeBast ?? false,
    includeRoster: includeRoster ?? false,
    updatedAt: new Date()
  }).where(eq(service360Quotations.id, id)).returning()

  // Re-create items
  await db.delete(service360QuotationItems).where(eq(service360QuotationItems.quotationId, id))

  if (items && items.length > 0) {
    const quotationItems = items.map((item: any) => ({
      quotationId: quotation.id,
      itemId: (item.itemId && item.itemId > 1000000) ? null : item.itemId,
      monthPeriod: item.monthPeriod,
      level: item.level,
      customDescription: item.customDescription,
      quantity: item.quantity.toString(),
      price: item.price.toString(),
      subtotal: item.subtotal.toString(),
      isBackup: item.isBackup ?? false,
      backupStartDate: item.backupStartDate || null,
      backupEndDate: item.backupEndDate || null,
      backupMonthPeriod: item.backupMonthPeriod,
      backupLevel: item.backupLevel,
      backupDescription: item.backupDescription,
      backupPrice: (item.backupPrice !== undefined && item.backupPrice !== null) ? item.backupPrice.toString() : "0",
    }))
    
    await db.insert(service360QuotationItems).values(quotationItems)
  }

  // Save history
  await saveFormHistory(customerId, { attn, cc, fromName, subject })

  revalidatePath("/dashboard/360-service/quotations")
  revalidatePath(`/dashboard/360-service/quotations/${id}`)
  return quotation
}

export async function toggleQuotationOption(id: number, options: { includeRoster?: boolean; includeBast?: boolean }) {
  const updateData: any = { updatedAt: new Date() }
  if (options.includeRoster !== undefined) updateData.includeRoster = options.includeRoster
  if (options.includeBast !== undefined) updateData.includeBast = options.includeBast

  await db.update(service360Quotations).set(updateData).where(eq(service360Quotations.id, id))

  revalidatePath(`/dashboard/360-service/quotations/${id}`)
  revalidatePath("/dashboard/360-service/quotations")
  return { success: true }
}

export async function deleteQuotation(id: number) {
  await db.delete(service360Quotations).where(eq(service360Quotations.id, id))
  revalidatePath("/dashboard/360-service/quotations")
}

export async function getEmployeeLabours() {
  const allEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      section: employees.section,
      jobTitle: employees.jobTitle,
      siteName: sites.name,
      siteId: sites.id,
      level: service360EmployeeLevels.level,
      price: service360RateSettings.price
    })
    .from(employees)
    .where(and(eq(employees.department, "Central Services"), eq(employees.isActive, true)))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .leftJoin(service360EmployeeLevels, eq(employees.id, service360EmployeeLevels.employeeId))
    .leftJoin(
      service360RateSettings, 
      and(
        eq(employees.workLocation, service360RateSettings.workLocation),
        eq(employees.section, service360RateSettings.section),
        eq(sql`COALESCE(${service360EmployeeLevels.level}, '1')`, service360RateSettings.level)
      )
    )
    
  return allEmployees.map(emp => ({
    ...emp,
    level: emp.level || "1", // Default level "1"
    price: emp.price || "0"
  }))
}

export async function updateEmployeeLevel(employeeId: number, level: string) {
  await db
    .insert(service360EmployeeLevels)
    .values({
      employeeId,
      level
    })
    .onConflictDoUpdate({
      target: service360EmployeeLevels.employeeId,
      set: {
        level,
        updatedAt: new Date()
      }
    })
  revalidatePath("/dashboard/360-service/items")
}

export async function getRateSettings() {
  const settings = await db
    .select({
      id: service360RateSettings.id,
      workLocation: service360RateSettings.workLocation,
      section: service360RateSettings.section,
      level: service360RateSettings.level,
      price: service360RateSettings.price
    })
    .from(service360RateSettings)
    .orderBy(service360RateSettings.workLocation, service360RateSettings.section, service360RateSettings.level)
  return settings
}

export async function getCentralServiceSections() {
  const depts = await db.select().from(masterDepartments).where(eq(masterDepartments.name, 'Central Services'))
  if (!depts.length) return []
  const secs = await db.select().from(masterSections).where(eq(masterSections.departmentId, depts[0].id))
  return secs.map(s => s.name).sort()
}

export async function updateRateSetting(workLocation: string, section: string, level: string, price: number) {
  await db
    .insert(service360RateSettings)
    .values({
      workLocation,
      section,
      level,
      price: price.toString()
    })
    .onConflictDoUpdate({
      target: [service360RateSettings.workLocation, service360RateSettings.section, service360RateSettings.level],
      set: {
        price: price.toString(),
        updatedAt: new Date()
      }
    })
  revalidatePath("/dashboard/360-service/items")
}

export async function updateRateSettingsGroupComplete(
  oldLoc: string,
  oldSec: string,
  newLoc: string,
  newSec: string,
  prices: { level0: string, level1: string, level2: string, level3: string }
) {
  // If the location/section changed, move all existing levels (including custom ones) to the new loc/sec
  if (oldLoc !== newLoc || oldSec !== newSec) {
    const existing = await db.select().from(service360RateSettings).where(
      and(
        eq(service360RateSettings.workLocation, oldLoc),
        eq(service360RateSettings.section, oldSec)
      )
    )
    for (const setting of existing) {
      await db.insert(service360RateSettings).values({
        workLocation: newLoc,
        section: newSec,
        level: setting.level,
        price: setting.price
      }).onConflictDoNothing()
    }
    await db.delete(service360RateSettings).where(
      and(
        eq(service360RateSettings.workLocation, oldLoc),
        eq(service360RateSettings.section, oldSec)
      )
    )
  }

  // Insert or update the new values for level 0, 1, 2, 3
  const levelsToUpdate = [
    { level: "0", price: prices.level0 },
    { level: "1", price: prices.level1 },
    { level: "2", price: prices.level2 },
    { level: "3", price: prices.level3 }
  ]

  for (const item of levelsToUpdate) {
    if (!item.price) continue // skip empty prices
    
    await db
      .insert(service360RateSettings)
      .values({
        workLocation: newLoc,
        section: newSec,
        level: item.level,
        price: item.price
      })
      .onConflictDoUpdate({
        target: [service360RateSettings.workLocation, service360RateSettings.section, service360RateSettings.level],
        set: {
          price: item.price,
          updatedAt: new Date()
        }
      })
  }

  revalidatePath("/dashboard/360-service/items")
}

export async function deleteRateSettingsGroup(workLocation: string, section: string) {
  await db.delete(service360RateSettings).where(
    and(
      eq(service360RateSettings.workLocation, workLocation),
      eq(service360RateSettings.section, section)
    )
  )
  revalidatePath("/dashboard/360-service/items")
}

export async function duplicateRateSettingsGroup(
  sourceWorkLocation: string, 
  sourceSection: string, 
  targetWorkLocation: string, 
  targetSection: string
) {
  const sourceSettings = await db
    .select()
    .from(service360RateSettings)
    .where(
      and(
        eq(service360RateSettings.workLocation, sourceWorkLocation),
        eq(service360RateSettings.section, sourceSection)
      )
    )

  if (sourceSettings.length === 0) return

  for (const setting of sourceSettings) {
    await db
      .insert(service360RateSettings)
      .values({
        workLocation: targetWorkLocation,
        section: targetSection,
        level: setting.level,
        price: setting.price
      })
      .onConflictDoUpdate({
        target: [service360RateSettings.workLocation, service360RateSettings.section, service360RateSettings.level],
        set: {
          price: setting.price,
          updatedAt: new Date()
        }
      })
  }

  revalidatePath("/dashboard/360-service/items")
}

export async function updateQuotationStatus(id: number, status: string) {
  await db.update(service360Quotations).set({ status, updatedAt: new Date() }).where(eq(service360Quotations.id, id))
  revalidatePath('/dashboard/360-service/quotations')
}

export async function updateQuotationPoNumber(id: number, poNumber: string) {
  await db.update(service360Quotations).set({ poNumber, updatedAt: new Date() }).where(eq(service360Quotations.id, id))
  revalidatePath('/dashboard/360-service/quotations')
}

export async function uploadQuotationPoFile(id: number, fileUrl: string) {
  await db.update(service360Quotations).set({ 
    poFileUrl: fileUrl, 
    status: 'PO Release',
    updatedAt: new Date() 
  }).where(eq(service360Quotations.id, id))
  revalidatePath('/dashboard/360-service/quotations')
}
