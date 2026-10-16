'use server'

import { db } from '@/db'
import { eq, and, desc, ilike, or } from 'drizzle-orm'
import { heroCompensationBenefit, getLevelRank } from '@/db/schema/compensation'
import { employees, sites } from '@/db/schema/hero'
import { revalidatePath } from 'next/cache'

export type CompensationRow = {
  id: number
  employeeId: number
  employeeSn: string
  name: string
  site: string
  department: string
  section: string
  levelName: string
  levelRank: number
  compensationType: string
  nominal: number
  remarks: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ─── Get List ────────────────────────────────────────────────────────────────

export async function getCompensationList(filters?: {
  search?: string
  siteId?: number
  levelName?: string
  compensationType?: string
}): Promise<CompensationRow[]> {
  const rows = await db
    .select({
      id: heroCompensationBenefit.id,
      employeeId: heroCompensationBenefit.employeeId,
      employeeSn: employees.employeeSn,
      name: employees.name,
      site: sites.name,
      department: employees.department,
      section: employees.section,
      levelName: employees.levelName,
      compensationType: heroCompensationBenefit.compensationType,
      nominal: heroCompensationBenefit.nominal,
      remarks: heroCompensationBenefit.remarks,
      isActive: heroCompensationBenefit.isActive,
      createdAt: heroCompensationBenefit.createdAt,
      updatedAt: heroCompensationBenefit.updatedAt,
    })
    .from(heroCompensationBenefit)
    .innerJoin(employees, eq(heroCompensationBenefit.employeeId, employees.id))
    .innerJoin(sites, eq(employees.siteId, sites.id))
    .where(
      and(
        eq(heroCompensationBenefit.isActive, true),
        eq(employees.employmentStatus, 'active'),
        filters?.siteId ? eq(employees.siteId, filters.siteId) : undefined,
        filters?.levelName ? eq(employees.levelName, filters.levelName) : undefined,
        filters?.compensationType
          ? eq(heroCompensationBenefit.compensationType, filters.compensationType)
          : undefined,
        filters?.search
          ? or(
              ilike(employees.name, `%${filters.search}%`),
              ilike(employees.employeeSn, `%${filters.search}%`),
              ilike(employees.department, `%${filters.search}%`),
            )
          : undefined,
      )
    )

  // Pastikan level tertinggi berada di paling atas
  const mapped: CompensationRow[] = rows.map((r) => ({
    ...r,
    levelRank: getLevelRank(r.levelName),
  }))

  mapped.sort(
    (a, b) => a.levelRank - b.levelRank || a.name.localeCompare(b.name, 'id-ID')
  )

  return mapped
}

export type CompensationMetrics = {
  totalEmployees: number
  totalLeadership: number
  totalHousing: number
  totalPositionSite: number
  totalOthers: number
  grandTotal: number
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export async function getCompensationMetrics(): Promise<CompensationMetrics> {
  const rows = await db
    .select({
      compensationType: heroCompensationBenefit.compensationType,
      nominal: heroCompensationBenefit.nominal,
      employeeId: heroCompensationBenefit.employeeId,
    })
    .from(heroCompensationBenefit)
    .innerJoin(employees, eq(heroCompensationBenefit.employeeId, employees.id))
    .where(
      and(
        eq(heroCompensationBenefit.isActive, true),
        eq(employees.employmentStatus, 'active'),
      )
    )

  const uniqueEmployees = new Set(rows.map((r) => r.employeeId))

  const totalLeadership = rows
    .filter((r) => r.compensationType === 'leadership_allowance')
    .reduce((sum, r) => sum + r.nominal, 0)

  const totalHousing = rows
    .filter((r) => r.compensationType === 'housing_allowance')
    .reduce((sum, r) => sum + r.nominal, 0)

  const totalPositionSite = rows
    .filter((r) => r.compensationType === 'position_site_allowance')
    .reduce((sum, r) => sum + r.nominal, 0)

  const standardTypes = new Set(['leadership_allowance', 'housing_allowance', 'position_site_allowance'])
  const totalOthers = rows
    .filter((r) => !standardTypes.has(r.compensationType))
    .reduce((sum, r) => sum + r.nominal, 0)

  const grandTotal = rows.reduce((sum, r) => sum + r.nominal, 0)

  return {
    totalEmployees: uniqueEmployees.size,
    totalLeadership,
    totalHousing,
    totalPositionSite,
    totalOthers,
    grandTotal,
  }
}

// ─── Get distinct compensation types (Standard + Custom) ─────────────────────

export async function getDistinctCompensationTypes(): Promise<{ value: string; label: string }[]> {
  const rows = await db
    .selectDistinct({ compensationType: heroCompensationBenefit.compensationType })
    .from(heroCompensationBenefit)
    .where(eq(heroCompensationBenefit.isActive, true))

  const standard = [
    { value: 'leadership_allowance', label: 'Leadership Allowance' },
    { value: 'housing_allowance', label: 'Housing Allowance' },
    { value: 'position_site_allowance', label: 'Position Site Allowance' },
  ]

  const custom = rows
    .filter((r) => !standard.some((s) => s.value === r.compensationType))
    .map((r) => ({ value: r.compensationType, label: r.compensationType }))

  return [...standard, ...custom]
}

// ─── Get all active employees for searchable select ──────────────────────────

export async function getActiveEmployeesForSelect() {
  const empList = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      name: employees.name,
      levelName: employees.levelName,
      department: employees.department,
      section: employees.section,
      site: sites.name,
    })
    .from(employees)
    .innerJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.employmentStatus, 'active'))

  // Urutkan level tertinggi paling atas
  empList.sort(
    (a, b) =>
      getLevelRank(a.levelName) - getLevelRank(b.levelName) ||
      a.name.localeCompare(b.name, 'id-ID')
  )

  return empList
}

// ─── Get distinct level names ─────────────────────────────────────────────────

export async function getDistinctLevelNames(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ levelName: employees.levelName })
    .from(employees)
    .where(eq(employees.employmentStatus, 'active'))

  const list = rows.map((r) => r.levelName).filter(Boolean)
  list.sort(
    (a, b) => getLevelRank(a) - getLevelRank(b) || a.localeCompare(b, 'id-ID')
  )
  return list
}

// ─── Upsert (Create or Update) ────────────────────────────────────────────────

export async function upsertCompensation(data: {
  id?: number
  employeeId: number
  compensationType: string
  nominal: number
  remarks: string
}) {
  try {
    if (data.id) {
      // Update existing
      await db
        .update(heroCompensationBenefit)
        .set({
          compensationType: data.compensationType,
          nominal: data.nominal,
          remarks: data.remarks,
          updatedAt: new Date(),
        })
        .where(eq(heroCompensationBenefit.id, data.id))
    } else {
      // Create new
      await db.insert(heroCompensationBenefit).values({
        employeeId: data.employeeId,
        compensationType: data.compensationType,
        nominal: data.nominal,
        remarks: data.remarks,
      })
    }

    revalidatePath('/dashboard/hc/compensation')
    return { success: true }
  } catch (error) {
    console.error('upsertCompensation error:', error)
    return { success: false, error: 'Gagal menyimpan data kompensasi' }
  }
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

export async function deleteCompensation(id: number) {
  try {
    await db
      .update(heroCompensationBenefit)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(heroCompensationBenefit.id, id))

    revalidatePath('/dashboard/hc/compensation')
    return { success: true }
  } catch (error) {
    console.error('deleteCompensation error:', error)
    return { success: false, error: 'Gagal menghapus data kompensasi' }
  }
}
