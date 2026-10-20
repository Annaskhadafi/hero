'use server'

import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { hrgaKerjasamaRs, hrgaPklStudents } from '@/db/schema/hrga-kerjasama'
import { employees } from '@/db/schema/hero'
import { calculateDuration, computePklStatus, computeRsStatus } from '@/lib/hrga-kerjasama-utils'

export type KerjasamaRsItem = typeof hrgaKerjasamaRs.$inferSelect
export type PklStudentItem = typeof hrgaPklStudents.$inferSelect

export type KerjasamaRsInput = {
  name: string
  location: string
  address?: string
  startDate?: string | null
  endDate?: string | null
  status?: string
  contactPerson?: string
  contactPhone?: string
  contractDocumentUrl?: string | null
  contractDocumentName?: string | null
  notes?: string
}

export type PklStudentInput = {
  name: string
  institution: string
  major: string
  startDate: string
  endDate: string
  mentorName: string
  mentorEmployeeId?: number | null
  status?: string
  notes?: string
}

// ─── Actions: Kerjasama Rumah Sakit ──────────────────────────────────────────

export async function getKerjasamaRsList(filter?: {
  search?: string
  location?: string
  status?: string
}) {
  try {
    const conditions = []

    if (filter?.search?.trim()) {
      const q = `%${filter.search.trim()}%`
      conditions.push(
        or(
          ilike(hrgaKerjasamaRs.name, q),
          ilike(hrgaKerjasamaRs.location, q),
          ilike(hrgaKerjasamaRs.contactPerson, q),
          ilike(hrgaKerjasamaRs.notes, q)
        )
      )
    }

    if (filter?.location?.trim() && filter.location !== 'ALL') {
      conditions.push(eq(hrgaKerjasamaRs.location, filter.location.trim()))
    }

    if (filter?.status?.trim() && filter.status !== 'ALL') {
      conditions.push(eq(hrgaKerjasamaRs.status, filter.status.trim()))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db
      .select()
      .from(hrgaKerjasamaRs)
      .where(whereClause)
      .orderBy(asc(hrgaKerjasamaRs.name))

    return { success: true, data: list }
  } catch (error: any) {
    console.error('getKerjasamaRsList error:', error)
    return { success: false, error: error.message || 'Gagal memuat data kerjasama rumah sakit' }
  }
}

export async function createKerjasamaRs(input: KerjasamaRsInput) {
  try {
    const computedStatus = computeRsStatus(input.startDate, input.endDate, input.status)

    const [created] = await db
      .insert(hrgaKerjasamaRs)
      .values({
        name: input.name.trim(),
        location: input.location.trim(),
        address: input.address?.trim() || '',
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        status: input.status === 'no_partnership' ? 'no_partnership' : computedStatus,
        contactPerson: input.contactPerson?.trim() || '',
        contactPhone: input.contactPhone?.trim() || '',
        contractDocumentUrl: input.contractDocumentUrl || null,
        contractDocumentName: input.contractDocumentName || null,
        notes: input.notes?.trim() || '',
      })
      .returning()

    revalidatePath('/dashboard/hc/kerjasama')
    return { success: true, data: created }
  } catch (error: any) {
    console.error('createKerjasamaRs error:', error)
    return { success: false, error: error.message || 'Gagal menambah data rumah sakit' }
  }
}

export async function updateKerjasamaRs(id: number, input: Partial<KerjasamaRsInput>) {
  try {
    const updateData: any = { updatedAt: new Date() }
    if (input.name !== undefined) updateData.name = input.name.trim()
    if (input.location !== undefined) updateData.location = input.location.trim()
    if (input.address !== undefined) updateData.address = input.address.trim()
    if (input.startDate !== undefined) updateData.startDate = input.startDate || null
    if (input.endDate !== undefined) updateData.endDate = input.endDate || null
    if (input.contactPerson !== undefined) updateData.contactPerson = input.contactPerson.trim()
    if (input.contactPhone !== undefined) updateData.contactPhone = input.contactPhone.trim()
    if (input.contractDocumentUrl !== undefined) updateData.contractDocumentUrl = input.contractDocumentUrl || null
    if (input.contractDocumentName !== undefined) updateData.contractDocumentName = input.contractDocumentName || null
    if (input.notes !== undefined) updateData.notes = input.notes.trim()

    if (input.status !== undefined) {
      updateData.status = input.status
    } else if (input.startDate !== undefined || input.endDate !== undefined) {
      updateData.status = computeRsStatus(input.startDate, input.endDate)
    }

    const [updated] = await db
      .update(hrgaKerjasamaRs)
      .set(updateData)
      .where(eq(hrgaKerjasamaRs.id, id))
      .returning()

    revalidatePath('/dashboard/hc/kerjasama')
    return { success: true, data: updated }
  } catch (error: any) {
    console.error('updateKerjasamaRs error:', error)
    return { success: false, error: error.message || 'Gagal memperbarui data rumah sakit' }
  }
}

export async function deleteKerjasamaRs(id: number) {
  try {
    await db.delete(hrgaKerjasamaRs).where(eq(hrgaKerjasamaRs.id, id))
    revalidatePath('/dashboard/hc/kerjasama')
    return { success: true }
  } catch (error: any) {
    console.error('deleteKerjasamaRs error:', error)
    return { success: false, error: error.message || 'Gagal menghapus data rumah sakit' }
  }
}

// ─── Actions: Siswa & Mahasiswa PKL ───────────────────────────────────────────

export async function getPklStudentsList(filter?: {
  search?: string
  institution?: string
  status?: string
}) {
  try {
    const conditions = []

    if (filter?.search?.trim()) {
      const q = `%${filter.search.trim()}%`
      conditions.push(
        or(
          ilike(hrgaPklStudents.name, q),
          ilike(hrgaPklStudents.institution, q),
          ilike(hrgaPklStudents.major, q),
          ilike(hrgaPklStudents.mentorName, q),
          ilike(hrgaPklStudents.notes, q)
        )
      )
    }

    if (filter?.institution?.trim() && filter.institution !== 'ALL') {
      conditions.push(eq(hrgaPklStudents.institution, filter.institution.trim()))
    }

    if (filter?.status?.trim() && filter.status !== 'ALL') {
      conditions.push(eq(hrgaPklStudents.status, filter.status.trim()))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const statusOrder = sql`CASE 
      WHEN ${hrgaPklStudents.status} = 'active' THEN 1 
      WHEN ${hrgaPklStudents.status} = 'upcoming' THEN 2 
      ELSE 3 
    END`

    const list = await db
      .select()
      .from(hrgaPklStudents)
      .where(whereClause)
      .orderBy(statusOrder, desc(hrgaPklStudents.startDate), asc(hrgaPklStudents.name))

    return { success: true, data: list }
  } catch (error: any) {
    console.error('getPklStudentsList error:', error)
    return { success: false, error: error.message || 'Gagal memuat data siswa PKL' }
  }
}

export async function createPklStudent(input: PklStudentInput) {
  try {
    const duration = calculateDuration(input.startDate, input.endDate)
    const computedStatus = input.status || computePklStatus(input.startDate, input.endDate)

    const [created] = await db
      .insert(hrgaPklStudents)
      .values({
        name: input.name.trim(),
        institution: input.institution.trim(),
        major: input.major.trim(),
        startDate: input.startDate,
        endDate: input.endDate,
        durationMonths: duration.months,
        durationDays: duration.days,
        durationDisplay: duration.display,
        mentorName: input.mentorName.trim(),
        mentorEmployeeId: input.mentorEmployeeId || null,
        status: computedStatus,
        notes: input.notes?.trim() || '',
      })
      .returning()

    revalidatePath('/dashboard/hc/kerjasama')
    return { success: true, data: created }
  } catch (error: any) {
    console.error('createPklStudent error:', error)
    return { success: false, error: error.message || 'Gagal menambah data siswa PKL' }
  }
}

export async function updatePklStudent(id: number, input: Partial<PklStudentInput>) {
  try {
    const updateData: any = { updatedAt: new Date() }
    if (input.name !== undefined) updateData.name = input.name.trim()
    if (input.institution !== undefined) updateData.institution = input.institution.trim()
    if (input.major !== undefined) updateData.major = input.major.trim()
    if (input.mentorName !== undefined) updateData.mentorName = input.mentorName.trim()
    if (input.mentorEmployeeId !== undefined) updateData.mentorEmployeeId = input.mentorEmployeeId || null
    if (input.notes !== undefined) updateData.notes = input.notes.trim()

    let newStart = input.startDate
    let newEnd = input.endDate

    if (newStart || newEnd) {
      const [existing] = await db.select().from(hrgaPklStudents).where(eq(hrgaPklStudents.id, id))
      const start = newStart || existing.startDate
      const end = newEnd || existing.endDate
      const duration = calculateDuration(start, end)
      updateData.startDate = start
      updateData.endDate = end
      updateData.durationMonths = duration.months
      updateData.durationDays = duration.days
      updateData.durationDisplay = duration.display
      updateData.status = input.status || computePklStatus(start, end)
    } else if (input.status !== undefined) {
      updateData.status = input.status
    }

    const [updated] = await db
      .update(hrgaPklStudents)
      .set(updateData)
      .where(eq(hrgaPklStudents.id, id))
      .returning()

    revalidatePath('/dashboard/hc/kerjasama')
    return { success: true, data: updated }
  } catch (error: any) {
    console.error('updatePklStudent error:', error)
    return { success: false, error: error.message || 'Gagal memperbarui data siswa PKL' }
  }
}

export async function deletePklStudent(id: number) {
  try {
    await db.delete(hrgaPklStudents).where(eq(hrgaPklStudents.id, id))
    revalidatePath('/dashboard/hc/kerjasama')
    return { success: true }
  } catch (error: any) {
    console.error('deletePklStudent error:', error)
    return { success: false, error: error.message || 'Gagal menghapus data siswa PKL' }
  }
}

// ─── Actions: Dashboard Metrics & Distinct Select Options ─────────────────────

export async function getKerjasamaMetrics() {
  try {
    const rsList = await db.select().from(hrgaKerjasamaRs)
    const pklList = await db.select().from(hrgaPklStudents)

    const rsMetrics = {
      total: rsList.length,
      active: rsList.filter((r) => r.status === 'active').length,
      expiringSoon: rsList.filter((r) => r.status === 'expiring_soon').length,
      expired: rsList.filter((r) => r.status === 'expired').length,
      noPartnership: rsList.filter((r) => r.status === 'no_partnership').length,
    }

    const pklMetrics = {
      total: pklList.length,
      active: pklList.filter((p) => p.status === 'active').length,
      completed: pklList.filter((p) => p.status === 'completed').length,
      upcoming: pklList.filter((p) => p.status === 'upcoming').length,
    }

    const rsLocations = Array.from(new Set(rsList.map((r) => r.location).filter(Boolean))).sort()
    const pklInstitutions = Array.from(new Set(pklList.map((p) => p.institution).filter(Boolean))).sort()

    return {
      success: true,
      rsMetrics,
      pklMetrics,
      rsLocations,
      pklInstitutions,
    }
  } catch (error: any) {
    console.error('getKerjasamaMetrics error:', error)
    return {
      success: false,
      error: error.message || 'Gagal menghitung metrik kerjasama',
      rsMetrics: { total: 0, active: 0, expiringSoon: 0, expired: 0, noPartnership: 0 },
      pklMetrics: { total: 0, active: 0, completed: 0, upcoming: 0 },
      rsLocations: [],
      pklInstitutions: [],
    }
  }
}

export async function getActiveEmployeesForMentor() {
  try {
    const list = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
        section: employees.section,
      })
      .from(employees)
      .where(eq(employees.employmentStatus, 'active'))
      .orderBy(asc(employees.name))

    return { success: true, data: list }
  } catch (error: any) {
    console.error('getActiveEmployeesForMentor error:', error)
    return { success: false, data: [] }
  }
}
