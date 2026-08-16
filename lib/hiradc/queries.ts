import { asc, desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { hiradcEntries, hiradcRegisters } from "@/db/schema/hero"
import { getCurrentMenuPermission } from "@/lib/hero-access"

export type HiradcAccess = {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll: boolean
}

export type HiradcEntryRow = typeof hiradcEntries.$inferSelect
export type HiradcRegisterRow = typeof hiradcRegisters.$inferSelect
export type HiradcEntryReportData = HiradcEntryRow & {
  register: HiradcRegisterRow | null
}

async function getHiradcAccess(): Promise<HiradcAccess> {
  const perm = await getCurrentMenuPermission("hse_hiradc")
  return {
    canView: perm.canView,
    canEdit: perm.canEdit,
    canDelete: perm.canDelete,
    canSelectAll: perm.canSelectAll,
  }
}

export type HiradcDashboardData = {
  registers: HiradcRegisterRow[]
  entries: HiradcEntryRow[]
  access: HiradcAccess
  filterOptions: {
    departments: string[]
    locations: string[]
    riskLevels: string[]
    routineTypes: string[]
    registers: Array<{ id: number; label: string }>
  }
  kpis: {
    totalEntries: number
    totalRegisters: number
    extremeBefore: number
    highBefore: number
    extremeAfter: number
    highAfter: number
  }
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "id"),
  )
}

export async function getHiradcData(): Promise<HiradcDashboardData> {
  const [registers, entries, access] = await Promise.all([
    db.select().from(hiradcRegisters).orderBy(asc(hiradcRegisters.department), desc(hiradcRegisters.createdAt)),
    db.select().from(hiradcEntries).orderBy(asc(hiradcEntries.registerId), asc(hiradcEntries.orderIndex)),
    getHiradcAccess(),
  ])

  const extremeBefore = entries.filter((e) => e.riskLevelBefore === "EXTREME").length
  const highBefore = entries.filter((e) => e.riskLevelBefore === "HIGH").length
  const extremeAfter = entries.filter((e) => e.riskLevelAfter === "EXTREME").length
  const highAfter = entries.filter((e) => e.riskLevelAfter === "HIGH").length

  return {
    registers,
    entries,
    access,
    filterOptions: {
      departments: uniqueSorted(entries.map((e) => e.department)),
      locations: uniqueSorted(entries.map((e) => e.location)),
      riskLevels: ["EXTREME", "HIGH", "MODERATE", "LOW"],
      routineTypes: uniqueSorted(entries.map((e) => e.routineType)),
      registers: registers.map((r) => ({ id: r.id, label: r.title })),
    },
    kpis: {
      totalEntries: entries.length,
      totalRegisters: registers.length,
      extremeBefore,
      highBefore,
      extremeAfter,
      highAfter,
    },
  }
}

export type HiradcReportData = {
  register: HiradcRegisterRow
  entries: HiradcEntryRow[]
}

export async function getHiradcReport(registerId: number): Promise<HiradcReportData | null> {
  const [register] = await db
    .select()
    .from(hiradcRegisters)
    .where(eq(hiradcRegisters.id, registerId))
    .limit(1)
  if (!register) return null

  const entries = await db
    .select()
    .from(hiradcEntries)
    .where(eq(hiradcEntries.registerId, registerId))
    .orderBy(asc(hiradcEntries.orderIndex))

  return { register, entries }
}

export async function getHiradcEntryReport(entryId: number): Promise<HiradcEntryReportData | null> {
  const [entry] = await db.select().from(hiradcEntries).where(eq(hiradcEntries.id, entryId)).limit(1)
  if (!entry) return null
  if (!entry.registerId) return { ...entry, register: null }

  const [register] = await db
    .select()
    .from(hiradcRegisters)
    .where(eq(hiradcRegisters.id, entry.registerId))
    .limit(1)

  return { ...entry, register: register ?? null }
}

export async function getHiradcRegisters(): Promise<HiradcRegisterRow[]> {
  return db.select().from(hiradcRegisters).orderBy(asc(hiradcRegisters.department), desc(hiradcRegisters.createdAt))
}

export { getHiradcAccess }
