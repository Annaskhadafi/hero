"use server"

import { and, eq, gte, lte, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import {
  attendanceRecords,
  employees as heroEmployees,
  sites,
  safetyCertifications,
  safetyIncidentReports,
  safetyIncidentSummaryMonthly,
  safetyIncidentSummaryYearly,
  safetyInspections,
  safetyManHours,
  safetyMonthlyManHours,
  safetyPerformanceMetrics,
  safetyWeeklyActivities,
} from "@/db/schema/hero"
import { heroSafetyInductions } from "@/db/schema/safety-induction"
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission } from "@/lib/hero-access"
import { buildHseSafetyEmail, sendHseSafetyEmail } from "@/lib/hse-safety-email"

type MutationState = { ok: boolean; message: string }

async function requireSafetyPermission(action: "create" | "edit" | "delete") {
  const perm = await getCurrentMenuPermission("safety")
  const role = (await getCurrentEmployeeAccessRole())?.toLowerCase() ?? ""
  const roleAllowed = !role || ["super admin", "safety officer", "site admin", "admin", "hse", "safety", "user", "manager", "staff"].some((allowed) => role.includes(allowed))

  if (action === "delete" && !perm.canDelete && !roleAllowed) {
    throw new Error("Anda tidak memiliki izin (permission) untuk menghapus data Safety.")
  }
  if ((action === "edit" || action === "create") && !perm.canEdit && !roleAllowed) {
    throw new Error("Anda tidak memiliki izin (permission) untuk mengedit/menambah data Safety.")
  }
}

function readString(formData: FormData, key: string) {
  return `${formData.get(key) ?? ""}`.trim()
}

function requireString(formData: FormData, key: string, label: string) {
  const value = readString(formData, key)
  if (!value) {
    throw new Error(`${label} wajib diisi.`)
  }
  return value
}

function readDateValue(formData: FormData, key: string) {
  const value = readString(formData, key)
  return value || null
}

function readNumberString(formData: FormData, key: string) {
  const value = readString(formData, key).replace(/,/g, "")
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed}` : "0"
}

function readId(formData: FormData) {
  const id = Number(formData.get("id"))
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID data tidak valid.")
  }
  return id
}

function success(message: string): MutationState {
  revalidatePath("/dashboard/safety")
  revalidatePath("/dashboard/safety/data")
  return { ok: true, message }
}

function failure(error: unknown): MutationState {
  return { ok: false, message: error instanceof Error ? error.message : "Safety data gagal diproses." }
}

export async function manageSafetyIncidentSummaryYearlyAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    if (intent === "delete") {
      await db.delete(safetyIncidentSummaryYearly).where(eq(safetyIncidentSummaryYearly.id, readId(formData)))
      return success("Rekap incident tahunan dihapus.")
    }

    const values = {
      year: Number(readNumberString(formData, "year")) || new Date().getFullYear(),
      fatality: Number(readNumberString(formData, "fatality")),
      lostDayInjury: Number(readNumberString(formData, "lostDayInjury")),
      restrictedWorkDayInjury: Number(readNumberString(formData, "restrictedWorkDayInjury")),
      medicalTreatmentCase: Number(readNumberString(formData, "medicalTreatmentCase")),
      firstAid: Number(readNumberString(formData, "firstAid")),
      propertyDamage: Number(readNumberString(formData, "propertyDamage")),
      nearMissReport: Number(readNumberString(formData, "nearMissReport")),
      environmental: Number(readNumberString(formData, "environmental")),
      fatigue: Number(readNumberString(formData, "fatigue")),
      totalEvents: Number(readNumberString(formData, "totalEvents")),
      updatedAt: new Date(),
    }

    if (intent === "update") {
      await db.update(safetyIncidentSummaryYearly).set(values).where(eq(safetyIncidentSummaryYearly.id, readId(formData)))
      return success("Rekap incident tahunan diperbarui.")
    }

    await db.insert(safetyIncidentSummaryYearly).values({ ...values, sourceSheet: "manual" })
    return success("Rekap incident tahunan ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function manageSafetyIncidentSummaryMonthlyAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    if (intent === "delete") {
      await db.delete(safetyIncidentSummaryMonthly).where(eq(safetyIncidentSummaryMonthly.id, readId(formData)))
      return success("Rekap incident bulanan dihapus.")
    }

    const values = {
      month: requireString(formData, "month", "Bulan"),
      fatality: Number(readNumberString(formData, "fatality")),
      lostDayInjury: Number(readNumberString(formData, "lostDayInjury")),
      restrictedWorkDayInjury: Number(readNumberString(formData, "restrictedWorkDayInjury")),
      medicalTreatmentCase: Number(readNumberString(formData, "medicalTreatmentCase")),
      firstAid: Number(readNumberString(formData, "firstAid")),
      propertyDamage: Number(readNumberString(formData, "propertyDamage")),
      nearMissReport: Number(readNumberString(formData, "nearMissReport")),
      environmental: Number(readNumberString(formData, "environmental")),
      totalEvents: Number(readNumberString(formData, "totalEvents")),
      updatedAt: new Date(),
    }

    if (intent === "update") {
      await db.update(safetyIncidentSummaryMonthly).set(values).where(eq(safetyIncidentSummaryMonthly.id, readId(formData)))
      return success("Rekap incident bulanan diperbarui.")
    }

    await db.insert(safetyIncidentSummaryMonthly).values({ ...values, sourceSheet: "manual" })
    return success("Rekap incident bulanan ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function manageSafetyIncidentReportAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    if (intent === "delete") {
      await db.delete(safetyIncidentReports).where(eq(safetyIncidentReports.id, readId(formData)))
      return success("Incident report dihapus.")
    }

    const values = {
      workerName: readString(formData, "workerName"),
      department: readString(formData, "department"),
      incidentDescription: requireString(formData, "incidentDescription", "Deskripsi incident"),
      propertyDamage: readString(formData, "propertyDamage"),
      location: readString(formData, "location"),
      category: readString(formData, "category"),
      incidentDate: readDateValue(formData, "incidentDate"),
      notes: readString(formData, "notes"),
      status: readString(formData, "status") || "open",
      updatedAt: new Date(),
    }

    if (intent === "update") {
      await db.update(safetyIncidentReports).set(values).where(eq(safetyIncidentReports.id, readId(formData)))
      return success("Incident report diperbarui.")
    }

    await db.insert(safetyIncidentReports).values({ ...values, sourceSheet: "manual" })
    return success("Incident report ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function manageSafetyCertificationAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    if (intent === "delete") {
      await db.delete(safetyCertifications).where(eq(safetyCertifications.id, readId(formData)))
      return success("Sertifikasi dihapus.")
    }

    const values = {
      equipmentName: requireString(formData, "equipmentName", "Nama alat"),
      picDepartment: readString(formData, "picDepartment"),
      workArea: readString(formData, "workArea"),
      equipmentClassification: readString(formData, "equipmentClassification"),
      certifier: readString(formData, "certifier"),
      certificationDate: readDateValue(formData, "certificationDate"),
      nextCertificationDate: readDateValue(formData, "nextCertificationDate"),
      status: readString(formData, "status") || "UNKNOWN",
      regulation: readString(formData, "regulation"),
      remarks: readString(formData, "remarks"),
      workLocation: readString(formData, "workLocation"),
      updatedAt: new Date(),
    }

    if (intent === "update") {
      await db.update(safetyCertifications).set(values).where(eq(safetyCertifications.id, readId(formData)))
      return success("Sertifikasi diperbarui.")
    }

    await db.insert(safetyCertifications).values({ ...values, sourceSheet: "manual" })
    return success("Sertifikasi ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function manageSafetyWeeklyActivityAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    if (intent === "delete") {
      await db.delete(safetyWeeklyActivities).where(eq(safetyWeeklyActivities.id, readId(formData)))
      return success("Aktivitas dihapus.")
    }

    const values = {
      activity: requireString(formData, "activity", "Kegiatan"),
      activityDate: readDateValue(formData, "activityDate"),
      pic: readString(formData, "pic"),
      category: readString(formData, "category"),
      imageUrl: readString(formData, "imageUrl"),
      evidenceUrl: readString(formData, "evidenceUrl"),
      updatedAt: new Date(),
    }

    if (intent === "update") {
      await db.update(safetyWeeklyActivities).set(values).where(eq(safetyWeeklyActivities.id, readId(formData)))
      return success("Aktivitas diperbarui.")
    }

    await db.insert(safetyWeeklyActivities).values({ ...values, sourceSheet: "manual" })
    return success("Aktivitas ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function manageSafetyPerformanceAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    if (intent === "delete") {
      await db.delete(safetyPerformanceMetrics).where(eq(safetyPerformanceMetrics.id, readId(formData)))
      return success("Performance metric dihapus.")
    }

    const values = {
      year: Number(readNumberString(formData, "year")) || new Date().getFullYear(),
      periodLabel: requireString(formData, "periodLabel", "Periode/site"),
      employeeCount: Number(readNumberString(formData, "employeeCount")),
      safeManHoursUpToYear: readNumberString(formData, "safeManHoursUpToYear"),
      fatalityThreshold: readNumberString(formData, "fatalityThreshold"),
      fatalityActual: readNumberString(formData, "fatalityActual"),
      ltiThreshold: readNumberString(formData, "ltiThreshold"),
      ltiActual: readNumberString(formData, "ltiActual"),
      propertyDamageThreshold: readNumberString(formData, "propertyDamageThreshold"),
      propertyDamageActual: readNumberString(formData, "propertyDamageActual"),
      updatedAt: new Date(),
    }

    if (intent === "update") {
      await db.update(safetyPerformanceMetrics).set(values).where(eq(safetyPerformanceMetrics.id, readId(formData)))
      return success("Performance metric diperbarui.")
    }

    await db.insert(safetyPerformanceMetrics).values({ ...values, sourceSheet: "manual" })
    return success("Performance metric ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function manageSafetyManHoursAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    await requireSafetyPermission(intent === "delete" ? "delete" : intent === "update" ? "edit" : "create")
    if (intent === "delete") {
      await db.delete(safetyManHours).where(eq(safetyManHours.id, readId(formData)))
      return success("Safety manhours dihapus.")
    }

    const values = {
      workLocation: requireString(formData, "workLocation", "Lokasi kerja"),
      employeeCount: Number(readNumberString(formData, "employeeCount")),
      safetyManHours: readNumberString(formData, "safetyManHours"),
      safeTarget: readNumberString(formData, "safeTarget"),
      averageWeeklyRevenue: readString(formData, "averageWeeklyRevenue") ? readNumberString(formData, "averageWeeklyRevenue") : null,
      updatedAt: new Date(),
    }

    if (intent === "update") {
      await db.update(safetyManHours).set(values).where(eq(safetyManHours.id, readId(formData)))
      return success("Safety manhours diperbarui.")
    }

    await db.insert(safetyManHours).values({ ...values, sourceSheet: "manual" })
    return success("Safety manhours ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function manageSafetyMonthlyManHoursAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    await requireSafetyPermission(intent === "delete" ? "delete" : intent === "update" ? "edit" : "create")
    if (intent === "delete") {
      await db.delete(safetyMonthlyManHours).where(eq(safetyMonthlyManHours.id, readId(formData)))
      return success("Monthly safety manhours dihapus.")
    }

    const workLocation = requireString(formData, "workLocation", "Lokasi kerja")
    let employeeCount = Number(readNumberString(formData, "employeeCount"))

    if (!employeeCount || employeeCount <= 0) {
      const activeEmps = await db
        .select({ id: heroEmployees.id, workLocation: heroEmployees.workLocation, siteName: sites.name })
        .from(heroEmployees)
        .leftJoin(sites, eq(sites.id, heroEmployees.siteId))
        .where(eq(heroEmployees.isActive, true))
      const matched = activeEmps.filter(
        (e) =>
          (e.workLocation && e.workLocation.toUpperCase() === workLocation.toUpperCase()) ||
          (e.siteName && e.siteName.toUpperCase() === workLocation.toUpperCase())
      )
      if (matched.length > 0) {
        employeeCount = matched.length
      }
    }

    const values = {
      workLocation,
      employeeCount,
      month: requireString(formData, "month", "Bulan"),
      safetyManHours: readNumberString(formData, "safetyManHours"),
      updatedAt: new Date(),
    }

    if (intent === "update") {
      await db.update(safetyMonthlyManHours).set(values).where(eq(safetyMonthlyManHours.id, readId(formData)))
      return success("Monthly safety manhours diperbarui.")
    }

    await db.insert(safetyMonthlyManHours).values({ ...values, sourceSheet: "manual" })
    return success("Monthly safety manhours ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function manageSafetyInspectionAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    if (intent === "delete") {
      await db.delete(safetyInspections).where(eq(safetyInspections.id, readId(formData)))
      return success("Inspeksi dihapus.")
    }

    const dateStr = readString(formData, "date")
    const values = {
      title: requireString(formData, "title", "Judul inspeksi"),
      date: dateStr ? new Date(dateStr) : new Date(),
      location: readString(formData, "location"),
      category: readString(formData, "category"),
      findings: readString(formData, "findings"),
      recommendation: readString(formData, "recommendation"),
      status: readString(formData, "status") || "Pending",
      assessmentScore: Number(readNumberString(formData, "assessmentScore")) || null,
      picName: readString(formData, "picName"),
      reportAttachmentUrl: readString(formData, "reportAttachmentUrl"),
      resultAttachmentUrl: readString(formData, "resultAttachmentUrl"),
      updatedAt: new Date(),
    }

    if (intent === "update") {
      const id = readId(formData)
      const [previous] = await db.select().from(safetyInspections).where(eq(safetyInspections.id, id)).limit(1)
      const [updated] = await db
        .update(safetyInspections)
        .set(values)
        .where(eq(safetyInspections.id, id))
        .returning()

      if (previous && previous.status !== updated.status) {
        const emailContent = buildHseSafetyEmail({
          title: "Update status safety inspection",
          intro: "Status safety inspection berubah dari workspace safety data.",
          details: [
            `Judul: ${updated.title}`,
            `Lokasi: ${updated.location || "-"}`,
            `Status lama: ${previous.status || "-"}`,
            `Status baru: ${updated.status || "-"}`,
          ],
        })

        await sendHseSafetyEmail({
          templateCode: "hse_safety_inspection_status_update",
          templateName: "HSE Safety Inspection Status Update",
          variables: {
            title: updated.title,
            location: updated.location,
            previousStatus: previous.status,
            status: updated.status,
          },
          fallbackSubject: `Update inspection: ${updated.title}`,
          fallbackHtml: emailContent.html,
          fallbackText: emailContent.text,
        })
      }

      return success("Inspeksi diperbarui.")
    }

    const [created] = await db.insert(safetyInspections).values(values).returning()
    const emailContent = buildHseSafetyEmail({
      title: "Safety inspection baru",
      intro: "Safety inspection baru dibuat dari workspace safety data.",
      details: [
        `Judul: ${created.title}`,
        `Tanggal: ${created.date.toLocaleDateString("id-ID")}`,
        `Lokasi: ${created.location || "-"}`,
        `Status: ${created.status || "-"}`,
      ],
    })

    await sendHseSafetyEmail({
      templateCode: "hse_safety_inspection_created",
      templateName: "HSE Safety Inspection Created",
      variables: {
        title: created.title,
        inspectionDate: created.date,
        location: created.location,
        status: created.status,
      },
      fallbackSubject: `Safety inspection baru: ${created.title}`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    })

    return success("Inspeksi ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function manageSafetyInductionAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    if (intent === "delete") {
      const id = readString(formData, "id")
      if (!id) throw new Error("ID tidak valid.")
      await db.delete(heroSafetyInductions).where(eq(heroSafetyInductions.id, id))
      return success("Induksi dihapus.")
    }

    const values = {
      fullName: requireString(formData, "fullName", "Nama lengkap"),
      companyOrigin: readString(formData, "companyOrigin"),
      phoneNumber: readString(formData, "phoneNumber"),
      purpose: readString(formData, "purpose"),
      updatedAt: new Date(),
    }

    if (intent === "update") {
      const id = readString(formData, "id")
      if (!id) throw new Error("ID tidak valid.")
      await db.update(heroSafetyInductions).set(values).where(eq(heroSafetyInductions.id, id))
      return success("Induksi diperbarui.")
    }

    const [created] = await db.insert(heroSafetyInductions).values(values).returning()
    const emailContent = buildHseSafetyEmail({
      title: "Safety induction baru",
      intro: "Form safety induction baru dibuat dari workspace safety data.",
      details: [
        `Nama: ${created.fullName}`,
        `Instansi: ${created.companyOrigin || "-"}`,
        `Telepon: ${created.phoneNumber || "-"}`,
        `Tujuan: ${created.purpose || "-"}`,
      ],
    })

    await sendHseSafetyEmail({
      templateCode: "hse_safety_induction_submitted",
      templateName: "HSE Safety Induction Submitted",
      variables: {
        fullName: created.fullName,
        companyOrigin: created.companyOrigin,
        phoneNumber: created.phoneNumber,
        purpose: created.purpose,
      },
      fallbackSubject: `Safety induction baru: ${created.fullName}`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    })

    return success("Induksi ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function getAttendanceManHoursAction(
  workLocation: string,
  year: number,
  monthIndex: number
): Promise<{ ok: boolean; manHours: number; employeeCount: number; message: string }> {
  try {
    if (!workLocation) return { ok: false, manHours: 0, employeeCount: 0, message: "Lokasi kerja belum dipilih." }

    const [matchedSite] = await db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(sql`UPPER(${sites.name}) = UPPER(${workLocation}) OR UPPER(${sites.location}) = UPPER(${workLocation})`)
      .limit(1)

    const startDate = new Date(year, monthIndex, 1)
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59)

    let records: Array<{ employeeId: number; eventType: string; eventTime: Date }> = []

    if (matchedSite) {
      records = await db
        .select({
          employeeId: attendanceRecords.employeeId,
          eventType: attendanceRecords.eventType,
          eventTime: attendanceRecords.eventTime,
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.siteId, matchedSite.id),
            gte(attendanceRecords.eventTime, startDate),
            lte(attendanceRecords.eventTime, endDate)
          )
        )
    } else {
      records = await db
        .select({
          employeeId: attendanceRecords.employeeId,
          eventType: attendanceRecords.eventType,
          eventTime: attendanceRecords.eventTime,
        })
        .from(attendanceRecords)
        .where(and(gte(attendanceRecords.eventTime, startDate), lte(attendanceRecords.eventTime, endDate)))
    }

    const daysMap = new Map<string, { checkIns: Date[]; checkOuts: Date[] }>()
    const uniqueEmployees = new Set<number>()

    for (const r of records) {
      const d = new Date(r.eventTime)
      if (Number.isNaN(d.getTime())) continue
      uniqueEmployees.add(r.employeeId)
      const dateStr = d.toISOString().slice(0, 10)
      const key = `${r.employeeId}_${dateStr}`
      if (!daysMap.has(key)) {
        daysMap.set(key, { checkIns: [], checkOuts: [] })
      }
      const entry = daysMap.get(key)!
      const type = (r.eventType || "").toLowerCase()
      if (type.includes("in")) entry.checkIns.push(d)
      else if (type.includes("out")) entry.checkOuts.push(d)
    }

    let totalRealtimeHours = 0

    daysMap.forEach((entry) => {
      const sortedIns = entry.checkIns.sort((a, b) => a.getTime() - b.getTime())
      const sortedOuts = entry.checkOuts.sort((a, b) => b.getTime() - a.getTime())

      if (sortedIns.length > 0 && sortedOuts.length > 0 && sortedOuts[0].getTime() > sortedIns[0].getTime()) {
        const diffMs = sortedOuts[0].getTime() - sortedIns[0].getTime()
        const hours = diffMs / (1000 * 60 * 60)
        totalRealtimeHours += hours
      } else {
        totalRealtimeHours += 8
      }
    })

    const totalDays = daysMap.size
    const employeeCount = uniqueEmployees.size || 0
    const calculatedManHours = Math.round(totalRealtimeHours * 100) / 100

    return {
      ok: true,
      manHours: calculatedManHours,
      employeeCount,
      message: `Otomatis update by attendance (${totalDays} presensi realtime jam masuk & keluar)`,
    }
  } catch (error) {
    return { ok: false, manHours: 0, employeeCount: 0, message: error instanceof Error ? error.message : "Gagal menghitung presensi." }
  }
}

export async function saveBatchMonthlyManHoursAction(formData: FormData): Promise<MutationState> {
  try {
    await requireSafetyPermission("create")
    const workLocation = requireString(formData, "workLocation", "Lokasi kerja")
    const year = Number(readNumberString(formData, "year")) || new Date().getFullYear()
    const inputType = readString(formData, "inputType") || "manual"

    const activeEmps = await db
      .select({ id: heroEmployees.id, workLocation: heroEmployees.workLocation, siteName: sites.name })
      .from(heroEmployees)
      .leftJoin(sites, eq(sites.id, heroEmployees.siteId))
      .where(eq(heroEmployees.isActive, true))

    const siteEmps = activeEmps.filter(
      (e) =>
        (e.workLocation && e.workLocation.toUpperCase() === workLocation.toUpperCase()) ||
        (e.siteName && e.siteName.toUpperCase() === workLocation.toUpperCase())
    )
    const defaultEmpCount = siteEmps.length || 0

    const rawInitial = formData.get("initialManHours")
    const rawTarget = formData.get("safeTarget")

    if (rawInitial !== null || rawTarget !== null) {
      const initialVal = rawInitial !== null ? readNumberString(formData, "initialManHours") : undefined
      const targetVal = rawTarget !== null ? readNumberString(formData, "safeTarget") : undefined

      const [existingMh] = await db
        .select()
        .from(safetyManHours)
        .where(eq(safetyManHours.workLocation, workLocation))
        .limit(1)

      if (existingMh) {
        await db
          .update(safetyManHours)
          .set({
            ...(initialVal !== undefined ? { safetyManHours: initialVal } : {}),
            ...(targetVal !== undefined ? { safeTarget: targetVal } : {}),
            updatedAt: new Date(),
          })
          .where(eq(safetyManHours.id, existingMh.id))
      } else {
        await db.insert(safetyManHours).values({
          workLocation,
          employeeCount: defaultEmpCount,
          safetyManHours: initialVal || "0",
          safeTarget: targetVal || "0",
          updatedAt: new Date(),
        })
      }
    }

    if (inputType === "attendance") {
      const monthIdx = Number(formData.get("monthIndex") ?? 0)
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`
      const autoRes = await getAttendanceManHoursAction(workLocation, year, monthIdx)
      const manHoursVal = `${autoRes.manHours || 0}`
      const empCount = autoRes.employeeCount || defaultEmpCount

      const [existing] = await db
        .select()
        .from(safetyMonthlyManHours)
        .where(and(eq(safetyMonthlyManHours.workLocation, workLocation), eq(safetyMonthlyManHours.month, dateStr)))
        .limit(1)

      if (existing) {
        await db
          .update(safetyMonthlyManHours)
          .set({
            safetyManHours: manHoursVal,
            employeeCount: empCount,
            sourceSheet: "attendance",
            updatedAt: new Date(),
          })
          .where(eq(safetyMonthlyManHours.id, existing.id))
      } else {
        await db.insert(safetyMonthlyManHours).values({
          workLocation,
          month: dateStr,
          safetyManHours: manHoursVal,
          employeeCount: empCount,
          sourceSheet: "attendance",
          updatedAt: new Date(),
        })
      }
      return success("Monthly man hours otomatis dari attendance berhasil disimpan.")
    }

    const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "okt", "nov", "des"]
    let savedCount = 0

    for (let i = 0; i < 12; i++) {
      const key = monthKeys[i]
      const rawVal = readString(formData, key)
      if (rawVal === "" || rawVal === undefined) continue

      const manHoursVal = readNumberString(formData, key)
      const dateStr = `${year}-${String(i + 1).padStart(2, "0")}-01`

      const [existing] = await db
        .select()
        .from(safetyMonthlyManHours)
        .where(and(eq(safetyMonthlyManHours.workLocation, workLocation), eq(safetyMonthlyManHours.month, dateStr)))
        .limit(1)

      if (existing) {
        await db
          .update(safetyMonthlyManHours)
          .set({
            safetyManHours: manHoursVal,
            employeeCount: defaultEmpCount || existing.employeeCount,
            sourceSheet: "manual",
            updatedAt: new Date(),
          })
          .where(eq(safetyMonthlyManHours.id, existing.id))
      } else {
        await db.insert(safetyMonthlyManHours).values({
          workLocation,
          month: dateStr,
          safetyManHours: manHoursVal,
          employeeCount: defaultEmpCount,
          sourceSheet: "manual",
          updatedAt: new Date(),
        })
      }
      savedCount++
    }

    return success(`Berhasil menyimpan ${savedCount} data man hours bulanan (${year}).`)
  } catch (error) {
    return failure(error)
  }
}

export async function saveGlobalInitialManHoursAction(formData: FormData): Promise<MutationState> {
  try {
    await requireSafetyPermission("create")
    const globalInitialManHours = readNumberString(formData, "globalInitialManHours")
    const globalSafeTarget = readNumberString(formData, "globalSafeTarget")

    const GLOBAL_KEY = "__GLOBAL_START_DATA__"

    const [existing] = await db
      .select()
      .from(safetyManHours)
      .where(eq(safetyManHours.workLocation, GLOBAL_KEY))
      .limit(1)

    if (existing) {
      await db
        .update(safetyManHours)
        .set({
          safetyManHours: globalInitialManHours,
          safeTarget: globalSafeTarget,
          updatedAt: new Date(),
        })
        .where(eq(safetyManHours.id, existing.id))
    } else {
      await db.insert(safetyManHours).values({
        workLocation: GLOBAL_KEY,
        employeeCount: 0,
        safetyManHours: globalInitialManHours,
        safeTarget: globalSafeTarget,
        updatedAt: new Date(),
      })
    }

    return success("Start data jam kerja awal gabungan (s/d 2025) berhasil disimpan.")
  } catch (error) {
    return failure(error)
  }
}

export async function deleteAllSiteManHoursAction(formData: FormData): Promise<MutationState> {
  try {
    await requireSafetyPermission("delete")
    const workLocation = requireString(formData, "workLocation", "Lokasi site")
    const lowerLoc = workLocation.toLowerCase()

    // Delete all monthly man hours for this site (case-insensitive match)
    await db
      .delete(safetyMonthlyManHours)
      .where(sql`LOWER(${safetyMonthlyManHours.workLocation}) = ${lowerLoc}`)

    // Also delete the initial/target record from safetyManHours if exists
    await db
      .delete(safetyManHours)
      .where(sql`LOWER(${safetyManHours.workLocation}) = ${lowerLoc}`)

    // Also delete from master sites list if exists
    await db
      .delete(sites)
      .where(sql`LOWER(${sites.name}) = ${lowerLoc}`)

    revalidatePath("/dashboard/safety")
    revalidatePath("/dashboard/safety/data")
    return success(`Semua data man hours untuk lokasi "${workLocation}" berhasil dihapus.`)
  } catch (error) {
    return failure(error)
  }
}
