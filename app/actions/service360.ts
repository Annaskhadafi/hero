"use server"

import { db } from "@/db"
import {
  service360Customers,
  service360Items,
  service360Quotations,
  service360QuotationItems,
  service360EmployeeLevels,
  service360RateSettings
} from "@/db/schema/service360"
import { employees, sites, masterDepartments, masterSections } from "@/db/schema/hero"
import { eq, desc, and, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function getCustomers() {
  return db.select().from(service360Customers).orderBy(desc(service360Customers.createdAt))
}

const ROMAN_NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

export async function generateNextQuotationNumber() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // Get count of total quotations to create sequence
  const allQuotations = await db.select().from(service360Quotations)
  const nextSeq = allQuotations.length + 1
  
  const paddedSeq = nextSeq.toString().padStart(3, '0')
  const romanMonth = ROMAN_NUMERALS[currentMonth]
  const shortYear = currentYear.toString().slice(-2)
  
  // Format: 001/QUO-360/VII/26/AP
  return `${paddedSeq}/QUO-360/${romanMonth}/${shortYear}/AP`
}

export async function createCustomer(data: { customerName: string }) {
  const result = await db.insert(service360Customers).values(data).returning()
  revalidatePath("/dashboard/360-service/customers")
  return result[0]
}

export async function deleteCustomer(id: number) {
  await db.delete(service360Customers).where(eq(service360Customers.id, id))
  revalidatePath("/dashboard/360-service/customers")
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

  return {
    ...quotation,
    customer: customer[0],
    items: items,
  }
}

export async function createQuotation(data: any) {
  const { 
    quotationNumber, customerId, quotationDate, taxRate, taxAmount, subTotal, totalAmount, status, 
    items, attn, cc, fromName, subject, poNumber, projectName, poPeriod 
  } = data
  
  const [quotation] = await db.insert(service360Quotations).values({
    quotationNumber,
    customerId,
    quotationDate,
    attn,
    cc,
    fromName,
    subject,
    poNumber,
    projectName,
    poPeriod,
    taxRate,
    taxAmount,
    subTotal,
    totalAmount,
    status,
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
      backupPrice: item.backupPrice ? item.backupPrice.toString() : "0",
    }))
    await db.insert(service360QuotationItems).values(quotationItems)
  }

  revalidatePath("/dashboard/360-service/quotations")
  return quotation
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
      siteName: employees.workLocation, // Reusing siteName field on the frontend for workLocation
      siteId: sites.id,
      level: service360EmployeeLevels.level,
      price: service360RateSettings.price
    })
    .from(employees)
    .where(eq(employees.department, "Central Services"))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .leftJoin(service360EmployeeLevels, eq(employees.id, service360EmployeeLevels.employeeId))
    .leftJoin(
      service360RateSettings, 
      and(
        eq(employees.workLocation, service360RateSettings.workLocation),
        eq(employees.section, service360RateSettings.section),
        eq(sql`COALESCE(${service360EmployeeLevels.level}, 1)`, service360RateSettings.level)
      )
    )
    
  return allEmployees.map(emp => ({
    ...emp,
    level: emp.level || 1, // Default level 1
    price: emp.price || "0"
  }))
}

export async function updateEmployeeLevel(employeeId: number, level: number) {
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

export async function updateRateSetting(workLocation: string, section: string, level: number, price: number) {
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
  prices: { level1: string, level2: string, level3: string }
) {
  // First, delete the old ones if the location/section changed
  if (oldLoc !== newLoc || oldSec !== newSec) {
    await db.delete(service360RateSettings).where(
      and(
        eq(service360RateSettings.workLocation, oldLoc),
        eq(service360RateSettings.section, oldSec)
      )
    )
  }

  // Insert or update the new values for level 1, 2, 3
  const levelsToUpdate = [
    { level: 1, price: prices.level1 },
    { level: 2, price: prices.level2 },
    { level: 3, price: prices.level3 }
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
