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

export interface ImportCapexBudgetItem {
  fiscalYear: number
  budgetCode: string
  budgetName: string
  assetCategory?: string
  siteName?: string
  departmentName?: string
  allocatedAmount: number
  notes?: string
}

export interface ImportCapexBudgetResult {
  success: boolean
  message: string
  insertedCount: number
  updatedCount: number
  skippedCount: number
  warnings: string[]
}

const VALID_ASSET_CATEGORIES = [
  'IT Device',
  'Operational Equipment',
  'Vehicle / Alat Berat',
  'Tools & Workshop',
  'Office Facility',
  'Safety & Emergency',
  'Other',
]

export async function importCapexBudgetsAction(
  items: ImportCapexBudgetItem[]
): Promise<ImportCapexBudgetResult> {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return {
      success: false,
      message: 'Unauthorized: Sesi login tidak valid.',
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      warnings: ['Sesi login Anda tidak valid atau telah kedaluwarsa.'],
    }
  }

  const roleName = await getCurrentEmployeeAccessRole()
  const permission = await getCurrentMenuPermission('cer_budget_controller')
  const isSuperAdmin = isSuperAdminRole(roleName)
  const isFinance = Boolean(roleName && roleName.toLowerCase().includes('finance'))

  if (!isSuperAdmin && !isFinance && !permission.canEdit && !permission.canView) {
    return {
      success: false,
      message: 'Akses ditolak: Anda tidak memiliki izin untuk mengimpor data Budget Controller.',
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      warnings: ['Akses ditolak: Anda tidak memiliki wewenang untuk import Budget Controller.'],
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    return {
      success: false,
      message: 'Tidak ada baris data yang ditemukan untuk diimpor.',
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      warnings: ['File yang diunggah tidak memiliki baris data.'],
    }
  }

  // Pre-load sites and departments for fast case-insensitive lookup
  const [siteRows, deptRows] = await Promise.all([
    db.select({ id: sites.id, name: sites.name }).from(sites),
    db.select({ id: masterDepartments.id, name: masterDepartments.name }).from(masterDepartments),
  ])

  const siteMap = new Map<string, number>()
  for (const s of siteRows) {
    if (s.name) siteMap.set(s.name.trim().toLowerCase(), s.id)
  }

  const deptMap = new Map<string, number>()
  for (const d of deptRows) {
    if (d.name) deptMap.set(d.name.trim().toLowerCase(), d.id)
  }

  const now = new Date()
  let insertedCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const warnings: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const rowNum = i + 2 // 1-based index considering Excel header is row 1

    const rawBudgetCode = (item.budgetCode || '').trim().toUpperCase()
    const rawBudgetName = (item.budgetName || '').trim()
    const rawAllocatedAmount = Number(item.allocatedAmount)
    const rawFiscalYear = Number(item.fiscalYear) || now.getFullYear()

    if (!rawBudgetCode) {
      warnings.push(`Baris ${rowNum}: Kode Anggaran kosong, dilewati.`)
      skippedCount++
      continue
    }

    if (!rawBudgetName) {
      warnings.push(`Baris ${rowNum} (${rawBudgetCode}): Nama Anggaran kosong, dilewati.`)
      skippedCount++
      continue
    }

    if (!rawAllocatedAmount || isNaN(rawAllocatedAmount) || rawAllocatedAmount <= 0) {
      warnings.push(
        `Baris ${rowNum} (${rawBudgetCode}): Total Pagu harus lebih besar dari Rp 0, dilewati.`
      )
      skippedCount++
      continue
    }

    // Resolve Asset Category
    let resolvedCategory = 'IT Device'
    if (item.assetCategory) {
      const matchCat = VALID_ASSET_CATEGORIES.find(
        (c) => c.toLowerCase() === item.assetCategory?.trim().toLowerCase()
      )
      if (matchCat) {
        resolvedCategory = matchCat
      } else {
        // Fallback or closest match
        resolvedCategory = item.assetCategory.trim()
      }
    }

    // Resolve Site & Department
    let resolvedSiteId: number | null = null
    if (item.siteName?.trim()) {
      resolvedSiteId = siteMap.get(item.siteName.trim().toLowerCase()) ?? null
    }

    let resolvedDeptId: number | null = null
    if (item.departmentName?.trim()) {
      resolvedDeptId = deptMap.get(item.departmentName.trim().toLowerCase()) ?? null
    }

    const resolvedNotes = (item.notes || '').trim()

    // Check existing budget by budgetCode
    const [existing] = await db
      .select()
      .from(cerCapexBudgets)
      .where(eq(cerCapexBudgets.budgetCode, rawBudgetCode))
      .limit(1)

    if (existing) {
      // Existing row: Update / Upsert
      const usedAmountNum = Number(existing.usedAmount) || 0

      // Protection: allocatedAmount must not be less than usedAmount
      if (rawAllocatedAmount < usedAmountNum) {
        warnings.push(
          `Baris ${rowNum} (${rawBudgetCode}): Pagu baru (Rp ${rawAllocatedAmount.toLocaleString('id-ID')}) lebih kecil dari saldo yang sudah terpakai (Rp ${usedAmountNum.toLocaleString('id-ID')}), dilewati.`
        )
        skippedCount++
        continue
      }

      const newRemaining = rawAllocatedAmount - usedAmountNum

      await db
        .update(cerCapexBudgets)
        .set({
          fiscalYear: rawFiscalYear,
          siteId: resolvedSiteId,
          departmentId: resolvedDeptId,
          assetCategory: resolvedCategory,
          budgetName: rawBudgetName,
          allocatedAmount: String(rawAllocatedAmount),
          remainingAmount: String(newRemaining),
          notes: resolvedNotes || existing.notes,
          updatedAt: now,
        })
        .where(eq(cerCapexBudgets.id, existing.id))

      updatedCount++
    } else {
      // New row: Insert
      await db.insert(cerCapexBudgets).values({
        fiscalYear: rawFiscalYear,
        siteId: resolvedSiteId,
        departmentId: resolvedDeptId,
        assetCategory: resolvedCategory,
        budgetCode: rawBudgetCode,
        budgetName: rawBudgetName,
        allocatedAmount: String(rawAllocatedAmount),
        usedAmount: '0',
        remainingAmount: String(rawAllocatedAmount),
        notes: resolvedNotes,
        createdById: session.user.id,
        createdAt: now,
        updatedAt: now,
      })

      insertedCount++
    }
  }

  revalidatePath('/dashboard/assets/budget-controller')
  revalidatePath('/dashboard/assets/cer')

  const summaryParts: string[] = []
  if (insertedCount > 0) summaryParts.push(`${insertedCount} pagu baru ditambahkan`)
  if (updatedCount > 0) summaryParts.push(`${updatedCount} pagu diperbarui`)
  if (skippedCount > 0) summaryParts.push(`${skippedCount} baris dilewati`)

  const summaryMessage =
    summaryParts.length > 0
      ? `Proses import selesai: ${summaryParts.join(', ')}.`
      : 'Tidak ada perubahan data yang disimpan.'

  return {
    success: insertedCount > 0 || updatedCount > 0,
    message: summaryMessage,
    insertedCount,
    updatedCount,
    skippedCount,
    warnings,
  }
}

