'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { asc, eq, ilike } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { auth } from '@/lib/auth'
import { getCurrentEmployee } from '@/lib/get-current-employee'

export async function getUserSignatureAction() {
  try {
    let emp = await getCurrentEmployee()
    if (!emp) {
      const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
      const targetEmail = session?.user?.email?.trim().toLowerCase()
      if (targetEmail) {
        const [emailEmp] = await db
          .select()
          .from(employees)
          .where(ilike(employees.email, targetEmail))
          .limit(1)
        if (emailEmp) {
          emp = emailEmp
        }
      }
    }

    if (!emp) {
      return { success: false as const, error: 'Sesi tidak valid.' }
    }

    const [record] = await db
      .select({
        signatureDataUrl: employees.signatureDataUrl,
        signatureRegisteredAt: employees.signatureRegisteredAt,
        name: employees.name,
        employeeSn: employees.employeeSn,
      })
      .from(employees)
      .where(eq(employees.id, emp.id))
      .limit(1)

    let finalSig = record?.signatureDataUrl || null
    let finalRegAt = record?.signatureRegisteredAt ? new Date(record.signatureRegisteredAt).toISOString() : null

    return {
      success: true as const,
      hasSignature: Boolean(finalSig),
      signatureDataUrl: finalSig,
      signatureRegisteredAt: finalRegAt,
      employeeName: record?.name || emp.name,
      employeeSn: record?.employeeSn || emp.employeeSn,
    }
  } catch (error: any) {
    console.error('Error fetching user signature:', error)
    return { success: false as const, error: error.message || 'Gagal mengambil tanda tangan.' }
  }
}

export async function saveUserSignatureAction(signatureDataUrl: string) {
  try {
    if (!signatureDataUrl || typeof signatureDataUrl !== 'string' || !signatureDataUrl.startsWith('data:image/')) {
      return { success: false as const, error: 'Format tanda tangan tidak valid.' }
    }

    let emp = await getCurrentEmployee()
    if (!emp) {
      const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
      const targetEmail = session?.user?.email?.trim().toLowerCase()
      if (targetEmail) {
        const [emailEmp] = await db
          .select()
          .from(employees)
          .where(ilike(employees.email, targetEmail))
          .limit(1)
        if (emailEmp) {
          emp = emailEmp
        }
      }
    }

    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    const now = new Date()

    // 1. Update target employee
    await db
      .update(employees)
      .set({
        signatureDataUrl,
        signatureRegisteredAt: now,
      })
      .where(eq(employees.id, emp.id))

    // 2. Also update all employee records matching employee email
    if (emp.email) {
      await db
        .update(employees)
        .set({
          signatureDataUrl,
          signatureRegisteredAt: now,
        })
        .where(ilike(employees.email, emp.email.trim()))
    }

    revalidatePath('/dashboard/profile')
    revalidatePath('/dashboard/approval')
    revalidatePath('/dashboard/activity-hub/approval')
    revalidatePath('/dashboard/overtime-requests')
    revalidatePath('/dashboard/hse/izin-kerja-ptw')
    revalidatePath('/dashboard/sop-win')

    return { success: true as const }
  } catch (error: any) {
    console.error('Error saving user signature:', error)
    return { success: false as const, error: error.message || 'Gagal menyimpan tanda tangan.' }
  }
}
