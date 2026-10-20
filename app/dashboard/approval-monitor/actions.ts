'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { employees, masterDepartments } from '@/db/schema/hero'
import { eq, asc } from 'drizzle-orm'
import { getCurrentEmployeeByEmail } from '@/lib/get-current-employee'
import { isSuperAdminRole } from '@/lib/hero-access'
import {
  getApprovalMonitoringData,
  reassignApprovalStep,
  modifyApprovalRoute,
  deleteApprovalSubmission,
  type ApprovalMonitorData,
} from '@/lib/approval-workspace'

async function getAuthorizedAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email) {
    throw new Error('Anda harus login terlebih dahulu.')
  }

  const currentEmp = await getCurrentEmployeeByEmail(session.user.email)
  const isSuperAdmin = isSuperAdminRole(currentEmp?.accessRole)

  if (!isSuperAdmin) {
    throw new Error('Akses ditolak: Menu ini khusus untuk Super Admin.')
  }

  return {
    email: session.user.email,
    name: currentEmp?.name || session.user.name || 'Super Admin',
    employee: currentEmp,
  }
}

export async function fetchApprovalMonitoringDataAction(): Promise<{
  success: boolean
  data?: ApprovalMonitorData
  error?: string
}> {
  try {
    await getAuthorizedAdmin()
    const data = await getApprovalMonitoringData()
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal memuat data monitoring approval.' }
  }
}

export async function getEmployeeOptionsAction(): Promise<
  Array<{
    id: number
    name: string
    email: string
    jobTitle: string
    departmentName: string
  }>
> {
  try {
    await getAuthorizedAdmin()
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        departmentName: masterDepartments.name,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .orderBy(asc(employees.name))

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      jobTitle: r.jobTitle || 'Karyawan',
      departmentName: r.departmentName || 'General',
    }))
  } catch (err) {
    console.error('[getEmployeeOptionsAction] Error:', err)
    return []
  }
}

export async function reassignApprovalStepAction(params: {
  category: 'DAILY_ACTIVITY' | 'OVERTIME' | 'PTW' | 'SOP_WIN' | 'GENERAL'
  stepId: number
  targetEmployeeId: number
  note?: string
}): Promise<{ success: boolean; message: string }> {
  try {
    const admin = await getAuthorizedAdmin()

    const result = await reassignApprovalStep({
      category: params.category,
      stepId: params.stepId,
      targetEmployeeId: params.targetEmployeeId,
      note: params.note,
      adminName: admin.name,
    })

    revalidatePath('/dashboard/approval-monitor')
    revalidatePath('/dashboard/approval')
    revalidatePath('/mobile/approval')

    return result
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal mengalihkan approval.' }
  }
}

export async function modifyApprovalRouteAction(params: {
  category: 'DAILY_ACTIVITY' | 'OVERTIME' | 'PTW' | 'SOP_WIN' | 'GENERAL'
  docId: number
  steps: Array<{
    stepId: number
    targetEmployeeId: number
    stepLabel?: string
  }>
}): Promise<{ success: boolean; message: string }> {
  try {
    const admin = await getAuthorizedAdmin()

    const result = await modifyApprovalRoute({
      category: params.category,
      docId: params.docId,
      steps: params.steps,
      adminName: admin.name,
    })

    revalidatePath('/dashboard/approval-monitor')
    revalidatePath('/dashboard/approval')
    revalidatePath('/mobile/approval')

    return result
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal mengubah route approval.' }
  }
}

export async function deleteApprovalSubmissionAction(params: {
  category: 'DAILY_ACTIVITY' | 'OVERTIME' | 'PTW' | 'SOP_WIN' | string
  rawId: number
  remarks?: string
}): Promise<{ success: boolean; message: string }> {
  try {
    const admin = await getAuthorizedAdmin()

    const result = await deleteApprovalSubmission({
      category: params.category,
      rawId: params.rawId,
      adminActor: {
        name: admin.name,
        email: admin.email,
      },
      remarks: params.remarks,
    })

    revalidatePath('/dashboard/approval-monitor')
    revalidatePath('/dashboard/approval')
    revalidatePath('/mobile/approval')
    revalidatePath('/mobile/activity')

    return result
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal menghapus pengajuan.' }
  }
}

export async function bulkDeleteApprovalSubmissionsAction(items: Array<{
  category: 'DAILY_ACTIVITY' | 'OVERTIME' | 'PTW' | 'SOP_WIN' | string
  rawId: number
}>): Promise<{ success: boolean; message: string; deletedCount: number }> {
  try {
    const admin = await getAuthorizedAdmin()
    let deletedCount = 0

    for (const item of items) {
      try {
        await deleteApprovalSubmission({
          category: item.category,
          rawId: item.rawId,
          adminActor: {
            name: admin.name,
            email: admin.email,
          },
        })
        deletedCount++
      } catch (e) {
        console.error(`Failed to delete item ${item.category}-${item.rawId}:`, e)
      }
    }

    revalidatePath('/dashboard/approval-monitor')
    revalidatePath('/dashboard/approval')
    revalidatePath('/mobile/approval')
    revalidatePath('/mobile/activity')

    return {
      success: true,
      message: `${deletedCount} dokumen berhasil dihapus permanen.`,
      deletedCount,
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal menghapus dokumen terpilih.', deletedCount: 0 }
  }
}


