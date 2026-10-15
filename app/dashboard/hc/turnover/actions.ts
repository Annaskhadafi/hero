'use server'

import { db } from '@/db'
import {
  hcTurnoverMovements,
  hcTurnoverSettings,
  employees,
} from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

function safeRevalidate(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // ignore outside request context
  }
}

export async function updateInitialHeadcountAction(year: number, headcount: number) {
  try {
    const [existing] = await db
      .select()
      .from(hcTurnoverSettings)
      .where(eq(hcTurnoverSettings.year, year))
      .limit(1)

    if (existing) {
      await db
        .update(hcTurnoverSettings)
        .set({
          initialHeadcount: headcount,
          updatedAt: new Date(),
        })
        .where(eq(hcTurnoverSettings.id, existing.id))
    } else {
      await db.insert(hcTurnoverSettings).values({
        year,
        initialHeadcount: headcount,
        notes: `Initial base headcount for year ${year}`,
      })
    }

    safeRevalidate('/dashboard/hc/turnover')
    return { success: true }
  } catch (err: any) {
    console.error('[updateInitialHeadcountAction] Error:', err)
    return { success: false, error: err.message || 'Gagal menyimpan headcount awal' }
  }
}

export async function createIncomingMovementAction(data: {
  employeeId?: number | null
  employeeName: string
  employeeSn: string
  position: string
  section: string
  department?: string
  poh: string
  joinDate: string
  remark: string
  notes?: string
}) {
  try {
    if (!data.employeeName || !data.employeeSn || !data.joinDate) {
      return { success: false, error: 'Nama, SN, dan Tanggal Masuk wajib diisi' }
    }

    const [inserted] = await db
      .insert(hcTurnoverMovements)
      .values({
        movementType: 'incoming',
        employeeId: data.employeeId || null,
        employeeSn: data.employeeSn.trim(),
        name: data.employeeName.trim(),
        position: data.position.trim(),
        section: data.section.trim(),
        department: data.department?.trim() || '',
        pointOfHire: data.poh.trim(),
        movementDate: data.joinDate,
        remark: data.remark || 'New Hire',
        notes: data.notes || null,
      })
      .returning()

    safeRevalidate('/dashboard/hc/turnover')
    return { success: true, movement: inserted }
  } catch (err: any) {
    console.error('[createIncomingMovementAction] Error:', err)
    return { success: false, error: err.message || 'Gagal menambahkan karyawan masuk' }
  }
}

export async function createOutgoingMovementAction(data: {
  employeeId?: number | null
  employeeName: string
  employeeSn: string
  position: string
  section: string
  department?: string
  poh: string
  outgoingDate: string
  remark: string
  notes?: string
  deactivateEmployeeAccount?: boolean
}) {
  try {
    if (!data.employeeName || !data.employeeSn || !data.outgoingDate) {
      return { success: false, error: 'Nama, SN, dan Tanggal Keluar wajib diisi' }
    }

    const [inserted] = await db
      .insert(hcTurnoverMovements)
      .values({
        movementType: 'outgoing',
        employeeId: data.employeeId || null,
        employeeSn: data.employeeSn.trim(),
        name: data.employeeName.trim(),
        position: data.position.trim(),
        section: data.section.trim(),
        department: data.department?.trim() || '',
        pointOfHire: data.poh.trim(),
        movementDate: data.outgoingDate,
        remark: data.remark || 'Resign',
        notes: data.notes || null,
      })
      .returning()

    // Optionally deactivate employee in User Management
    if (data.employeeId && data.deactivateEmployeeAccount) {
      await db
        .update(employees)
        .set({
          isActive: false,
          employmentStatus: data.remark || 'Resigned',
        })
        .where(eq(employees.id, data.employeeId))
    }

    safeRevalidate('/dashboard/hc/turnover')
    safeRevalidate('/dashboard/security/users')
    return { success: true, movement: inserted }
  } catch (err: any) {
    console.error('[createOutgoingMovementAction] Error:', err)
    return { success: false, error: err.message || 'Gagal menambahkan karyawan keluar' }
  }
}

export async function deleteMovementAction(id: number) {
  try {
    await db.delete(hcTurnoverMovements).where(eq(hcTurnoverMovements.id, id))
    safeRevalidate('/dashboard/hc/turnover')
    return { success: true }
  } catch (err: any) {
    console.error('[deleteMovementAction] Error:', err)
    return { success: false, error: err.message || 'Gagal menghapus data' }
  }
}
