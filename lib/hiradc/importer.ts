import { randomUUID } from "node:crypto"

import { eq, inArray } from "drizzle-orm"
import * as xlsx from "xlsx"

import { db } from "@/db"
import { hiradcEntries, hiradcImports, hiradcRegisters } from "@/db/schema/hero"
import {
  HIRADC_DATA_SHEET,
  HIRADC_HEADER_ROWS,
  isMeaningfulRow,
  parseHiradcRow,
  type HiradcParsedEntry,
} from "@/lib/hiradc/parsing"

export type HiradcImportSummary = {
  batchId: string
  totalRows: number
  successCount: number
  errorCount: number
  registerCount: number
  registers: Array<{ department: string; entries: number }>
  errors: string[]
}

export type HiradcImportOptions = {
  /** "department" => one register per department, "single" => one register. */
  grouping?: "department" | "single"
  /** Remove previous imported registers/entries before importing. */
  replaceExisting?: boolean
  originalFilename?: string
  uploadedByUserId?: string | null
  singleRegisterTitle?: string
}

function readDataRows(workbook: xlsx.WorkBook): unknown[][] {
  const sheet = workbook.Sheets[HIRADC_DATA_SHEET]
  if (!sheet) {
    throw new Error(`Sheet "${HIRADC_DATA_SHEET}" tidak ditemukan di workbook.`)
  }
  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false })
  return rows.slice(HIRADC_HEADER_ROWS)
}

export function parseHiradcWorkbookBuffer(buffer: Buffer | ArrayBuffer): {
  entries: HiradcParsedEntry[]
  errors: string[]
  totalRows: number
} {
  const workbook = xlsx.read(buffer, { type: "buffer" })
  const rows = readDataRows(workbook)
  const entries: HiradcParsedEntry[] = []
  const errors: string[] = []

  rows.forEach((row, index) => {
    const sourceRowNumber = index + HIRADC_HEADER_ROWS + 1
    try {
      const parsed = parseHiradcRow(row, sourceRowNumber)
      if (!isMeaningfulRow(parsed)) return
      entries.push(parsed)
    } catch (error) {
      errors.push(`row ${sourceRowNumber}: ${error instanceof Error ? error.message : String(error)}`)
    }
  })

  return { entries, errors, totalRows: rows.length }
}

function groupKey(entry: HiradcParsedEntry, grouping: "department" | "single") {
  return grouping === "single" ? "__ALL__" : entry.department || "Tanpa Departemen"
}

async function deletePreviousImports() {
  const previous = await db.select({ id: hiradcRegisters.id }).from(hiradcRegisters)
  const ids = previous.map((r) => r.id)
  if (ids.length > 0) {
    await db.delete(hiradcEntries).where(inArray(hiradcEntries.registerId, ids))
    await db.delete(hiradcRegisters).where(inArray(hiradcRegisters.id, ids))
  }
}

export async function importHiradcEntries(
  entries: HiradcParsedEntry[],
  parseErrors: string[],
  totalRows: number,
  options: HiradcImportOptions = {},
): Promise<HiradcImportSummary> {
  const grouping = options.grouping ?? "department"
  const batchId = randomUUID()
  const errors = [...parseErrors]

  await db.insert(hiradcImports).values({
    batchId,
    originalFilename: options.originalFilename ?? "",
    totalRows,
    status: "processing",
    uploadedByUserId: options.uploadedByUserId ?? null,
  })

  try {
    if (options.replaceExisting) {
      await deletePreviousImports()
    }

    const groups = new Map<string, HiradcParsedEntry[]>()
    for (const entry of entries) {
      const key = groupKey(entry, grouping)
      const bucket = groups.get(key) ?? []
      bucket.push(entry)
      groups.set(key, bucket)
    }

    let successCount = 0
    const registers: Array<{ department: string; entries: number }> = []

    for (const [key, bucket] of groups) {
      const department = grouping === "single" ? "" : (key === "Tanpa Departemen" ? "" : key)
      const title =
        grouping === "single"
          ? options.singleRegisterTitle ?? "HIRADC Master Register"
          : `HIRADC - ${key}`
      const location = bucket.find((e) => e.location)?.location ?? ""

      const [register] = await db
        .insert(hiradcRegisters)
        .values({
          title,
          department,
          location,
          status: "draft",
          sourceBatchId: batchId,
          createdByUserId: options.uploadedByUserId ?? null,
        })
        .returning({ id: hiradcRegisters.id })

      const values = bucket.map((entry, idx) => ({
        registerId: register.id,
        orderIndex: idx + 1,
        department: entry.department,
        location: entry.location,
        activityName: entry.activityName,
        routineType: entry.routineType || "Rutin",
        equipment: entry.equipment,
        hazardCategory: entry.hazardCategory,
        hazardDetails: entry.hazardDetails,
        riskConsequence: entry.riskConsequence,
        likelihoodBefore: entry.likelihoodBefore,
        severityBefore: entry.severityBefore,
        scoreBefore: entry.scoreBefore,
        riskLevelBefore: entry.riskLevelBefore,
        existingControl: entry.existingControl,
        legalReference: entry.legalReference,
        likelihoodAfter: entry.likelihoodAfter,
        severityAfter: entry.severityAfter,
        scoreAfter: entry.scoreAfter,
        riskLevelAfter: entry.riskLevelAfter,
        additionalControl: entry.additionalControl,
        sourceBatchId: batchId,
        sourceRowNumber: entry.sourceRowNumber,
        rawDepartment: entry.rawDepartment,
        rawRoutineType: entry.rawRoutineType,
        rawLikelihoodBefore: entry.rawLikelihoodBefore,
        rawSeverityBefore: entry.rawSeverityBefore,
        rawLikelihoodAfter: entry.rawLikelihoodAfter,
        rawSeverityAfter: entry.rawSeverityAfter,
        rawScoreBefore: entry.rawScoreBefore,
        rawScoreAfter: entry.rawScoreAfter,
      }))

      // Insert in chunks to keep parameter counts safe.
      const chunkSize = 100
      for (let i = 0; i < values.length; i += chunkSize) {
        await db.insert(hiradcEntries).values(values.slice(i, i + chunkSize))
      }

      successCount += bucket.length
      registers.push({ department: department || title, entries: bucket.length })
    }

    await db
      .update(hiradcImports)
      .set({
        status: "completed",
        successCount,
        errorCount: errors.length,
        registerCount: registers.length,
        errorLog: errors.length ? errors.join("\n") : null,
        processedAt: new Date(),
      })
      .where(eq(hiradcImports.batchId, batchId))

    return {
      batchId,
      totalRows,
      successCount,
      errorCount: errors.length,
      registerCount: registers.length,
      registers,
      errors,
    }
  } catch (error) {
    await db
      .update(hiradcImports)
      .set({
        status: "failed",
        errorLog: error instanceof Error ? error.message : String(error),
        processedAt: new Date(),
      })
      .where(eq(hiradcImports.batchId, batchId))
    throw error
  }
}

export async function importHiradcWorkbook(
  buffer: Buffer | ArrayBuffer,
  options: HiradcImportOptions = {},
): Promise<HiradcImportSummary> {
  const { entries, errors, totalRows } = parseHiradcWorkbookBuffer(buffer)
  return importHiradcEntries(entries, errors, totalRows, options)
}
