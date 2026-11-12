'use server'

import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { cerCapexBudgets, type CerCapexBudget } from '@/db/schema/cer'
import { employees, masterDepartments, sites } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { revalidatePath } from 'next/cache'

export type BudgetControllerPageData = {
  budgets: CerCapexBudget[]
  sites: Array<{ id: number; name: string }>
  departments: Array<{ id: number; name: string }>
  permissions: {
    canView: boolean
    canEdit: boolean
    canDelete: boolean
  }
  currentEmployee: {
    id: number
    name: string
    email: string
    jobTitle: string | null
    accessRole: string | null
  } | null
}

export async function getBudgetControllerData(): Promise<BudgetControllerPageData> {
  const session = await getServerSession()
  if (!session?.user?.email) {
    throw new Error('Unauthorized')
  }

  const roleName = await getCurrentEmployeeAccessRole()
  const permission = await getCurrentMenuPermission('cer_budget_controller')
  const isSuperAdmin = isSuperAdminRole(roleName)
  const isFinance = Boolean(roleName && roleName.toLowerCase().includes('finance'))
  const canAccess = isSuperAdmin || isFinance || permission.canView

  if (!canAccess) {
    throw new Error('Forbidden: Hanya Tim Finance & Super Admin yang berhak mengakses Budget Controller.')
  }

  // Fetch logged in employee
  const [currentEmployee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(and(eq(employees.email, session.user.email), eq(employees.isActive, true)))
    .limit(1)

  // Fetch capex budgets, sites, and departments
  const [budgetRows, siteRows, deptRows] = await Promise.all([
    db
      .select()
      .from(cerCapexBudgets)
      .orderBy(desc(cerCapexBudgets.fiscalYear), asc(cerCapexBudgets.budgetName)),
    db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.isActive, true)),
    db
      .select({ id: masterDepartments.id, name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true)),
  ])

  return {
    budgets: budgetRows,
    sites: siteRows,
    departments: deptRows,
    permissions: {
      canView: isSuperAdmin || isFinance || permission.canView,
      canEdit: isSuperAdmin || isFinance || permission.canEdit,
      canDelete: isSuperAdmin || permission.canDelete,
    },
    currentEmployee: currentEmployee ?? null,
  }
}

export async function saveCapexBudgetAction(input: {
  id?: number
  fiscalYear: number
  siteId?: number | null
  departmentId?: number | null
  assetCategory: string
  budgetCode: string
  budgetName: string
  allocatedAmount: number
  notes?: string
}) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' }
  }

  const roleName = await getCurrentEmployeeAccessRole()
  const permission = await getCurrentMenuPermission('cer_budget_controller')
  const isSuperAdmin = isSuperAdminRole(roleName)
  const isFinance = Boolean(roleName && roleName.toLowerCase().includes('finance'))

  if (!isSuperAdmin && !isFinance && !permission.canEdit && !permission.canView) {
    return {
      success: false,
      message: 'Akses ditolak: Anda tidak memiliki izin untuk mengelola Budget Controller.',
    }
  }

  const now = new Date()

  if (input.id) {
    const [existing] = await db.select().from(cerCapexBudgets).where(eq(cerCapexBudgets.id, input.id))
    if (!existing) return { success: false, message: 'Pagu anggaran tidak ditemukan.' }

    const used = Number(existing.usedAmount) || 0
    const newRem = input.allocatedAmount - used

    await db
      .update(cerCapexBudgets)
      .set({
        fiscalYear: input.fiscalYear,
        siteId: input.siteId || null,
        departmentId: input.departmentId || null,
        assetCategory: input.assetCategory,
        budgetCode: input.budgetCode,
        budgetName: input.budgetName,
        allocatedAmount: String(input.allocatedAmount),
        remainingAmount: String(newRem),
        notes: input.notes || '',
        updatedAt: now,
      })
      .where(eq(cerCapexBudgets.id, input.id))

    revalidatePath('/dashboard/assets/budget-controller')
    revalidatePath('/dashboard/assets/cer')
    return { success: true, message: `Pagu CapEx ${input.budgetCode} berhasil diperbarui.` }
  } else {
    await db.insert(cerCapexBudgets).values({
      fiscalYear: input.fiscalYear,
      siteId: input.siteId || null,
      departmentId: input.departmentId || null,
      assetCategory: input.assetCategory,
      budgetCode: input.budgetCode,
      budgetName: input.budgetName,
      allocatedAmount: String(input.allocatedAmount),
      usedAmount: '0',
      remainingAmount: String(input.allocatedAmount),
      notes: input.notes || '',
      createdById: session.user.id,
    })

    revalidatePath('/dashboard/assets/budget-controller')
    revalidatePath('/dashboard/assets/cer')
    return { success: true, message: `Pagu CapEx ${input.budgetCode} berhasil ditambahkan.` }
  }
}

export async function deleteCapexBudgetAction(id: number) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' }
  }

  const roleName = await getCurrentEmployeeAccessRole()
  const permission = await getCurrentMenuPermission('cer_budget_controller')
  const isSuperAdmin = isSuperAdminRole(roleName)
  const isFinance = Boolean(roleName && roleName.toLowerCase().includes('finance'))

  if (!isSuperAdmin && !isFinance && !permission.canDelete && !permission.canEdit) {
    return {
      success: false,
      message: 'Akses ditolak: Anda tidak memiliki izin untuk menghapus data Budget Controller.',
    }
  }

  const [existing] = await db.select().from(cerCapexBudgets).where(eq(cerCapexBudgets.id, id))
  if (!existing) {
    return { success: false, message: 'Pagu anggaran tidak ditemukan.' }
  }

  if (Number(existing.usedAmount) > 0) {
    return {
      success: false,
      message: 'Pagu anggaran ini sudah memiliki transaksi pemakaian dan tidak dapat dihapus.',
    }
  }

  await db.delete(cerCapexBudgets).where(eq(cerCapexBudgets.id, id))
  revalidatePath('/dashboard/assets/budget-controller')
  revalidatePath('/dashboard/assets/cer')
  return { success: true, message: `Pagu anggaran ${existing.budgetCode} berhasil dihapus.` }
}
