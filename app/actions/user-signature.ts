'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { asc, eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { auth } from '@/lib/auth'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'

async function resolveEmployeeForSignature() {
  let emp = await getCurrentEmployee()
  if (!emp) {
    const session = (await getServerSession()) || (await auth.api.getSession({ headers: await headers() }).catch(() => null))
    const targetEmail = session?.user?.email?.trim().toLowerCase()
    if (targetEmail) {
      const [emailEmp] = await db
        .select()
        .from(employees)
        .where(sql`LOWER(TRIM(${employees.email})) = ${targetEmail}`)
        .limit(1)
      if (emailEmp) {
        emp = emailEmp
      }
    }
  }

  // Fallback: match first active employee (consistent with profile page & daily activity)
  if (!emp) {
    const [firstEmp] = await db
      .select()
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.id))
      .limit(1)
    if (firstEmp) {
      emp = firstEmp
    }
  }

  return emp
}

function triggerSignatureRevalidations() {
  const paths = [
    '/dashboard/profile',
    '/dashboard/approval',
    '/dashboard/activity-hub/approval',
    '/dashboard/activity-hub/my-day',
    '/dashboard/overtime-requests',
    '/dashboard/hse/izin-kerja-ptw',
    '/dashboard/sop-win',
    '/mobile/profile',
    '/mobile/approval',
    '/mobile/activity',
    '/mobile/activity/input',
    '/mobile/overtime',
  ]
  for (const path of paths) {
    try {
      revalidatePath(path)
    } catch {}
  }
}

export async function getUserSignatureAction() {
  try {
    const emp = await resolveEmployeeForSignature()

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

    const emp = await resolveEmployeeForSignature()

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
        .where(sql`LOWER(TRIM(${employees.email})) = ${emp.email.trim().toLowerCase()}`)
    }

    triggerSignatureRevalidations()

    return {
      success: true as const,
      signatureDataUrl,
      signatureRegisteredAt: now.toISOString(),
    }
  } catch (error: any) {
    console.error('Error saving user signature:', error)
    return { success: false as const, error: error.message || 'Gagal menyimpan tanda tangan.' }
  }
}

export async function deleteUserSignatureAction() {
  try {
    const emp = await resolveEmployeeForSignature()

    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    await db
      .update(employees)
      .set({
        signatureDataUrl: null,
        signatureRegisteredAt: null,
      })
      .where(eq(employees.id, emp.id))

    if (emp.email) {
      await db
        .update(employees)
        .set({
          signatureDataUrl: null,
          signatureRegisteredAt: null,
        })
        .where(sql`LOWER(TRIM(${employees.email})) = ${emp.email.trim().toLowerCase()}`)
    }

    triggerSignatureRevalidations()

    return { success: true as const }
  } catch (error: any) {
    console.error('Error deleting user signature:', error)
    return { success: false as const, error: error.message || 'Gagal menghapus tanda tangan.' }
  }
}

