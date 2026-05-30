import { inArray } from "drizzle-orm"
import * as xlsx from "xlsx"

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
import { normalizeSafetyNumber, normalizeSafetyStatus, normalizeSafetyText, toDateOnly } from "@/lib/safety-dashboard/parsing"
import {
  SAFETY_WORKBOOK_SHEET_NAMES,
  SAFETY_WORKBOOK_SHEETS,
  type SafetyImportSheetSummary,
} from "@/lib/safety-dashboard/types"

type SheetRow = Record<string, unknown>


function getRows(workbook: xlsx.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found.`)
  }

  return xlsx.utils.sheet_to_json<SheetRow>(sheet, { defval: null, raw: false })
}

function intValue(value: unknown) {
  return Math.trunc(normalizeSafetyNumber(value) ?? 0)
}

function decimalText(value: unknown) {
  return `${normalizeSafetyNumber(value) ?? 0}`
}

async function deleteImportedWorkbookRows() {
  await db.delete(safetyIncidentSummaryYearly).where(inArray(safetyIncidentSummaryYearly.sourceSheet, SAFETY_WORKBOOK_SHEET_NAMES))
  await db.delete(safetyIncidentSummaryMonthly).where(inArray(safetyIncidentSummaryMonthly.sourceSheet, SAFETY_WORKBOOK_SHEET_NAMES))
  await db.delete(safetyIncidentReports).where(inArray(safetyIncidentReports.sourceSheet, SAFETY_WORKBOOK_SHEET_NAMES))
  await db.delete(safetyCertifications).where(inArray(safetyCertifications.sourceSheet, SAFETY_WORKBOOK_SHEET_NAMES))
  await db.delete(safetyPerformanceMetrics).where(inArray(safetyPerformanceMetrics.sourceSheet, SAFETY_WORKBOOK_SHEET_NAMES))
  await db.delete(safetyManHours).where(inArray(safetyManHours.sourceSheet, SAFETY_WORKBOOK_SHEET_NAMES))
  await db.delete(safetyMonthlyManHours).where(inArray(safetyMonthlyManHours.sourceSheet, SAFETY_WORKBOOK_SHEET_NAMES))
  await db.delete(safetyWeeklyActivities).where(inArray(safetyWeeklyActivities.sourceSheet, SAFETY_WORKBOOK_SHEET_NAMES))
}

function pushError(summary: SafetyImportSheetSummary, rowNumber: number, error: unknown) {
  summary.skipped += 1
  summary.errors.push(`row ${rowNumber}: ${error instanceof Error ? error.message : String(error)}`)
}

function makeSummary(sheet: string, read: number): SafetyImportSheetSummary {
  return { sheet, read, inserted: 0, skipped: 0, errors: [] }
}

async function importYearlyIncident(rows: SheetRow[]) {
  const sheet = SAFETY_WORKBOOK_SHEETS.yearlyIncident
  const summary = makeSummary(sheet, rows.length)
  const values = []

  for (const [index, row] of rows.entries()) {
    try {
      const year = intValue(row.TH)
      if (!year) {
        throw new Error("missing year")
      }

      values.push({
        year,
        fatality: intValue(row.FTL),
        lostDayInjury: intValue(row.LDI),
        restrictedWorkDayInjury: intValue(row.RWDI),
        medicalTreatmentCase: intValue(row.MTC),
        firstAid: intValue(row.FA),
        propertyDamage: intValue(row.PD),
        nearMissReport: intValue(row.NR),
        environmental: intValue(row.ENV),
        fatigue: intValue(row.FTG),
        totalEvents: intValue(row.EVENT),
        sourceSheet: sheet,
        sourceRowNumber: index + 2,
      })
    } catch (error) {
      pushError(summary, index + 2, error)
    }
  }

  if (values.length) {
    await db.insert(safetyIncidentSummaryYearly).values(values)
    summary.inserted = values.length
  }

  return summary
}

async function importMonthlyIncident(rows: SheetRow[]) {
  const sheet = SAFETY_WORKBOOK_SHEETS.monthlyIncident
  const summary = makeSummary(sheet, rows.length)
  const values = []

  for (const [index, row] of rows.entries()) {
    try {
      const month = toDateOnly(row.Month)
      if (!month) {
        throw new Error("missing month")
      }

      values.push({
        month,
        fatality: intValue(row.Fatality),
        lostDayInjury: intValue(row["Lost Day Injury"]),
        restrictedWorkDayInjury: intValue(row["Restricted Work Day Injury"]),
        medicalTreatmentCase: intValue(row["Medical Treatment Case"]),
        firstAid: intValue(row["First Aid"]),
        propertyDamage: intValue(row["Property Damage"]),
        nearMissReport: intValue(row["Near Miss Report"]),
        environmental: intValue(row.Environmental),
        totalEvents: intValue(row.TOTAL),
        sourceSheet: sheet,
        sourceRowNumber: index + 2,
      })
    } catch (error) {
      pushError(summary, index + 2, error)
    }
  }

  if (values.length) {
    await db.insert(safetyIncidentSummaryMonthly).values(values)
    summary.inserted = values.length
  }

  return summary
}

async function importIncidentReports(rows: SheetRow[]) {
  const sheet = SAFETY_WORKBOOK_SHEETS.incidentReports
  const summary = makeSummary(sheet, rows.length)
  const values = []

  for (const [index, row] of rows.entries()) {
    try {
      const description = normalizeSafetyText(row.Incident)
      if (!description) {
        throw new Error("missing incident description")
      }

      values.push({
        workerName: normalizeSafetyText(row.Nama),
        department: normalizeSafetyText(row.Departement),
        incidentDescription: description,
        propertyDamage: normalizeSafetyText(row["Property Damage"]),
        location: normalizeSafetyText(row.Lokasi),
        category: normalizeSafetyText(row.Category),
        incidentDate: toDateOnly(row.Tanggal),
        notes: normalizeSafetyText(row.Keterangan),
        status: "open",
        sourceSheet: sheet,
        sourceRowNumber: index + 2,
      })
    } catch (error) {
      pushError(summary, index + 2, error)
    }
  }

  if (values.length) {
    await db.insert(safetyIncidentReports).values(values)
    summary.inserted = values.length
  }

  return summary
}

async function importCertifications(rows: SheetRow[]) {
  const sheet = SAFETY_WORKBOOK_SHEETS.certifications
  const summary = makeSummary(sheet, rows.length)
  const values = []

  for (const [index, row] of rows.entries()) {
    try {
      const equipmentName = normalizeSafetyText(row["NAMA ALAT"])
      if (!equipmentName) {
        throw new Error("missing equipment name")
      }

      values.push({
        equipmentName,
        picDepartment: normalizeSafetyText(row["PIC DEPT/SEC"]),
        workArea: normalizeSafetyText(row["AREA KERJA"]),
        equipmentClassification: normalizeSafetyText(row["KLASIFIKASI ALAT"]),
        certifier: normalizeSafetyText(row["PJK3/SERTIFIKATOR"]),
        certificationDate: toDateOnly(row["WAKTU SERTIFIKASI"]),
        nextCertificationDate: toDateOnly(row["NEXT Sert."]),
        status: normalizeSafetyStatus(row.STATUS),
        regulation: normalizeSafetyText(row["UU/PERMEN/KEPMEN"]),
        remarks: normalizeSafetyText(row.KETERANGAN),
        workLocation: normalizeSafetyText(row["LOKASI KERJA"]),
        sourceSheet: sheet,
        sourceRowNumber: index + 2,
      })
    } catch (error) {
      pushError(summary, index + 2, error)
    }
  }

  if (values.length) {
    await db.insert(safetyCertifications).values(values)
    summary.inserted = values.length
  }

  return summary
}

async function importPerformance(rows: SheetRow[]) {
  const sheet = SAFETY_WORKBOOK_SHEETS.performance
  const summary = makeSummary(sheet, rows.length)
  const values = []

  for (const [index, row] of rows.entries()) {
    try {
      const periodLabel = normalizeSafetyText(row.Periode)
      if (!periodLabel) {
        throw new Error("missing period")
      }

      values.push({
        year: intValue(row.Tahun),
        periodLabel,
        employeeCount: intValue(row["Jumlah Karyawan"]),
        safeManHoursUpToYear: decimalText(row["Jam Kerja Aman Up TO 2025"]),
        fatalityThreshold: decimalText(row["Fatality (1) Tresshold"]),
        fatalityActual: decimalText(row["Fatality (1) Actual"]),
        ltiThreshold: decimalText(row["LTI (2) Tresshold"]),
        ltiActual: decimalText(row["LTI (2) Actual"]),
        propertyDamageThreshold: decimalText(row["PD>USD 10.000 (6) Tresshold"]),
        propertyDamageActual: decimalText(row["PD>USD 10.000 (6) Actual"]),
        sourceSheet: sheet,
        sourceRowNumber: index + 2,
      })
    } catch (error) {
      pushError(summary, index + 2, error)
    }
  }

  if (values.length) {
    await db.insert(safetyPerformanceMetrics).values(values)
    summary.inserted = values.length
  }

  return summary
}

async function importManHours(rows: SheetRow[]) {
  const sheet = SAFETY_WORKBOOK_SHEETS.manHours
  const summary = makeSummary(sheet, rows.length)
  const values = []

  for (const [index, row] of rows.entries()) {
    try {
      const workLocation = normalizeSafetyText(row["Lokasi Kerja"])
      if (!workLocation) {
        throw new Error("missing work location")
      }

      values.push({
        workLocation,
        employeeCount: intValue(row["Jumlah Karyawan"]),
        safetyManHours: decimalText(row["Safety Man Hours"]),
        safeTarget: decimalText(row["Target Aman"]),
        averageWeeklyRevenue: normalizeSafetyNumber(row["pendapatan rata2 perminggu"]) == null ? null : decimalText(row["pendapatan rata2 perminggu"]),
        sourceSheet: sheet,
        sourceRowNumber: index + 2,
      })
    } catch (error) {
      pushError(summary, index + 2, error)
    }
  }

  if (values.length) {
    await db.insert(safetyManHours).values(values)
    summary.inserted = values.length
  }

  return summary
}

async function importMonthlyManHours(rows: SheetRow[]) {
  const sheet = SAFETY_WORKBOOK_SHEETS.monthlyManHours
  const summary = makeSummary(sheet, rows.length)
  const values = []

  for (const [index, row] of rows.entries()) {
    try {
      const workLocation = normalizeSafetyText(row["Lokasi Kerja"])
      const month = toDateOnly(row.Bulan)
      if (!workLocation || !month) {
        throw new Error("missing work location or month")
      }

      values.push({
        workLocation,
        employeeCount: intValue(row["Jumlah Karyawan"]),
        month,
        safetyManHours: decimalText(row["Safety Man Hours"]),
        sourceSheet: sheet,
        sourceRowNumber: index + 2,
      })
    } catch (error) {
      pushError(summary, index + 2, error)
    }
  }

  if (values.length) {
    await db.insert(safetyMonthlyManHours).values(values)
    summary.inserted = values.length
  }

  return summary
}

async function importWeeklyActivities(rows: SheetRow[]) {
  const sheet = SAFETY_WORKBOOK_SHEETS.weeklyActivities
  const summary = makeSummary(sheet, rows.length)
  const values = []

  for (const [index, row] of rows.entries()) {
    try {
      const activity = normalizeSafetyText(row.Kegiatan)
      if (!activity) {
        throw new Error("missing activity")
      }

      values.push({
        activity,
        activityDate: toDateOnly(row.Tanggal),
        pic: normalizeSafetyText(row.PIC),
        category: normalizeSafetyText(row.Kategory),
        imageUrl: normalizeSafetyText(row["Image Link"]),
        evidenceUrl: normalizeSafetyText(row.Link),
        sourceSheet: sheet,
        sourceRowNumber: index + 2,
      })
    } catch (error) {
      pushError(summary, index + 2, error)
    }
  }

  if (values.length) {
    await db.insert(safetyWeeklyActivities).values(values)
    summary.inserted = values.length
  }

  return summary
}

export async function importSafetyDashboardWorkbook(workbookPath: string) {
  const workbook = xlsx.readFile(workbookPath, { cellDates: true })

  await deleteImportedWorkbookRows()

  return [
    await importYearlyIncident(getRows(workbook, SAFETY_WORKBOOK_SHEETS.yearlyIncident)),
    await importCertifications(getRows(workbook, SAFETY_WORKBOOK_SHEETS.certifications)),
    await importPerformance(getRows(workbook, SAFETY_WORKBOOK_SHEETS.performance)),
    await importManHours(getRows(workbook, SAFETY_WORKBOOK_SHEETS.manHours)),
    await importMonthlyManHours(getRows(workbook, SAFETY_WORKBOOK_SHEETS.monthlyManHours)),
    await importMonthlyIncident(getRows(workbook, SAFETY_WORKBOOK_SHEETS.monthlyIncident)),
    await importIncidentReports(getRows(workbook, SAFETY_WORKBOOK_SHEETS.incidentReports)),
    await importWeeklyActivities(getRows(workbook, SAFETY_WORKBOOK_SHEETS.weeklyActivities)),
  ]
}
