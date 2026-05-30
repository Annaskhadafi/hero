"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import {
  safetyCertifications,
  safetyIncidentReports,
  safetyIncidentSummaryMonthly,
  safetyIncidentSummaryYearly,
  safetyManHours,
  safetyMonthlyManHours,
  safetyPerformanceMetrics,
  safetyWeeklyActivities,
} from "@/db/schema/hero"

type MutationState = { ok: boolean; message: string }

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
    if (intent === "delete") {
      await db.delete(safetyMonthlyManHours).where(eq(safetyMonthlyManHours.id, readId(formData)))
      return success("Monthly safety manhours dihapus.")
    }

    const values = {
      workLocation: requireString(formData, "workLocation", "Lokasi kerja"),
      employeeCount: Number(readNumberString(formData, "employeeCount")),
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
