'use server'

import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { heroGaHouseRentals } from '@/db/schema/house-rental'
import { employees, sites } from '@/db/schema/hero'
import {
  calculateRemainingDays,
  computeHouseRentalStatus,
} from '@/lib/ga-house-rental-utils'

export type HouseRentalItem = typeof heroGaHouseRentals.$inferSelect & {
  siteName?: string | null
  assignedEmployeeSn?: string | null
  assignedEmployeeJob?: string | null
}

export type HouseRentalInput = {
  rentalCode?: string
  workLocation: string
  siteId?: number | null
  description: string
  propertyType: string
  ownerName: string
  ownerPhone?: string
  ownerBank?: string
  contractStart: string
  contractEnd: string
  costRent: number | string
  paymentCycle?: string
  status?: string
  extensionNotes?: string
  address?: string
  capacity?: number
  contractDocumentUrl?: string | null
  contractDocumentName?: string | null
  propertyPhotoUrl?: string | null
  assignedEmployeeId?: number | null
  assignedEmployeeName?: string
  notes?: string
}

export type HouseRentalMetrics = {
  totalUnits: number
  activeUnits: number
  expiringSoonUnits: number
  terminatedUnits: number
  totalCostRent: number
}

// ─── Query House Rentals ──────────────────────────────────────────────────────

export async function getHouseRentalsList(params?: {
  search?: string
  status?: string
  workLocation?: string
  propertyType?: string
}): Promise<{ success: boolean; data?: HouseRentalItem[]; error?: string }> {
  try {
    const conditions = []

    if (params?.status && params.status !== 'all') {
      conditions.push(eq(heroGaHouseRentals.status, params.status))
    }

    if (params?.workLocation && params.workLocation !== 'all') {
      conditions.push(eq(heroGaHouseRentals.workLocation, params.workLocation))
    }

    if (params?.propertyType && params.propertyType !== 'all') {
      conditions.push(eq(heroGaHouseRentals.propertyType, params.propertyType))
    }

    if (params?.search && params.search.trim() !== '') {
      const q = `%${params.search.trim()}%`
      conditions.push(
        or(
          ilike(heroGaHouseRentals.rentalCode, q),
          ilike(heroGaHouseRentals.workLocation, q),
          ilike(heroGaHouseRentals.description, q),
          ilike(heroGaHouseRentals.ownerName, q),
          ilike(heroGaHouseRentals.extensionNotes, q),
          ilike(heroGaHouseRentals.assignedEmployeeName, q)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        rental: heroGaHouseRentals,
        siteName: sites.name,
        assignedEmployeeSn: employees.employeeSn,
        assignedEmployeeJob: employees.jobTitle,
      })
      .from(heroGaHouseRentals)
      .leftJoin(sites, eq(heroGaHouseRentals.siteId, sites.id))
      .leftJoin(employees, eq(heroGaHouseRentals.assignedEmployeeId, employees.id))
      .where(whereClause)
      .orderBy(asc(heroGaHouseRentals.contractEnd), desc(heroGaHouseRentals.id))

    const data: HouseRentalItem[] = rows.map((r) => ({
      ...r.rental,
      siteName: r.siteName,
      assignedEmployeeSn: r.assignedEmployeeSn,
      assignedEmployeeJob: r.assignedEmployeeJob,
      // Dynamic status calculation
      status: computeHouseRentalStatus(
        r.rental.contractStart,
        r.rental.contractEnd,
        r.rental.status
      ),
    }))

    return { success: true, data }
  } catch (error) {
    console.error('[getHouseRentalsList] error:', error)
    return { success: false, error: 'Gagal memuat daftar sewa rumah' }
  }
}

// ─── Query House Rental Metrics ───────────────────────────────────────────────

export async function getHouseRentalMetrics(): Promise<{
  success: boolean
  data?: HouseRentalMetrics
  error?: string
}> {
  try {
    const allRentals = await db.select().from(heroGaHouseRentals)

    let totalUnits = allRentals.length
    let activeUnits = 0
    let expiringSoonUnits = 0
    let terminatedUnits = 0
    let totalCostRent = 0

    for (const r of allRentals) {
      const cost = parseFloat(r.costRent?.toString() || '0') || 0
      totalCostRent += cost

      const calculatedStatus = computeHouseRentalStatus(
        r.contractStart,
        r.contractEnd,
        r.status
      )

      if (calculatedStatus === 'active') activeUnits++
      else if (calculatedStatus === 'expiring_soon') expiringSoonUnits++
      else if (calculatedStatus === 'terminated') terminatedUnits++
    }

    return {
      success: true,
      data: {
        totalUnits,
        activeUnits,
        expiringSoonUnits,
        terminatedUnits,
        totalCostRent,
      },
    }
  } catch (error) {
    console.error('[getHouseRentalMetrics] error:', error)
    return {
      success: false,
      error: 'Gagal memuat metrik sewa rumah',
      data: {
        totalUnits: 0,
        activeUnits: 0,
        expiringSoonUnits: 0,
        terminatedUnits: 0,
        totalCostRent: 0,
      },
    }
  }
}

// ─── Create House Rental ──────────────────────────────────────────────────────

export async function createHouseRental(
  input: HouseRentalInput
): Promise<{ success: boolean; data?: HouseRentalItem; error?: string }> {
  try {
    let rentalCode = input.rentalCode?.trim()
    if (!rentalCode) {
      const [latest] = await db
        .select({ id: heroGaHouseRentals.id })
        .from(heroGaHouseRentals)
        .orderBy(desc(heroGaHouseRentals.id))
        .limit(1)
      const nextId = (latest?.id || 0) + 1
      rentalCode = `HR-${String(nextId).padStart(3, '0')}`
    }

    const cleanCost = typeof input.costRent === 'string'
      ? parseFloat(input.costRent.replace(/[^0-9.-]+/g, '')) || 0
      : Number(input.costRent) || 0

    const [inserted] = await db
      .insert(heroGaHouseRentals)
      .values({
        rentalCode,
        workLocation: input.workLocation.trim(),
        siteId: input.siteId || null,
        description: input.description.trim(),
        propertyType: input.propertyType || 'Mess Karyawan',
        ownerName: input.ownerName.trim(),
        ownerPhone: input.ownerPhone?.trim() || '',
        ownerBank: input.ownerBank?.trim() || '',
        contractStart: input.contractStart,
        contractEnd: input.contractEnd,
        costRent: cleanCost.toString(),
        paymentCycle: input.paymentCycle || 'yearly',
        status: input.status || 'active',
        extensionNotes: input.extensionNotes?.trim() || '',
        address: input.address?.trim() || '',
        capacity: Number(input.capacity) || 0,
        contractDocumentUrl: input.contractDocumentUrl || null,
        contractDocumentName: input.contractDocumentName || null,
        propertyPhotoUrl: input.propertyPhotoUrl || null,
        assignedEmployeeId: input.assignedEmployeeId || null,
        assignedEmployeeName: input.assignedEmployeeName?.trim() || '',
        notes: input.notes?.trim() || '',
      })
      .returning()

    revalidatePath('/dashboard/ga/house-rental')
    return { success: true, data: inserted }
  } catch (error: any) {
    console.error('[createHouseRental] error:', error)
    if (error?.code === '23505') {
      return { success: false, error: 'Kode sewa rumah (Rental Code) sudah terdaftar' }
    }
    return { success: false, error: error?.message || 'Gagal menyimpan sewa rumah' }
  }
}

// ─── Update House Rental ──────────────────────────────────────────────────────

export async function updateHouseRental(
  id: number,
  input: Partial<HouseRentalInput>
): Promise<{ success: boolean; data?: HouseRentalItem; error?: string }> {
  try {
    const updateValues: Record<string, any> = {
      updatedAt: new Date(),
    }

    if (input.rentalCode !== undefined) updateValues.rentalCode = input.rentalCode.trim()
    if (input.workLocation !== undefined) updateValues.workLocation = input.workLocation.trim()
    if (input.siteId !== undefined) updateValues.siteId = input.siteId || null
    if (input.description !== undefined) updateValues.description = input.description.trim()
    if (input.propertyType !== undefined) updateValues.propertyType = input.propertyType
    if (input.ownerName !== undefined) updateValues.ownerName = input.ownerName.trim()
    if (input.ownerPhone !== undefined) updateValues.ownerPhone = input.ownerPhone.trim()
    if (input.ownerBank !== undefined) updateValues.ownerBank = input.ownerBank.trim()
    if (input.contractStart !== undefined) updateValues.contractStart = input.contractStart
    if (input.contractEnd !== undefined) updateValues.contractEnd = input.contractEnd
    if (input.costRent !== undefined) {
      const cleanCost = typeof input.costRent === 'string'
        ? parseFloat(input.costRent.replace(/[^0-9.-]+/g, '')) || 0
        : Number(input.costRent) || 0
      updateValues.costRent = cleanCost.toString()
    }
    if (input.paymentCycle !== undefined) updateValues.paymentCycle = input.paymentCycle
    if (input.status !== undefined) updateValues.status = input.status
    if (input.extensionNotes !== undefined) updateValues.extensionNotes = input.extensionNotes.trim()
    if (input.address !== undefined) updateValues.address = input.address.trim()
    if (input.capacity !== undefined) updateValues.capacity = Number(input.capacity) || 0
    if (input.contractDocumentUrl !== undefined) updateValues.contractDocumentUrl = input.contractDocumentUrl
    if (input.contractDocumentName !== undefined) updateValues.contractDocumentName = input.contractDocumentName
    if (input.propertyPhotoUrl !== undefined) updateValues.propertyPhotoUrl = input.propertyPhotoUrl
    if (input.assignedEmployeeId !== undefined) updateValues.assignedEmployeeId = input.assignedEmployeeId || null
    if (input.assignedEmployeeName !== undefined) updateValues.assignedEmployeeName = input.assignedEmployeeName.trim()
    if (input.notes !== undefined) updateValues.notes = input.notes.trim()

    const [updated] = await db
      .update(heroGaHouseRentals)
      .set(updateValues)
      .where(eq(heroGaHouseRentals.id, id))
      .returning()

    revalidatePath('/dashboard/ga/house-rental')
    return { success: true, data: updated }
  } catch (error: any) {
    console.error('[updateHouseRental] error:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui data sewa rumah' }
  }
}

// ─── Delete House Rental ──────────────────────────────────────────────────────

export async function deleteHouseRental(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(heroGaHouseRentals).where(eq(heroGaHouseRentals.id, id))
    revalidatePath('/dashboard/ga/house-rental')
    return { success: true }
  } catch (error: any) {
    console.error('[deleteHouseRental] error:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data sewa rumah' }
  }
}

// ─── Bulk Actions ─────────────────────────────────────────────────────────────

export async function bulkDeleteHouseRentals(
  ids: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ids || ids.length === 0) return { success: true }
    await db.delete(heroGaHouseRentals).where(inArray(heroGaHouseRentals.id, ids))
    revalidatePath('/dashboard/ga/house-rental')
    return { success: true }
  } catch (error: any) {
    console.error('[bulkDeleteHouseRentals] error:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data sewa rumah terpilih' }
  }
}

export async function bulkUpdateHouseRentalStatus(
  ids: number[],
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ids || ids.length === 0) return { success: true }
    await db
      .update(heroGaHouseRentals)
      .set({ status, updatedAt: new Date() })
      .where(inArray(heroGaHouseRentals.id, ids))
    revalidatePath('/dashboard/ga/house-rental')
    return { success: true }
  } catch (error: any) {
    console.error('[bulkUpdateHouseRentalStatus] error:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui status sewa rumah' }
  }
}

// ─── Dropdown Data Helpers ────────────────────────────────────────────────────

export async function getSitesForHouseRental(): Promise<
  { id: number; name: string }[]
> {
  try {
    return await db
      .select({
        id: sites.id,
        name: sites.name,
      })
      .from(sites)
      .orderBy(asc(sites.name))
  } catch (e) {
    console.error('[getSitesForHouseRental] error:', e)
    return []
  }
}

export async function getEmployeesForHouseRental(): Promise<
  { id: number; name: string; employeeSn: string | null; jobTitle: string | null; department: string | null }[]
> {
  try {
    return await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: employees.jobTitle,
        department: employees.department,
      })
      .from(employees)
      .where(eq(employees.employmentStatus, 'active'))
      .orderBy(asc(employees.name))
  } catch (e) {
    console.error('[getEmployeesForHouseRental] error:', e)
    return []
  }
}
