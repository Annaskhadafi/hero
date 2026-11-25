'use server'

import { and, asc, desc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  cerRequests,
  cerItems,
  cerAttachments,
  cerCapexBudgets,
  cerCapexBudgetTransactions,
  cerBasts,
  cerNotificationConfigs,
  type CerRequest,
  type CerItem,
  type CerAttachment,
  type CerCapexBudget,
  type CerBast,
} from '@/db/schema/cer'
import {
  approvals,
  employees,
  masterDepartments,
  masterSections,
  sites,
} from '@/db/schema/hero'
import { centralServiceAssets } from '@/db/schema/central-service'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { isSuperAdminRole } from '@/lib/role-utils'
import { isSuperAdminUser } from './utils'
import { resolveApprovalRouteForActivity } from '@/lib/approval-engine'
import { isAssetTestingApprover, resolveAssetTestingApprover } from '@/lib/asset-testing-guard'
import {
  sendCerSubmittedEmail,
  sendCerRevisionRequestedEmail,
  sendCerResubmittedEmail,
  sendCerFullApprovedEmail,
  sendCerAssetReceivedEmail,
  sendCerBastCompletedEmail,
  sendCerRejectedEmail,
  getCerNotificationConfig,
  type CerNotificationConfigData,
} from '@/lib/cer-email'
import { generateCerPdf } from '@/lib/cer-pdf'
import { generateCerBastPdf } from '@/lib/cer-bast-pdf'
import { saveGeneratedPdfUpload } from '@/lib/save-pdf-upload'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { isS3UploadConfigured, uploadBufferToS3 } from '@/lib/s3-storage'

// Helper to save server-generated buffer to persistent uploads proxy
async function saveGeneratedPdf(buffer: Uint8Array, filenamePrefix: string): Promise<string> {
  const fileName = `${filenamePrefix}_${Date.now()}_${randomUUID().slice(0, 8)}.pdf`
  const key = `cer/${fileName}`

  if (isS3UploadConfigured()) {
    try {
      const res = await uploadBufferToS3(Buffer.from(buffer), key, 'application/pdf')
      if (res?.key) {
        return `/api/uploads/${res.key}`
      }
    } catch (err) {
      console.error('[cer] S3 upload error, falling back to local disk:', err)
    }
  }

  // Local fallback
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'cer')
  await mkdir(uploadDir, { recursive: true })
  const filePath = join(uploadDir, fileName)
  await writeFile(filePath, Buffer.from(buffer))
  return `/api/uploads/cer/${fileName}`
}

function formatIndoDate(val?: string | Date | null): string {
  if (!val) return '-'
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}



export type CerOverviewData = {
  requests: Array<
    CerRequest & {
      applicantName: string
      applicantEmail: string
      applicantJobTitle?: string | null
      applicantSn?: string | null
      departmentName: string
      sectionName: string
      siteName: string
      budgetName: string | null
      itemsCount: number
      bastsCount: number
      currentApproverJobTitle?: string | null
      kelompokAset?: string | null
      items?: any[]
      approvals: Array<{
        id: number
        level: number
        approverName: string
        approverEmployeeId?: number | null
        approverJobTitle?: string | null
        formName?: string | null
        status: string
        reviewedAt: Date | null
        decisionNote: string | null
      }>
    }
  >
  budgets: CerCapexBudget[]
  sites: Array<{ id: number; name: string }>
  departments: Array<{ id: number; name: string }>
  sections: Array<{ id: number; name: string; departmentId: number | null }>
  currentEmployee: {
    id: number
    name: string
    email: string
    employeeSn?: string | null
    jobTitle: string | null
    departmentId: number | null
    sectionId: number | null
    siteId: number | null
    accessRole?: string | null
  } | null
  isFinanceOrAdmin: boolean
  isSuperAdmin: boolean
  canAccessBudgetController: boolean
  canEditBudgetController: boolean
  canDeleteBudgetController: boolean
}

export async function getCerDashboardData(): Promise<CerOverviewData> {
  const session = await getServerSession()
  if (!session?.user?.email) {
    throw new Error('Unauthorized')
  }

  // Find logged in employee
  const [currentEmployee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      jobTitle: employees.jobTitle,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      siteId: employees.siteId,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(and(eq(employees.email, session.user.email), eq(employees.isActive, true)))
    .limit(1)

  // Check permission for Budget Controller via dynamic Role Management
  const budgetPermission = await getCurrentMenuPermission('cer_budget_controller')
  const canAccessBudgetController = Boolean(budgetPermission.canView)
  const canEditBudgetController = Boolean(budgetPermission.canEdit)
  const canDeleteBudgetController = Boolean(budgetPermission.canDelete)

  const isSuperAdmin = isSuperAdminUser(currentEmployee, session.user)
  const isFinanceOrAdmin = canAccessBudgetController || isSuperAdmin

  // Fetch all related master data
  const [siteRows, deptRows, secRows, requestRows] = await Promise.all([
    db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.isActive, true)),
    db
      .select({ id: masterDepartments.id, name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true)),
    db
      .select({
        id: masterSections.id,
        name: masterSections.name,
        departmentId: masterSections.departmentId,
      })
      .from(masterSections)
      .where(eq(masterSections.isActive, true)),
    db
      .select({
        request: cerRequests,
        applicantName: employees.name,
        applicantEmail: employees.email,
        applicantJobTitle: employees.jobTitle,
        applicantSn: employees.employeeSn,
        deptName: masterDepartments.name,
        secName: masterSections.name,
        siteName: sites.name,
        budgetName: cerCapexBudgets.budgetName,
      })
      .from(cerRequests)
      .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
      .leftJoin(masterDepartments, eq(cerRequests.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(cerRequests.sectionId, masterSections.id))
      .leftJoin(sites, eq(cerRequests.siteId, sites.id))
      .leftJoin(cerCapexBudgets, eq(cerRequests.capexBudgetId, cerCapexBudgets.id))
      .orderBy(desc(cerRequests.createdAt)),
  ])

  // Get approvals for all requests
  const cerIds = requestRows.map((r) => r.request.id)
  const approvalRows =
    cerIds.length > 0
      ? await db
          .select({
            id: approvals.id,
            cerRequestId: approvals.cerRequestId,
            level: approvals.level,
            approverName: approvals.approverName,
            approverEmployeeId: approvals.approverEmployeeId,
            approverJobTitle: employees.jobTitle,
            formName: approvals.formName,
            status: approvals.status,
            reviewedAt: approvals.reviewedAt,
            decisionNote: approvals.decisionNote,
          })
          .from(approvals)
          .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
          .where(inArray(approvals.cerRequestId, cerIds))
          .orderBy(asc(approvals.level))
      : []

  const approvalsMap = new Map<number, typeof approvalRows>()
  for (const a of approvalRows) {
    if (a.cerRequestId) {
      const list = approvalsMap.get(a.cerRequestId) || []
      list.push(a)
      approvalsMap.set(a.cerRequestId, list)
    }
  }

  // Fetch unit items for all requests
  const allItems =
    cerIds.length > 0
      ? await db
          .select()
          .from(cerItems)
          .where(inArray(cerItems.cerRequestId, cerIds))
          .orderBy(asc(cerItems.id))
      : []

  const itemsMap = new Map<number, typeof allItems>()
  for (const it of allItems) {
    if (it.cerRequestId) {
      const list = itemsMap.get(it.cerRequestId) || []
      list.push(it)
      itemsMap.set(it.cerRequestId, list)
    }
  }

  // Count items and BASTs
  const itemsCountRows =
    cerIds.length > 0
      ? await db
          .select({
            cerRequestId: cerItems.cerRequestId,
            count: sql<number>`count(*)::int`,
          })
          .from(cerItems)
          .where(inArray(cerItems.cerRequestId, cerIds))
          .groupBy(cerItems.cerRequestId)
      : []
  const itemsCountMap = new Map(itemsCountRows.map((r) => [r.cerRequestId, r.count]))

  const mappedRequests = requestRows.map((row) => {
    const reqApprovals = approvalsMap.get(row.request.id) || []
    const pendingApproval = reqApprovals.find((a) => a.status === 'Pending')
    const currentApproverJobTitle = pendingApproval?.approverJobTitle || null
    const reqItems = itemsMap.get(row.request.id) || []

    return {
      ...row.request,
      applicantName: row.applicantName || 'Unknown Employee',
      applicantEmail: row.applicantEmail || '',
      applicantJobTitle: row.applicantJobTitle || null,
      applicantSn: row.applicantSn || null,
      departmentName: row.deptName || '-',
      sectionName: row.secName || '-',
      siteName: row.siteName || '-',
      budgetName: row.budgetName,
      itemsCount: itemsCountMap.get(row.request.id) || reqItems.length,
      bastsCount: 0,
      currentApproverJobTitle,
      kelompokAset: row.request.kelompokAset || null,
      items: reqItems,
      approvals: reqApprovals,
    }
  })

  return {
    requests: mappedRequests,
    budgets: [],
    sites: siteRows,
    departments: deptRows,
    sections: secRows,
    currentEmployee,
    isFinanceOrAdmin,
    isSuperAdmin,
    canAccessBudgetController,
    canEditBudgetController,
    canDeleteBudgetController,
  }
}

/**
 * Filter CapEx budgets in real-time for Form Selection
 */
export async function getCapExBudgetsForSelection(params: {
  siteId?: number | null
  departmentId?: number | null
  assetCategory?: string | null
  fiscalYear?: number
}) {
  const currentYear = params.fiscalYear || new Date().getFullYear()

  const conditions = [
    eq(cerCapexBudgets.isActive, true),
    eq(cerCapexBudgets.fiscalYear, currentYear),
  ]

  if (params.siteId) {
    conditions.push(or(eq(cerCapexBudgets.siteId, params.siteId), sql`${cerCapexBudgets.siteId} IS NULL`)!)
  }
  if (params.departmentId) {
    conditions.push(
      or(eq(cerCapexBudgets.departmentId, params.departmentId), sql`${cerCapexBudgets.departmentId} IS NULL`)!
    )
  }
  if (params.assetCategory) {
    conditions.push(eq(cerCapexBudgets.assetCategory, params.assetCategory))
  }

  return await db
    .select()
    .from(cerCapexBudgets)
    .where(and(...conditions))
    .orderBy(asc(cerCapexBudgets.budgetName))
}

/**
 * Preview approval chain for Step 2
 */
export async function previewCerApprovalChain(params: {
  employeeId: number
  assetCategory: string
  siteId?: number | null
  departmentId?: number | null
  sectionId?: number | null
}) {
  const resolution = await resolveApprovalRouteForActivity({
    employeeId: params.employeeId,
    activityType: params.assetCategory,
    priority: 'Normal',
    overtimeMinutes: 0,
    transactionType: 'cer_request',
    siteId: params.siteId,
    departmentId: params.departmentId,
    sectionId: params.sectionId,
    assetCategory: params.assetCategory,
  })

  return resolution.steps
}

/**
 * Fetch all active employees for approver selection in CER Form Step 2
 */
export async function getActiveEmployeesForCerSelection() {
  return await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      department: employees.department,
      workLocation: employees.workLocation,
      siteId: employees.siteId,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.name))
}

/**
 * CREATE NEW CER REQUEST (Submit Final from Step 2)
 */
export async function createCerRequestAction(input: {
  subject: string
  dateRequired: string
  level?: string
  purchaseType: string
  budgetSource: string
  departmentId: number
  sectionId?: number | null
  siteId: number
  assetCategory: string
  purchasePurpose: string
  vendorName: string
  capexBudgetId?: number | null
  attachmentChecklist: string[]
  items: Array<{
    description: string
    qty: number
    pricePerUnit: number
    totalPrice: number
    allocation: string
    holderName: string
    holderEmployeeId?: number | null
    estimatedLifespan: string
  }>
  attachments?: Array<{
    fileName: string
    fileUrl: string
    fileType: string
    fileSize?: number
    mimeType?: string
  }>
  customApprovers?: Array<{
    stepOrder: number
    label: string
    approverName: string
    approverEmployeeId: number | null
  }>
  applicantSignatureUrl?: string | null
}) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Silakan login terlebih dahulu.' }
  }

  // Find applicant employee
  const [applicant] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      email: employees.email,
    })
    .from(employees)
    .where(and(eq(employees.email, session.user.email), eq(employees.isActive, true)))
    .limit(1)

  if (!applicant) {
    return {
      success: false,
      message: 'Profil karyawan tidak ditemukan untuk akun ini. Pastikan email terdaftar di User Management.',
    }
  }

  // Calculate total price
  const totalEstimatedPrice = input.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)

  // Check budget controller status
  let isUnbudgeted = input.budgetSource === 'Bukan Anggaran' || !input.capexBudgetId
  let isOverBudget = false

  if (input.capexBudgetId) {
    const [budget] = await db
      .select()
      .from(cerCapexBudgets)
      .where(eq(cerCapexBudgets.id, input.capexBudgetId))
    if (budget) {
      const remaining = Number(budget.remainingAmount)
      if (totalEstimatedPrice > remaining) {
        isOverBudget = true
      }
    }
  }

  // Generate unique CER Number: CER/CP/[SITE]/[MM]/[YYYY]/[SEQUENCE]
  const [site] = await db.select({ name: sites.name }).from(sites).where(eq(sites.id, input.siteId)).limit(1)
  const siteCode = (site?.name || 'SITE').split(' ')[0].toUpperCase()
  const now = new Date()
  const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()]
  const year = now.getFullYear()

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cerRequests)
    .where(sql`EXTRACT(YEAR FROM ${cerRequests.createdAt}) = ${year}`)
  let seqNum = (countResult?.count || 0) + 1
  let cerNumber = `CER/CP/${siteCode}/${monthRoman}/${year}/${String(seqNum).padStart(3, '0')}`
  let isNumberUnique = false
  while (!isNumberUnique) {
    const [existing] = await db
      .select({ id: cerRequests.id })
      .from(cerRequests)
      .where(eq(cerRequests.cerNumber, cerNumber))
      .limit(1)
    if (!existing) {
      isNumberUnique = true
    } else {
      seqNum++
      cerNumber = `CER/CP/${siteCode}/${monthRoman}/${year}/${String(seqNum).padStart(3, '0')}`
    }
  }

  // Resolve approval chain (use custom approvers if provided by user in Step 2)
  let steps: Array<{
    stepOrder: number
    label: string
    approverName: string
    approverEmployeeId: number | null
    resolutionSource?: string
  }> = []

  if (input.customApprovers && input.customApprovers.length > 0) {
    // Guardrail: Validate that mandatory steps are present
    // 1. Budget Validator (Amama Ira & Febrian Dani)
    // 2. Director (Hidayat Rahman)
    // 3. Asset Tagging (Syamsul Bahri / Evo Dwi)
    const hasAmama = input.customApprovers.some(
      (ca) =>
        (ca.approverName || '').toLowerCase().includes('amama') ||
        ca.approverEmployeeId === 1341
    )
    const hasFebrian = input.customApprovers.some(
      (ca) =>
        (ca.approverName || '').toLowerCase().includes('febrian') ||
        ca.approverEmployeeId === 960
    )
    const hasDirector = input.customApprovers.some(
      (ca) =>
        (ca.label || '').toLowerCase().includes('director') ||
        (ca.approverName || '').toLowerCase().includes('hidayat') ||
        ca.approverEmployeeId === 10
    )
    const hasAssetTagging = input.customApprovers.some(
      (ca) =>
        (ca.label || '').toLowerCase().includes('tagging') ||
        (ca.label || '').toLowerCase().includes('nomor aset') ||
        (ca.label || '').toLowerCase().includes('no.aset') ||
        (ca.label || '').toLowerCase().includes('kelompok aset') ||
        (ca.approverName || '').toLowerCase().includes('syamsul') ||
        (ca.approverName || '').toLowerCase().includes('evo') ||
        ca.approverEmployeeId === 990
    )

    if (!hasAmama || !hasFebrian || !hasDirector || !hasAssetTagging) {
      return {
        success: false,
        message:
          'Validasi Alur Approval: Tahapan wajib (Budget Validator Amama Ira & Febrian Dani, Director Hidayat Rahman, dan Asset Tagging) tidak boleh dihapus.',
      }
    }

    steps = input.customApprovers.map((ca, idx) => ({
      stepOrder: idx + 1,
      label: ca.label,
      approverName: ca.approverName,
      approverEmployeeId: ca.approverEmployeeId,
      resolutionSource: 'custom',
    }))
  } else {
    const approvalResolution = await resolveApprovalRouteForActivity({
      employeeId: applicant.id,
      activityType: input.assetCategory,
      priority: 'Normal',
      overtimeMinutes: 0,
      transactionType: 'cer_request',
      siteId: input.siteId,
      departmentId: input.departmentId,
      sectionId: input.sectionId,
      assetCategory: input.assetCategory,
    })
    steps = approvalResolution.steps
  }

  if (steps.length === 0) {
    return { success: false, message: 'Alur persetujuan (approval chain) tidak dapat ditentukan.' }
  }

  const step1 = steps[0]

  // Insert master CER request
  const [newRequest] = await db
    .insert(cerRequests)
    .values({
      cerNumber,
      subject: input.subject,
      applicantEmployeeId: applicant.id,
      dateRequired: input.dateRequired || null,
      level: input.level || 'Standard',
      purchaseType: input.purchaseType,
      budgetSource: input.budgetSource,
      departmentId: input.departmentId,
      sectionId: input.sectionId || null,
      siteId: input.siteId,
      assetCategory: input.assetCategory,
      purchasePurpose: input.purchasePurpose,
      vendorName: input.vendorName,
      totalEstimatedPrice: String(totalEstimatedPrice),
      capexBudgetId: input.capexBudgetId || null,
      attachmentChecklist: input.attachmentChecklist || [],
      status: 'in_review',
      currentStepOrder: 1,
      currentApproverTitle: step1.label,
      currentApproverName: step1.approverName,
      currentApproverEmployeeId: step1.approverEmployeeId,
      isUnbudgeted,
      isOverBudget,
      applicantSignatureUrl: input.applicantSignatureUrl || null,
      createdById: session.user.id,
    })
    .returning()

  // Insert items
  if (input.items && input.items.length > 0) {
    await db.insert(cerItems).values(
      input.items.map((item) => ({
        cerRequestId: newRequest.id,
        description: item.description,
        qty: item.qty || 1,
        pricePerUnit: String(item.pricePerUnit || 0),
        totalPrice: String(item.totalPrice || 0),
        allocation: item.allocation || '',
        holderName: item.holderName || '',
        holderEmployeeId: item.holderEmployeeId || null,
        estimatedLifespan: item.estimatedLifespan || '',
      }))
    )
  }

  // Insert attachments
  if (input.attachments && input.attachments.length > 0) {
    await db.insert(cerAttachments).values(
      input.attachments.map((att) => ({
        cerRequestId: newRequest.id,
        fileType: att.fileType || 'attachment',
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize || 0,
        mimeType: att.mimeType || 'application/octet-stream',
      }))
    )
  }

  // Create approval rows in hero_approvals
  for (const s of steps) {
    const resolvedS = await resolveAssetTestingApprover({
      approverEmployeeId: s.approverEmployeeId,
      approverName: s.approverName,
      approverJobTitle: s.label,
    })

    await db.insert(approvals).values({
      cerRequestId: newRequest.id,
      level: s.stepOrder,
      approverName: resolvedS.approverName || s.approverName,
      approverEmployeeId: resolvedS.approverEmployeeId,
      status: s.stepOrder === 1 ? 'Pending' : 'Draft',
      submittedAt: now,
      decisionNote: s.label,
      resolutionSource: 'matrix',
      routeSnapshot: JSON.stringify(s),
    })
  }

  // Commit CapEx budget if linked
  if (input.capexBudgetId) {
    const [budget] = await db
      .select()
      .from(cerCapexBudgets)
      .where(eq(cerCapexBudgets.id, input.capexBudgetId))
    if (budget) {
      const prevRem = Number(budget.remainingAmount)
      const newUsed = Number(budget.usedAmount) + totalEstimatedPrice
      const newRem = Number(budget.allocatedAmount) - newUsed

      await db
        .update(cerCapexBudgets)
        .set({
          usedAmount: String(newUsed),
          remainingAmount: String(newRem),
          updatedAt: now,
        })
        .where(eq(cerCapexBudgets.id, budget.id))

      await db.insert(cerCapexBudgetTransactions).values({
        budgetId: budget.id,
        cerRequestId: newRequest.id,
        transactionType: 'commitment',
        amount: String(totalEstimatedPrice),
        previousRemaining: String(prevRem),
        newRemaining: String(newRem),
        description: `Komitmen pengajuan CER ${cerNumber} (${input.subject})`,
        createdById: session.user.id,
      })
    }
  }

  // Send Notification to Step 1 Approver
  if (step1.approverEmployeeId) {
    const [appEmp] = await db
      .select({ email: employees.email, name: employees.name, jobTitle: employees.jobTitle })
      .from(employees)
      .where(eq(employees.id, step1.approverEmployeeId))
    if (appEmp?.email) {
      const [dept] = await db
        .select({ name: masterDepartments.name })
        .from(masterDepartments)
        .where(eq(masterDepartments.id, input.departmentId))

      let budgetCode = ''
      let budgetName = ''
      if (input.capexBudgetId) {
        const [b] = await db.select().from(cerCapexBudgets).where(eq(cerCapexBudgets.id, input.capexBudgetId))
        if (b) {
          budgetCode = b.budgetCode
          budgetName = b.budgetName
        }
      }

      const approverJobTitle = appEmp.jobTitle || step1.label || 'Approver'
      const isStep1Director =
        Boolean(approverJobTitle && approverJobTitle.toLowerCase().includes('director')) ||
        Boolean(step1.approverName && step1.approverName.toLowerCase().includes('director')) ||
        step1.approverEmployeeId === 10

      await sendCerSubmittedEmail({
        approverEmail: appEmp.email,
        approverName: appEmp.name,
        approverJobTitle,
        cerNumber,
        subject: input.subject,
        applicantName: applicant.name,
        applicantSn: applicant.employeeSn,
        applicantJobTitle: applicant.jobTitle,
        siteName: site?.name || 'Site',
        departmentName: dept?.name || 'Department',
        assetCategory: input.assetCategory,
        purchaseType: input.purchaseType,
        dateRequired: input.dateRequired,
        vendorName: input.vendorName,
        budgetSource: input.budgetSource,
        budgetCode,
        budgetName,
        purchasePurpose: input.purchasePurpose,
        items: input.items,
        totalEstimatedPrice,
        approvalStep: approverJobTitle,
        cc: isStep1Director ? ['freshya.ochtovita@chitraparatama.co.id'] : undefined,
      }).catch((err) => console.error('[cer] Send email error:', err))
    }
  }

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/approval')
  revalidatePath('/dashboard/assets/budget-controller')

  return {
    success: true,
    message: `Permohonan CER ${cerNumber} berhasil diajukan dan diteruskan ke ${step1.approverName}.`,
    cerNumber,
    cerId: newRequest.id,
  }
}

/**
 * APPROVE CER STEP
 */
export async function approveCerStepAction(approvalId: number, decisionNote?: string, signatureUrl?: string) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  const [currentApproval] = await db.select().from(approvals).where(eq(approvals.id, approvalId))
  if (!currentApproval || !currentApproval.cerRequestId) {
    return { success: false, message: 'Approval step tidak ditemukan.' }
  }

  const cerId = currentApproval.cerRequestId
  const now = new Date()

  // Check if session user is authorized (Super Admin, assigned Approver, or Freshya acting on behalf of Director)
  const [sessionEmp] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  const isSuperAdmin = isSuperAdminUser(sessionEmp, session.user)
  const isApprover =
    sessionEmp &&
    (currentApproval.approverEmployeeId === sessionEmp.id ||
      (currentApproval.approverName && sessionEmp.name && currentApproval.approverName.toLowerCase().includes(sessionEmp.name.toLowerCase())))

  const isFreshya =
    sessionEmp?.id === 974 || session.user.email.toLowerCase().includes('freshya')

  const isCurrentDirectorStep =
    Boolean(currentApproval.decisionNote && currentApproval.decisionNote.toLowerCase().includes('director')) ||
    Boolean(currentApproval.approverName && currentApproval.approverName.toLowerCase().includes('director')) ||
    currentApproval.approverEmployeeId === 10

  // Evo Dwi (id: 1006) co-access with Syamsul Bahri (id: 990) for Asset Tagging step
  const isEvoDwi =
    sessionEmp?.id === 1006 || session.user.email.toLowerCase().includes('evo')

  const isAssetTaggingStep =
    Boolean(currentApproval.decisionNote && (currentApproval.decisionNote.toLowerCase().includes('tagging') || currentApproval.decisionNote.toLowerCase().includes('nomor aset'))) ||
    currentApproval.approverEmployeeId === 990 ||
    Boolean(currentApproval.approverName && currentApproval.approverName.toLowerCase().includes('syamsul'))

  const isTestingApprover = await isAssetTestingApprover(sessionEmp?.id)

  if (!isSuperAdmin && !isApprover && !(isFreshya && isCurrentDirectorStep) && !(isEvoDwi && isAssetTaggingStep) && !isTestingApprover) {
    return {
      success: false,
      message: 'Akses ditolak: Anda tidak memiliki wewenang untuk menyetujui tahapan pengajuan CER ini.',
    }
  }

  let finalDecisionNote = decisionNote || 'Disetujui'
  if (isFreshya && isCurrentDirectorStep) {
    finalDecisionNote = decisionNote
      ? `${decisionNote} (Disetujui oleh Freshya Ochtovita - Board Secretary a.n. Director)`
      : 'Disetujui oleh Freshya Ochtovita (Board Secretary a.n. Director)'
  } else if (isEvoDwi && isAssetTaggingStep && !isApprover) {
    finalDecisionNote = decisionNote
      ? `${decisionNote} (Disetujui oleh Evo Dwi Yulianti - Co-Approval Asset Tagging a.n. Syamsul Bahri)`
      : 'Disetujui oleh Evo Dwi Yulianti (Co-Approval Asset Tagging a.n. Syamsul Bahri)'
  }

  // Mark current approval step Approved & save signature
  await db
    .update(approvals)
    .set({
      status: 'Approved',
      reviewedAt: now,
      decisionNote: finalDecisionNote,
      signatureUrl: signatureUrl || undefined,
    })
    .where(eq(approvals.id, approvalId))

  // Find all steps for this CER
  const allSteps = await db
    .select()
    .from(approvals)
    .where(eq(approvals.cerRequestId, cerId))
    .orderBy(asc(approvals.level))

  // 1. Check if other sibling parallel steps at the same level are still pending
  const siblingPending = allSteps.filter(
    (s) => s.level === currentApproval.level && s.id !== approvalId && s.status !== 'Approved'
  )

  if (siblingPending.length > 0) {
    const pendingNames = siblingPending.map((s) => s.approverName).join(', ')
    await db
      .update(cerRequests)
      .set({
        currentApproverTitle: `Validasi Paralel (Menunggu ${pendingNames})`,
        updatedAt: now,
      })
      .where(eq(cerRequests.id, cerId))

    revalidatePath('/dashboard/assets/cer')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Persetujuan dicatat. Menunggu persetujuan paralel dari ${pendingNames}.`,
    }
  }

  // 2. All approvals at current level are Approved. Check for next level
  const nextSteps = allSteps.filter((s) => s.level === currentApproval.level + 1)

  const [request] = await db
    .select({
      req: cerRequests,
      applicantName: employees.name,
      applicantEmail: employees.email,
      siteName: sites.name,
    })
    .from(cerRequests)
    .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
    .leftJoin(sites, eq(cerRequests.siteId, sites.id))
    .where(eq(cerRequests.id, cerId))

  if (!request) {
    return { success: false, message: 'CER data tidak ditemukan.' }
  }

  // Fetch items, budget, and applicant details for rich email notification
  const items = await db
    .select()
    .from(cerItems)
    .where(eq(cerItems.cerRequestId, cerId))
    .orderBy(asc(cerItems.id))

  let budgetCode = ''
  let budgetName = ''
  if (request.req.capexBudgetId) {
    const [b] = await db
      .select()
      .from(cerCapexBudgets)
      .where(eq(cerCapexBudgets.id, request.req.capexBudgetId))
    if (b) {
      budgetCode = b.budgetCode
      budgetName = b.budgetName
    }
  }

  const [applicantEmp] = await db
    .select({
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      department: employees.department,
    })
    .from(employees)
    .where(eq(employees.id, request.req.applicantEmployeeId))
    .limit(1)

  if (nextSteps.length > 0) {
    // Advance to next level
    for (const ns of nextSteps) {
      await db
        .update(approvals)
        .set({ status: 'Pending', submittedAt: now })
        .where(eq(approvals.id, ns.id))

      if (ns.approverEmployeeId) {
        const [nextEmp] = await db
          .select({ email: employees.email, name: employees.name, jobTitle: employees.jobTitle })
          .from(employees)
          .where(eq(employees.id, ns.approverEmployeeId))
        if (nextEmp?.email) {
          const approverJobTitle = nextEmp.jobTitle || ns.decisionNote || `Tahap ${ns.level}`
          const isNextDirectorStep =
            Boolean(approverJobTitle && approverJobTitle.toLowerCase().includes('director')) ||
            Boolean(ns.approverName && ns.approverName.toLowerCase().includes('director')) ||
            ns.approverEmployeeId === 10

          await sendCerSubmittedEmail({
            approverEmail: nextEmp.email,
            approverName: nextEmp.name,
            approverJobTitle,
            cerNumber: request.req.cerNumber,
            subject: request.req.subject,
            applicantName: request.applicantName || 'Pemohon',
            applicantSn: applicantEmp?.employeeSn,
            applicantJobTitle: applicantEmp?.jobTitle,
            siteName: request.siteName || 'Site',
            departmentName: applicantEmp?.department || 'Central Services',
            assetCategory: request.req.assetCategory,
            purchaseType: request.req.purchaseType,
            dateRequired: request.req.dateRequired,
            vendorName: request.req.vendorName,
            budgetSource: request.req.budgetSource,
            budgetCode,
            budgetName,
            purchasePurpose: request.req.purchasePurpose,
            items: items.map((it) => ({
              description: it.description,
              qty: it.qty,
              pricePerUnit: it.pricePerUnit,
              totalPrice: it.totalPrice,
              allocation: it.allocation,
              holderName: it.holderName,
            })),
            totalEstimatedPrice: request.req.totalEstimatedPrice,
            approvalStep: approverJobTitle,
            cc: isNextDirectorStep ? ['freshya.ochtovita@chitraparatama.co.id'] : undefined,
          }).catch((err) => console.error('[cer] Next approver email error:', err))
        }
      }
    }

    const nextTitles = nextSteps.map((s) => s.decisionNote || s.approverName).join(' & ')
    const nextNames = nextSteps.map((s) => s.approverName).join(' & ')

    await db
      .update(cerRequests)
      .set({
        currentStepOrder: nextSteps[0].level,
        currentApproverTitle: nextTitles,
        currentApproverName: nextNames,
        currentApproverEmployeeId: nextSteps[0].approverEmployeeId,
        updatedAt: now,
      })
      .where(eq(cerRequests.id, cerId))

    revalidatePath('/dashboard/assets/cer')
    revalidatePath('/dashboard/approval')

    return { success: true, message: `Disetujui. Berkas diteruskan ke ${nextNames}.` }
  } else {
    // 3. All approvals up to Director complete!
    // Transition to Checked by Finance (Syamsul Bahri & Evo Dwi) to input Kelompok Aset & Nomor Aset
    const [syamsul] = await db
      .select({ id: employees.id, name: employees.name, email: employees.email, jobTitle: employees.jobTitle })
      .from(employees)
      .where(eq(employees.id, 990))

    const [evo] = await db
      .select({ id: employees.id, name: employees.name, email: employees.email, jobTitle: employees.jobTitle })
      .from(employees)
      .where(eq(employees.id, 1006))

    await db
      .update(cerRequests)
      .set({
        status: 'pending_finance_check',
        currentStepOrder: currentApproval.level + 1,
        currentApproverTitle: 'Checked by Finance (Input Kelompok & Nomor Aset)',
        currentApproverName: 'Syamsul Bahri / Evo Dwi',
        currentApproverEmployeeId: 990,
        updatedAt: now,
      })
      .where(eq(cerRequests.id, cerId))

    const financeRecipients = [
      { email: syamsul?.email, name: syamsul?.name || 'Syamsul Bahri', jobTitle: syamsul?.jobTitle || 'Finance Controller' },
      { email: evo?.email, name: evo?.name || 'Evo Dwi', jobTitle: evo?.jobTitle || 'Finance Controller' },
    ].filter((f) => f.email)

    for (const fin of financeRecipients) {
      if (fin.email) {
        await sendCerSubmittedEmail({
          approverEmail: fin.email,
          approverName: fin.name,
          approverJobTitle: fin.jobTitle,
          cerNumber: request.req.cerNumber,
          subject: request.req.subject,
          applicantName: request.applicantName || 'Pemohon',
          applicantSn: applicantEmp?.employeeSn,
          applicantJobTitle: applicantEmp?.jobTitle,
          siteName: request.siteName || 'Site',
          departmentName: applicantEmp?.department || 'Central Services',
          assetCategory: request.req.assetCategory,
          purchaseType: request.req.purchaseType,
          dateRequired: request.req.dateRequired,
          vendorName: request.req.vendorName,
          budgetSource: request.req.budgetSource,
          budgetCode,
          budgetName,
          purchasePurpose: request.req.purchasePurpose,
          items: items.map((it) => ({
            description: it.description,
            qty: it.qty,
            pricePerUnit: it.pricePerUnit,
            totalPrice: it.totalPrice,
            allocation: it.allocation,
            holderName: it.holderName,
          })),
          totalEstimatedPrice: request.req.totalEstimatedPrice,
          approvalStep: fin.jobTitle,
        }).catch((err) => console.error('[cer] Finance check email error:', err))
      }
    }

    revalidatePath('/dashboard/assets/cer')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: 'Persetujuan Direksi selesai. Berkas dialihkan ke Finance (Syamsul Bahri & Evo Dwi) untuk penginputan Kelompok Aset & Nomor Aset.',
    }
  }
}

/**
 * REJECT CER STEP (Tolak Pengajuan)
 * CapEx budget komitmen otomatis di-release kembali ke saldo.
 */
export async function rejectCerStepAction(approvalId: number, rejectReason: string) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  if (!rejectReason || rejectReason.trim().length === 0) {
    return { success: false, message: 'Alasan penolakan wajib diisi.' }
  }

  const [currentApproval] = await db.select().from(approvals).where(eq(approvals.id, approvalId))
  if (!currentApproval || !currentApproval.cerRequestId) {
    return { success: false, message: 'Approval step tidak ditemukan.' }
  }

  // Authorization check (Super Admin or assigned Approver)
  const [sessionEmp] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  const isSuperAdmin = isSuperAdminUser(sessionEmp, session.user)
  const isApprover =
    sessionEmp &&
    (currentApproval.approverEmployeeId === sessionEmp.id ||
      (currentApproval.approverName && sessionEmp.name && currentApproval.approverName.toLowerCase().includes(sessionEmp.name.toLowerCase())))

  const isFreshya =
    sessionEmp?.id === 974 || session.user.email.toLowerCase().includes('freshya')

  const isCurrentDirectorStep =
    Boolean(currentApproval.decisionNote && currentApproval.decisionNote.toLowerCase().includes('director')) ||
    Boolean(currentApproval.approverName && currentApproval.approverName.toLowerCase().includes('director')) ||
    currentApproval.approverEmployeeId === 10

  // Evo Dwi (id: 1006) co-access with Syamsul Bahri (id: 990) for Asset Tagging step
  const isEvoDwi =
    sessionEmp?.id === 1006 || session.user.email.toLowerCase().includes('evo')

  const isAssetTaggingStep =
    Boolean(currentApproval.decisionNote && (currentApproval.decisionNote.toLowerCase().includes('tagging') || currentApproval.decisionNote.toLowerCase().includes('nomor aset'))) ||
    currentApproval.approverEmployeeId === 990 ||
    Boolean(currentApproval.approverName && currentApproval.approverName.toLowerCase().includes('syamsul'))

  if (!isSuperAdmin && !isApprover && !(isFreshya && isCurrentDirectorStep) && !(isEvoDwi && isAssetTaggingStep)) {
    return {
      success: false,
      message: 'Akses ditolak: Anda tidak memiliki wewenang untuk menolak pengajuan CER ini.',
    }
  }

  const cerId = currentApproval.cerRequestId
  const now = new Date()

  let finalRejectionNote = `Ditolak: ${rejectReason}`
  if (isFreshya && isCurrentDirectorStep && !isApprover) {
    finalRejectionNote = `Ditolak oleh Freshya Ochtovita (Board Secretary a.n. Director): ${rejectReason}`
  } else if (isEvoDwi && isAssetTaggingStep && !isApprover) {
    finalRejectionNote = `Ditolak oleh Evo Dwi Yulianti (Co-Approval Asset Tagging a.n. Syamsul Bahri): ${rejectReason}`
  }

  // Mark current approval step Rejected
  await db
    .update(approvals)
    .set({
      status: 'Rejected',
      reviewedAt: now,
      rejectionReason: rejectReason,
      decisionNote: finalRejectionNote,
    })
    .where(eq(approvals.id, approvalId))

  // Find CER Request
  const [request] = await db
    .select({
      req: cerRequests,
      applicantName: employees.name,
      applicantEmail: employees.email,
    })
    .from(cerRequests)
    .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
    .where(eq(cerRequests.id, cerId))

  if (!request) {
    return { success: false, message: 'Data CER tidak ditemukan.' }
  }

  // Update CER status to rejected
  await db
    .update(cerRequests)
    .set({
      status: 'rejected',
      updatedAt: now,
    })
    .where(eq(cerRequests.id, cerId))

  // Release CapEx budget if committed
  if (request.req.capexBudgetId) {
    const totalAmount = Number(request.req.totalEstimatedPrice || 0)
    const [budget] = await db
      .select()
      .from(cerCapexBudgets)
      .where(eq(cerCapexBudgets.id, request.req.capexBudgetId))

    if (budget && totalAmount > 0) {
      const prevRem = Number(budget.remainingAmount)
      const newUsed = Math.max(0, Number(budget.usedAmount) - totalAmount)
      const newRem = Number(budget.allocatedAmount) - newUsed

      await db
        .update(cerCapexBudgets)
        .set({
          usedAmount: String(newUsed),
          remainingAmount: String(newRem),
          updatedAt: now,
        })
        .where(eq(cerCapexBudgets.id, budget.id))

      await db.insert(cerCapexBudgetTransactions).values({
        budgetId: budget.id,
        cerRequestId: cerId,
        transactionType: 'release',
        amount: String(totalAmount),
        previousRemaining: String(prevRem),
        newRemaining: String(newRem),
        description: `Pengembalian anggaran CER ${request.req.cerNumber} karena ditolak: ${rejectReason}`,
        createdById: session.user.id,
      })
    }
  }

  // Send Rejection Notification to applicant
  if (request.applicantEmail) {
    await sendCerRejectedEmail({
      applicantEmail: request.applicantEmail,
      applicantName: request.applicantName || 'Pemohon',
      cerNumber: request.req.cerNumber,
      subject: request.req.subject,
      rejectedByName: currentApproval.approverName,
      rejectReason,
      cerId,
    }).catch((err) => console.error('[cer] Reject email error:', err))
  }

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/approval')
  revalidatePath('/dashboard/assets/budget-controller')

  return {
    success: true,
    message: `Permohonan CER ${request.req.cerNumber} telah ditolak. Saldo anggaran telah dikembalikan.`,
  }
}

/**
 * DELETE CER REQUEST ACTION
 * Menghapus formulir pengajuan CER yang salah / dibatalkan.
 * Dapat dilakukan oleh:
 * 1. Super Admin / Tim Finance (kapan saja)
 * 2. Staf Pemohon (jika pengajuan belum serah terima / completed)
 * Otomatis membebaskan alokasi pagu belanja di Budget Controller jika ada.
 */
export async function deleteCerRequestAction(cerId: number) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  const [currentEmp] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  const [request] = await db
    .select()
    .from(cerRequests)
    .where(eq(cerRequests.id, cerId))
    .limit(1)

  if (!request) {
    return { success: false, message: 'Pengajuan CER tidak ditemukan.' }
  }

  const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)
  const isApplicant = currentEmp && request.applicantEmployeeId === currentEmp.id

  if (!isSuperAdmin && !isApplicant) {
    return {
      success: false,
      message: 'Akses ditolak: Hanya pemohon (pengaju) atau Super Admin (Gilang & Annas) yang berwenang menghapus pengajuan CER ini.',
    }
  }

  if (!isSuperAdmin && (request.status === 'completed' || request.status === 'received')) {
    return {
      success: false,
      message: 'Pengajuan CER yang sudah dalam tahap serah terima atau selesai tidak dapat dihapus oleh pemohon.',
    }
  }

  const now = new Date()

  // 1. If budget was committed and request is not rejected yet, release the budget in budget controller
  if (request.capexBudgetId && request.status !== 'rejected') {
    const totalAmount = Number(request.totalEstimatedPrice || 0)
    const [budget] = await db
      .select()
      .from(cerCapexBudgets)
      .where(eq(cerCapexBudgets.id, request.capexBudgetId))

    if (budget && totalAmount > 0) {
      const prevRem = Number(budget.remainingAmount)
      const newUsed = Math.max(0, Number(budget.usedAmount) - totalAmount)
      const newRem = Number(budget.allocatedAmount) - newUsed

      await db
        .update(cerCapexBudgets)
        .set({
          usedAmount: String(newUsed),
          remainingAmount: String(newRem),
          updatedAt: now,
        })
        .where(eq(cerCapexBudgets.id, budget.id))
    }
  }

  // 2. Delete child records
  await db.delete(approvals).where(eq(approvals.cerRequestId, cerId))
  await db.delete(cerCapexBudgetTransactions).where(eq(cerCapexBudgetTransactions.cerRequestId, cerId))
  await db.delete(cerItems).where(eq(cerItems.cerRequestId, cerId))
  await db.delete(cerAttachments).where(eq(cerAttachments.cerRequestId, cerId))
  await db.delete(cerBasts).where(eq(cerBasts.cerRequestId, cerId))

  // 3. Delete request itself
  await db.delete(cerRequests).where(eq(cerRequests.id, cerId))

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/assets/budget-controller')
  revalidatePath('/dashboard/approval')

  return {
    success: true,
    message: `Permohonan CER ${request.cerNumber} berhasil dihapus dan pagu anggaran telah dibebaskan kembali.`,
  }
}

/**
 * Ambil daftar kategori / kelompok aset yang pernah diinput sebelumnya (dinamis dari database).
 */
export async function getExistingAssetCategoriesAction(): Promise<string[]> {
  try {
    const fromRequests = await db
      .selectDistinct({ val: cerRequests.kelompokAset })
      .from(cerRequests)
      .where(isNotNull(cerRequests.kelompokAset))

    const fromItems = await db
      .selectDistinct({ val: cerItems.assetGroup })
      .from(cerItems)
      .where(isNotNull(cerItems.assetGroup))

    const set = new Set<string>()
    for (const r of fromRequests) {
      const v = (r.val || '').trim()
      if (v) set.add(v)
    }
    for (const i of fromItems) {
      const v = (i.val || '').trim()
      if (v) set.add(v)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'))
  } catch (err) {
    console.error('[getExistingAssetCategoriesAction] Error:', err)
    return []
  }
}

/**
 * SUBMIT FINANCE CHECK (Checked by Finance - Syamsul Bahri / Finance Team)
 * Penginputan Kelompok Aset & Nomor Aset per unit setelah selesai approval Direksi.
 * Menghasilkan PDF resmi final dan mengubah status ke full_approved.
 */
export async function submitFinanceCheckCerAction(input: {
  cerId: number
  kelompokAset: string
  items: Array<{ id: number; assetNumber: string }>
  notes?: string
}) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  if (!input.kelompokAset || input.kelompokAset.trim().length === 0) {
    return { success: false, message: 'Kelompok Aset wajib diisi.' }
  }

  const missingAssetNum = input.items.some((it) => !it.assetNumber || it.assetNumber.trim().length === 0)
  if (missingAssetNum) {
    return { success: false, message: 'Nomor Aset untuk seluruh unit wajib diisi lengkap.' }
  }

  const [request] = await db
    .select({
      req: cerRequests,
      applicantName: employees.name,
      applicantEmail: employees.email,
      siteName: sites.name,
    })
    .from(cerRequests)
    .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
    .leftJoin(sites, eq(cerRequests.siteId, sites.id))
    .where(eq(cerRequests.id, input.cerId))

  if (!request) {
    return { success: false, message: 'Pengajuan CER tidak ditemukan.' }
  }

  const now = new Date()

  // Get current user employee id
  const [currentEmp] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  // Authorization check (Syamsul Bahri ID 990, Evo Dwi ID 1006, or Admin)
  const isSyamsul = currentEmp?.id === 990 || session.user.email.toLowerCase().includes('syamsul.bahri')
  const isEvoDwi = currentEmp?.id === 1006 || session.user.email.toLowerCase().includes('evo.yulianti')
  const isAdmin =
    currentEmp?.accessRole?.toLowerCase().includes('admin') ||
    (session.user as any)?.role?.toLowerCase().includes('admin') ||
    currentEmp?.id === 5 ||
    session.user.email.toLowerCase().includes('khadafi') ||
    session.user.email.toLowerCase().includes('gilang')

  if (!isSyamsul && !isEvoDwi && !isAdmin) {
    return {
      success: false,
      message: 'Hanya Finance (Syamsul Bahri / Evo Dwi) atau Administrator yang berwenang menginputkan Nomor Aset.',
    }
  }

  const financeCheckerId = isEvoDwi ? 1006 : (isSyamsul ? 990 : (currentEmp?.id ?? 990))
  const financeCheckerName = isEvoDwi
    ? (currentEmp?.name || 'Evo Dwi Yulianti')
    : (currentEmp?.name || 'Syamsul Bahri')

  // 1. Update items with asset numbers & group
  for (const it of input.items) {
    await db
      .update(cerItems)
      .set({
        assetNumber: it.assetNumber.trim(),
        assetGroup: input.kelompokAset.trim(),
        updatedAt: now,
      })
      .where(eq(cerItems.id, it.id))
  }

  // 2. Fetch updated items
  const updatedItems = await db.select().from(cerItems).where(eq(cerItems.cerRequestId, input.cerId))

  // 3. Fetch all approval history with approver job title
  const allApprovals = await db
    .select({
      id: approvals.id,
      level: approvals.level,
      status: approvals.status,
      approverName: approvals.approverName,
      jobTitle: employees.jobTitle,
      decisionNote: approvals.decisionNote,
      signatureUrl: approvals.signatureUrl,
      reviewedAt: approvals.reviewedAt,
    })
    .from(approvals)
    .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
    .where(eq(approvals.cerRequestId, input.cerId))
    .orderBy(asc(approvals.level))

  const pdfApprovals = allApprovals.map((s) => ({
    stepOrder: s.level,
    label: s.decisionNote || `Tahap ${s.level}`,
    approverName: s.approverName,
    jobTitle: s.jobTitle || 'Approver',
    status: s.status,
    signatureUrl: s.signatureUrl,
    reviewedAt: s.reviewedAt || now,
    decisionNote: s.decisionNote,
  }))

  pdfApprovals.push({
    stepOrder: pdfApprovals.length + 1,
    label: 'Checked by Finance (Input Kelompok & Nomor Aset)',
    approverName: financeCheckerName,
    jobTitle: isEvoDwi ? 'Finance Specialist' : 'Finance Specialist',
    status: 'Approved',
    reviewedAt: now,
    signatureUrl: null,
    decisionNote: null,
  })

  // 4. Generate Official CER Document PDF
  const pdfBuffer = await generateCerPdf({
    cerNumber: request.req.cerNumber,
    subject: request.req.subject,
    applicantName: request.applicantName || 'Pemohon',
    siteName: request.siteName || 'Site',
    departmentName: 'Central Services',
    level: request.req.level,
    purchaseType: request.req.purchaseType,
    budgetSource: request.req.budgetSource,
    assetCategory: request.req.assetCategory,
    purchasePurpose: request.req.purchasePurpose,
    vendorName: request.req.vendorName,
    totalEstimatedPrice: request.req.totalEstimatedPrice,
    dateRequired: request.req.dateRequired,
    createdAt: request.req.createdAt,
    approvedAt: now,
    kelompokAset: input.kelompokAset.trim(),
    financeCheckedAt: now,
    financeCheckedByName: financeCheckerName,
    items: updatedItems.map((it) => ({
      description: it.description,
      qty: it.qty,
      pricePerUnit: it.pricePerUnit,
      totalPrice: it.totalPrice,
      allocation: it.allocation,
      holderName: it.holderName,
      estimatedLifespan: it.estimatedLifespan,
      assetNumber: it.assetNumber,
    })),
    approvals: pdfApprovals,
  })

  // 5. Save PDF
  const pdfUrl = await saveGeneratedPdf(pdfBuffer, request.req.cerNumber.replace(/\//g, '_'))

  // 6. Update CER Request to full_approved
  await db
    .update(cerRequests)
    .set({
      kelompokAset: input.kelompokAset.trim(),
      financeCheckedAt: now,
      financeCheckedByEmployeeId: financeCheckerId,
      financeCheckNotes: input.notes || null,
      status: 'full_approved',
      currentApproverTitle: 'Disetujui Penuh & Diregistrasi',
      currentApproverName: financeCheckerName,
      approvedAt: now,
      pdfUrl,
      updatedAt: now,
    })
    .where(eq(cerRequests.id, input.cerId))

  // Update pending approval in hero_approvals to approved
  await db
    .update(approvals)
    .set({
      status: 'approved',
      reviewedAt: now,
      decisionNote: input.notes ? `Tagging: ${input.notes}` : 'Asset Tagged & Registered',
      approverName: financeCheckerName,
      approverEmployeeId: financeCheckerId,
      updatedAt: now,
    })
    .where(
      and(
        eq(approvals.cerRequestId, input.cerId),
        eq(approvals.status, 'pending')
      )
    )

  // 7. Send Full Approved Email & In-App Notification (to Applicant & Procurement: Sofyan, Nico, Rajab)
  const effectiveApplicantEmail = request.applicantEmail || 'applicant@chitraparatama.co.id'
  void sendCerFullApprovedEmail({
    applicantEmail: effectiveApplicantEmail,
    applicantName: request.applicantName || 'Pemohon',
    cerNumber: request.req.cerNumber,
    subject: request.req.subject,
    siteId: request.req.siteId,
    siteName: request.siteName || 'Site',
    totalEstimatedPrice: request.req.totalEstimatedPrice,
    vendorName: request.req.vendorName,
    pdfBuffer,
    pdfUrl,
    cerId: input.cerId,
  }).catch((err) => console.error('[cer] Full approved email error:', err))

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/approval')

  return {
    success: true,
    message: `Penginputan Kelompok Aset & Nomor Aset berhasil. Dokumen resmi CER ${request.req.cerNumber} telah terbit.`,
    pdfUrl,
  }
}

export async function revertCerStepAction(approvalId: number, revertNote: string) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  const [currentApproval] = await db.select().from(approvals).where(eq(approvals.id, approvalId))
  if (!currentApproval || !currentApproval.cerRequestId) {
    return { success: false, message: 'Approval step tidak ditemukan.' }
  }

  // Authorization check (Super Admin or assigned Approver)
  const [sessionEmp] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  const isSuperAdmin = isSuperAdminUser(sessionEmp, session.user)
  const isApprover =
    sessionEmp &&
    (currentApproval.approverEmployeeId === sessionEmp.id ||
      (currentApproval.approverName && sessionEmp.name && currentApproval.approverName.toLowerCase().includes(sessionEmp.name.toLowerCase())))

  const isFreshya =
    sessionEmp?.id === 974 || session.user.email.toLowerCase().includes('freshya')

  const isCurrentDirectorStep =
    Boolean(currentApproval.decisionNote && currentApproval.decisionNote.toLowerCase().includes('director')) ||
    Boolean(currentApproval.approverName && currentApproval.approverName.toLowerCase().includes('director')) ||
    currentApproval.approverEmployeeId === 10

  // Evo Dwi (id: 1006) co-access with Syamsul Bahri (id: 990) for Asset Tagging step
  const isEvoDwi =
    sessionEmp?.id === 1006 || session.user.email.toLowerCase().includes('evo')

  const isAssetTaggingStep =
    Boolean(currentApproval.decisionNote && (currentApproval.decisionNote.toLowerCase().includes('tagging') || currentApproval.decisionNote.toLowerCase().includes('nomor aset'))) ||
    currentApproval.approverEmployeeId === 990 ||
    Boolean(currentApproval.approverName && currentApproval.approverName.toLowerCase().includes('syamsul'))

  if (!isSuperAdmin && !isApprover && !(isFreshya && isCurrentDirectorStep) && !(isEvoDwi && isAssetTaggingStep)) {
    return {
      success: false,
      message: 'Akses ditolak: Anda tidak memiliki wewenang untuk meminta revisi pengajuan CER ini.',
    }
  }

  const cerId = currentApproval.cerRequestId
  const now = new Date()

  let finalRevertNote = `Revisi diminta: ${revertNote}`
  if (isFreshya && isCurrentDirectorStep && !isApprover) {
    finalRevertNote = `Revisi diminta oleh Freshya Ochtovita (Board Secretary a.n. Director): ${revertNote}`
  } else if (isEvoDwi && isAssetTaggingStep && !isApprover) {
    finalRevertNote = `Revisi diminta oleh Evo Dwi Yulianti (Co-Approval Asset Tagging a.n. Syamsul Bahri): ${revertNote}`
  }

  // Mark current approval step Reverted
  await db
    .update(approvals)
    .set({
      status: 'Reverted',
      reviewedAt: now,
      rejectionReason: revertNote,
      decisionNote: finalRevertNote,
    })
    .where(eq(approvals.id, approvalId))

  // Find applicant
  const [request] = await db
    .select({
      req: cerRequests,
      applicantName: employees.name,
      applicantEmail: employees.email,
    })
    .from(cerRequests)
    .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
    .where(eq(cerRequests.id, cerId))

  if (!request) {
    return { success: false, message: 'CER tidak ditemukan.' }
  }

  // Update CER request status to need_revision and reset active approver position
  await db
    .update(cerRequests)
    .set({
      status: 'need_revision',
      lastRevertStepOrder: currentApproval.level,
      lastRevertedByEmployeeId: currentApproval.approverEmployeeId,
      lastRevertNote: revertNote,
      currentApproverTitle: null,
      currentApproverName: null,
      currentApproverEmployeeId: null,
      updatedAt: now,
    })
    .where(eq(cerRequests.id, cerId))

  // Fetch full details for email notification
  const [site] = await db
    .select({ name: sites.name })
    .from(sites)
    .where(eq(sites.id, request.req.siteId))
    .limit(1)

  const [dept] = await db
    .select({ name: masterDepartments.name })
    .from(masterDepartments)
    .where(eq(masterDepartments.id, request.req.departmentId))
    .limit(1)

  const items = await db
    .select()
    .from(cerItems)
    .where(eq(cerItems.cerRequestId, cerId))

  const revertedByJobTitle = currentApproval.formName || currentApproval.decisionNote || 'Approver'

  // Send Email & Bell to Applicant
  if (request.applicantEmail) {
    await sendCerRevisionRequestedEmail({
      applicantEmail: request.applicantEmail,
      applicantName: request.applicantName || 'Pemohon',
      applicantSn: request.applicantSn || null,
      cerNumber: request.req.cerNumber,
      subject: request.req.subject,
      revertedByName: currentApproval.approverName,
      revertedByJobTitle,
      revertNote,
      cerId,
      departmentName: dept?.name || '-',
      siteName: site?.name || '-',
      assetCategory: request.req.assetCategory,
      purchaseType: request.req.purchaseType,
      vendorName: request.req.vendorName,
      totalEstimatedPrice: request.req.totalEstimatedPrice,
      items: items.map((it) => ({
        description: it.description,
        qty: it.qty,
        pricePerUnit: it.pricePerUnit,
        totalPrice: it.totalPrice,
        allocation: it.allocation,
        holderName: it.holderName,
      })),
    }).catch((err) => console.error('[cer] Revert email error:', err))
  }

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/approval')
  revalidatePath('/dashboard/assets/budget-controller')

  return {
    success: true,
    message: `Permintaan revisi telah dikirim ke pemohon (${request.applicantName}).`,
  }
}

/**
 * RESUBMIT CER REQUEST (After user edited form)
 * Per agreement: returns directly to the approver who requested revision!
 */
export interface ResubmitCerRequestInput {
  cerId: number
  subject: string
  purchaseType?: string
  budgetSource?: string
  capexBudgetId?: number | null
  dateRequired?: string | null
  purchasePurpose: string
  vendorName: string
  items: Array<{
    id?: number
    description: string
    qty: number
    pricePerUnit: number
    totalPrice: number
    allocation: string
    holderName: string
    holderEmployeeId?: number | null
    estimatedLifespan: string
  }>
  attachments?: Array<{
    fileName: string
    fileUrl: string
    fileType: string
    fileSize?: number
  }>
  customApprovers?: Array<{
    stepOrder: number
    label: string
    approverEmployeeId: number
    approverName: string
    jobTitle?: string | null
    approvalMode?: string
    isLocked?: boolean
    status?: string
  }>
}

/**
 * Fetch full CER details for revision modal
 */
export async function getCerDetailForRevisionAction(cerId: number) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  const [cer] = await db
    .select({
      id: cerRequests.id,
      cerNumber: cerRequests.cerNumber,
      subject: cerRequests.subject,
      applicantEmployeeId: cerRequests.applicantEmployeeId,
      dateRequired: cerRequests.dateRequired,
      level: cerRequests.level,
      purchaseType: cerRequests.purchaseType,
      budgetSource: cerRequests.budgetSource,
      departmentId: cerRequests.departmentId,
      sectionId: cerRequests.sectionId,
      siteId: cerRequests.siteId,
      assetCategory: cerRequests.assetCategory,
      purchasePurpose: cerRequests.purchasePurpose,
      vendorName: cerRequests.vendorName,
      totalEstimatedPrice: cerRequests.totalEstimatedPrice,
      capexBudgetId: cerRequests.capexBudgetId,
      status: cerRequests.status,
      lastRevertNote: cerRequests.lastRevertNote,
      lastRevertStepOrder: cerRequests.lastRevertStepOrder,
      lastRevertedByEmployeeId: cerRequests.lastRevertedByEmployeeId,
      applicantName: employees.name,
      applicantSn: employees.employeeSn,
      applicantEmail: employees.email,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      siteName: sites.name,
      budgetCode: cerCapexBudgets.budgetCode,
      budgetName: cerCapexBudgets.budgetName,
      allocatedAmount: cerCapexBudgets.allocatedAmount,
      remainingAmount: cerCapexBudgets.remainingAmount,
    })
    .from(cerRequests)
    .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
    .leftJoin(masterDepartments, eq(cerRequests.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(cerRequests.sectionId, masterSections.id))
    .leftJoin(sites, eq(cerRequests.siteId, sites.id))
    .leftJoin(cerCapexBudgets, eq(cerRequests.capexBudgetId, cerCapexBudgets.id))
    .where(eq(cerRequests.id, cerId))
    .limit(1)

  if (!cer) {
    return { success: false, message: 'Data CER tidak ditemukan.' }
  }

  // Fetch items
  const items = await db
    .select()
    .from(cerItems)
    .where(eq(cerItems.cerRequestId, cerId))
    .orderBy(asc(cerItems.id))

  // Fetch attachments
  const attachments = await db
    .select()
    .from(cerAttachments)
    .where(eq(cerAttachments.cerRequestId, cerId))
    .orderBy(asc(cerAttachments.id))

  // Fetch approvals
  const approvalRows = await db
    .select({
      id: approvals.id,
      level: approvals.level,
      status: approvals.status,
      approverEmployeeId: approvals.approverEmployeeId,
      approverName: approvals.approverName,
      jobTitle: employees.jobTitle,
      formName: approvals.formName,
      decisionNote: approvals.decisionNote,
      reviewedAt: approvals.reviewedAt,
      signatureUrl: approvals.signatureUrl,
    })
    .from(approvals)
    .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
    .where(eq(approvals.cerRequestId, cerId))
    .orderBy(asc(approvals.level))

  // Fetch details of the approver who requested revision
  let reverterName: string | null = null
  let reverterJobTitle: string | null = null

  if (cer.lastRevertedByEmployeeId) {
    const [revEmp] = await db
      .select({ name: employees.name, jobTitle: employees.jobTitle })
      .from(employees)
      .where(eq(employees.id, cer.lastRevertedByEmployeeId))
      .limit(1)
    if (revEmp) {
      reverterName = revEmp.name
      reverterJobTitle = revEmp.jobTitle
    }
  }

  // Fallback to reverted step in approvals table
  if (!reverterName) {
    const revApp = approvalRows.find((a) => (a.status || '').toLowerCase() === 'reverted')
    if (revApp) {
      reverterName = revApp.approverName
      reverterJobTitle = revApp.jobTitle || revApp.formName
    }
  }

  const enrichedCer = {
    ...cer,
    reverterName: reverterName ? reverterName.replace(/\s*\(BIMA Supervisor\)/gi, '') : 'Approver',
    reverterJobTitle: reverterJobTitle || 'Approver',
  }

  return {
    success: true,
    data: {
      cer: enrichedCer,
      items: items.map((it) => ({
        id: String(it.id),
        description: it.description,
        qty: it.qty,
        pricePerUnit: Number(it.pricePerUnit),
        totalPrice: Number(it.totalPrice),
        allocation: it.allocation || '',
        holderName: it.holderName || '',
        holderEmployeeId: it.holderEmployeeId || null,
        estimatedLifespan: it.estimatedLifespan || '',
      })),
      attachments: attachments.map((at) => ({
        fileName: at.fileName,
        fileUrl: at.fileUrl,
        fileType: at.fileType,
        fileSize: at.fileSize || 0,
      })),
      approvals: approvalRows.map((app) => ({
        id: String(app.id),
        stepOrder: app.level,
        label: app.formName || app.decisionNote || `Tahap ${app.level}`,
        approverEmployeeId: app.approverEmployeeId,
        approverName: (app.approverName || 'Approver').replace(/\s*\(BIMA Supervisor\)/gi, ''),
        jobTitle: app.jobTitle || app.formName || 'Approver',
        approvalMode: app.approvalMode || 'sequential',
        status: app.status,
        isLocked: (app.status || '').toLowerCase() === 'approved',
        reviewedAt: app.reviewedAt,
        signatureUrl: app.signatureUrl,
      })),
    },
  }
}

export async function resubmitCerRequestAction(input: ResubmitCerRequestInput) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  const [existing] = await db.select().from(cerRequests).where(eq(cerRequests.id, input.cerId))
  if (!existing) {
    return { success: false, message: 'Pengajuan CER tidak ditemukan.' }
  }

  const [currentEmp] = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      email: employees.email,
      accessRole: employees.accessRole,
      name: employees.name,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)
  const isApplicant = currentEmp && existing.applicantEmployeeId === currentEmp.id

  if (!isSuperAdmin && !isApplicant) {
    return {
      success: false,
      message: 'Akses ditolak: Hanya pengaju (pemohon) atau Super Admin yang berwenang mengajukan ulang CER ini.',
    }
  }

  const now = new Date()
  const totalEstimatedPrice = input.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)

  // Update master CER
  await db
    .update(cerRequests)
    .set({
      subject: input.subject,
      purchaseType: input.purchaseType || existing.purchaseType,
      budgetSource: input.budgetSource || existing.budgetSource,
      capexBudgetId: input.capexBudgetId !== undefined ? input.capexBudgetId : existing.capexBudgetId,
      dateRequired: input.dateRequired || existing.dateRequired,
      purchasePurpose: input.purchasePurpose,
      vendorName: input.vendorName,
      totalEstimatedPrice: String(totalEstimatedPrice),
      status: 'in_review',
      updatedAt: now,
    })
    .where(eq(cerRequests.id, input.cerId))

  // Replace unit items
  await db.delete(cerItems).where(eq(cerItems.cerRequestId, input.cerId))
  if (input.items && input.items.length > 0) {
    await db.insert(cerItems).values(
      input.items.map((it) => ({
        cerRequestId: input.cerId,
        description: it.description,
        qty: it.qty,
        pricePerUnit: String(it.pricePerUnit),
        totalPrice: String(it.totalPrice),
        allocation: it.allocation || '',
        holderName: it.holderName || '',
        holderEmployeeId: it.holderEmployeeId || null,
        estimatedLifespan: it.estimatedLifespan || '',
      }))
    )

    // Synchronize CapEx budget commitment adjustment if items/pricing changed
    const targetBudgetId = input.capexBudgetId || existing.capexBudgetId
    if (targetBudgetId) {
      const diff = totalEstimatedPrice - Number(existing.totalEstimatedPrice || 0)
      if (diff !== 0) {
        const [budget] = await db
          .select()
          .from(cerCapexBudgets)
          .where(eq(cerCapexBudgets.id, targetBudgetId))
        if (budget) {
          const prevRem = Number(budget.remainingAmount)
          const newUsed = Number(budget.usedAmount) + diff
          const newRem = Number(budget.allocatedAmount) - newUsed

          await db
            .update(cerCapexBudgets)
            .set({
              usedAmount: String(newUsed),
              remainingAmount: String(newRem),
              updatedAt: now,
            })
            .where(eq(cerCapexBudgets.id, budget.id))

          await db.insert(cerCapexBudgetTransactions).values({
            budgetId: budget.id,
            cerRequestId: input.cerId,
            transactionType: 'adjustment',
            amount: String(Math.abs(diff)),
            previousRemaining: String(prevRem),
            newRemaining: String(newRem),
            description: `Penyesuaian nilai CER ${existing.cerNumber} saat revisi (${diff > 0 ? '+' : ''}${diff})`,
            createdById: session.user.id,
          })
        }
      }
    }
  }

  // Replace attachments if provided
  if (input.attachments && input.attachments.length > 0) {
    await db.delete(cerAttachments).where(eq(cerAttachments.cerRequestId, input.cerId))
    await db.insert(cerAttachments).values(
      input.attachments.map((at) => ({
        cerRequestId: input.cerId,
        fileName: at.fileName,
        fileUrl: at.fileUrl,
        fileType: at.fileType || 'attachment',
        fileSize: at.fileSize || 0,
      }))
    )
  }

  // Synchronize Approval Sequence
  // Keep existing steps that are ALREADY Approved (locked)
  // Re-order or update unapproved steps
  const existingApprovals = await db
    .select()
    .from(approvals)
    .where(eq(approvals.cerRequestId, input.cerId))
    .orderBy(asc(approvals.level))

  const approvedSteps = existingApprovals.filter(
    (a) => (a.status || '').toLowerCase() === 'approved'
  )

  let nextPendingApprover: {
    approverEmployeeId?: number | null
    approverName?: string | null
    title?: string | null
    level: number
  } | null = null

  if (input.customApprovers && input.customApprovers.length > 0) {
    // Guardrail: Validate that mandatory steps are present
    const hasAmama = input.customApprovers.some(
      (ca) =>
        (ca.approverName || '').toLowerCase().includes('amama') ||
        ca.approverEmployeeId === 1341
    )
    const hasFebrian = input.customApprovers.some(
      (ca) =>
        (ca.approverName || '').toLowerCase().includes('febrian') ||
        ca.approverEmployeeId === 960
    )
    const hasDirector = input.customApprovers.some(
      (ca) =>
        (ca.label || '').toLowerCase().includes('director') ||
        (ca.approverName || '').toLowerCase().includes('hidayat') ||
        ca.approverEmployeeId === 10
    )
    const hasAssetTagging = input.customApprovers.some(
      (ca) =>
        (ca.label || '').toLowerCase().includes('tagging') ||
        (ca.label || '').toLowerCase().includes('nomor aset') ||
        (ca.label || '').toLowerCase().includes('no.aset') ||
        (ca.label || '').toLowerCase().includes('kelompok aset') ||
        (ca.approverName || '').toLowerCase().includes('syamsul') ||
        (ca.approverName || '').toLowerCase().includes('evo') ||
        ca.approverEmployeeId === 990
    )

    if (!hasAmama || !hasFebrian || !hasDirector || !hasAssetTagging) {
      return {
        success: false,
        message:
          'Validasi Alur Approval: Tahapan wajib (Budget Validator Amama Ira & Febrian Dani, Director Hidayat Rahman, dan Asset Tagging) tidak boleh dihapus.',
      }
    }

    // Delete unapproved approvals from database
    for (const a of existingApprovals) {
      if ((a.status || '').toLowerCase() !== 'approved') {
        await db.delete(approvals).where(eq(approvals.id, a.id))
      }
    }

    // Insert steps starting after approved steps
    let hasFoundFirstPending = false

    for (let idx = 0; idx < input.customApprovers.length; idx++) {
      const stepItem = input.customApprovers[idx]
      const stepLevel = idx + 1

      // If this level was already approved, skip inserting anew
      const alreadyApproved = approvedSteps.find((ap) => ap.level === stepLevel)
      if (alreadyApproved) {
        continue
      }

      const resolvedStep = await resolveAssetTestingApprover({
        approverEmployeeId: stepItem.approverEmployeeId,
        approverName: stepItem.approverName,
      })

      // First unapproved step becomes Pending
      const status = !hasFoundFirstPending ? 'Pending' : 'Draft'
      if (!hasFoundFirstPending) {
        hasFoundFirstPending = true
        nextPendingApprover = {
          approverEmployeeId: resolvedStep.approverEmployeeId,
          approverName: resolvedStep.approverName,
          title: stepItem.label,
          level: stepLevel,
        }
      }

      await db.insert(approvals).values({
        cerRequestId: input.cerId,
        level: stepLevel,
        formName: stepItem.label,
        approverEmployeeId: resolvedStep.approverEmployeeId,
        approverName: resolvedStep.approverName,
        status,
        submittedAt: now,
        decisionNote: status === 'Pending' ? 'Resubmitted oleh pemohon (Perlu Peninjauan)' : '',
      })
    }
  } else {
    // Fallback: target the step that requested revision or currentStepOrder
    const targetStepOrder = existing.lastRevertStepOrder || existing.currentStepOrder || 1
    const [targetStep] = await db
      .select()
      .from(approvals)
      .where(and(eq(approvals.cerRequestId, input.cerId), eq(approvals.level, targetStepOrder)))
      .limit(1)

    if (targetStep) {
      await db
        .update(approvals)
        .set({
          status: 'Pending',
          submittedAt: now,
          decisionNote: 'Resubmitted oleh pemohon',
        })
        .where(eq(approvals.id, targetStep.id))

      nextPendingApprover = {
        approverEmployeeId: targetStep.approverEmployeeId,
        approverName: targetStep.approverName,
        title: targetStep.formName,
        level: targetStep.level,
      }
    }
  }

  // Update CER request current step indicators
  if (nextPendingApprover) {
    await db
      .update(cerRequests)
      .set({
        currentStepOrder: nextPendingApprover.level,
        currentApproverTitle: nextPendingApprover.title || 'Approver',
        currentApproverName: nextPendingApprover.approverName || 'Approver',
        currentApproverEmployeeId: nextPendingApprover.approverEmployeeId || null,
        status: 'in_review',
        updatedAt: now,
      })
      .where(eq(cerRequests.id, input.cerId))

    // Send email & bell notification to the active pending approver
    if (nextPendingApprover.approverEmployeeId) {
      const [appEmp] = await db
        .select({ email: employees.email, name: employees.name })
        .from(employees)
        .where(eq(employees.id, nextPendingApprover.approverEmployeeId))
      if (appEmp?.email) {
        await sendCerResubmittedEmail({
          approverEmail: appEmp.email,
          approverName: appEmp.name,
          cerNumber: existing.cerNumber,
          subject: input.subject,
          applicantName: session.user.name || 'Pemohon',
        }).catch((err) => console.error('[cer] Resubmit email error:', err))
      }
    }
  }

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/approval')
  revalidatePath('/dashboard/assets/budget-controller')

  return {
    success: true,
    message: `Form CER ${existing.cerNumber} berhasil diperbarui dan dikirim kembali ke ${nextPendingApprover?.approverName || 'Approver'}.`,
  }
}

/**
 * CONFIRM ASSET RECEIVED (Smartphone friendly by Requester)
 * Registers received items into centralServiceAssets for sticker generation!
 */
export async function confirmAssetReceivedAction(input: {
  cerId?: number
  cerRequestId?: number
  receivedDate: string
  receiverNotes: string
  goodsPhotoUrl?: string
  deliveryNoteUrl?: string
  receiverSignatureUrl?: string
  gaName?: string
  unitSerialNumbers?: Record<number, string> // cerItemId -> serialNumber
}) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  const effectiveCerId = input.cerId || input.cerRequestId
  if (!effectiveCerId) {
    return { success: false, message: 'ID CER tidak valid.' }
  }

  const [request] = await db
    .select({
      req: cerRequests,
      siteName: sites.name,
      applicantName: employees.name,
      applicantJobTitle: employees.jobTitle,
      deptName: masterDepartments.name,
    })
    .from(cerRequests)
    .leftJoin(sites, eq(cerRequests.siteId, sites.id))
    .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
    .leftJoin(masterDepartments, eq(cerRequests.departmentId, masterDepartments.id))
    .where(eq(cerRequests.id, effectiveCerId))

  if (!request) {
    return { success: false, message: 'CER tidak ditemukan.' }
  }

  const [currentEmp] = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      email: employees.email,
      accessRole: employees.accessRole,
      name: employees.name,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)
  const isApplicant = currentEmp && request.req.applicantEmployeeId === currentEmp.id

  if (!isSuperAdmin && !isApplicant) {
    return {
      success: false,
      message: 'Akses ditolak: Hanya pengaju (pemohon) atau Super Admin yang berwenang mengonfirmasi penerimaan barang.',
    }
  }

  const now = new Date()

  // Fetch unit items
  const items = await db.select().from(cerItems).where(eq(cerItems.cerRequestId, effectiveCerId))

  // Insert each item into centralServiceAssets so that it immediately gets asset number & sticker!
  const registeredItems: Array<{
    assetNumber: string
    serialNumber: string
    description: string
    category: string
    kelompokAset?: string | null
    location: string
    condition: string
    notes?: string | null
    quantity?: number
  }> = []

  for (const it of items) {
    const sn = (input.unitSerialNumbers && input.unitSerialNumbers[it.id]) || it.serialNumber || ''
    const [assetCount] = await db.select({ count: sql<number>`count(*)::int` }).from(centralServiceAssets)
    const fallbackAssetNum = `AST/${(request.siteName || 'CP').slice(0, 3).toUpperCase()}/${now.getFullYear()}/${String(
      (assetCount?.count || 0) + 1
    ).padStart(4, '0')}`
    const assetNum = it.assetNumber?.trim() || fallbackAssetNum

    const [createdAsset] = await db
      .insert(centralServiceAssets)
      .values({
        workSection: request.req.assetCategory,
        section: it.allocation || 'Central Service',
        location: it.allocation || request.siteName || 'Balikpapan',
        description: it.description,
        holderEmployeeId: it.holderEmployeeId || null,
        assetNumber: assetNum,
        serialNumber: sn,
        purchaseDate: now,
        deliveryToSiteDate: new Date(input.receivedDate || now),
        condition: 'Baik / Lengkap',
        qty: it.qty || 1,
        remarks: `Pengadaan dari ${request.req.cerNumber} (${request.req.subject})`,
      })
      .returning({ id: centralServiceAssets.id })

    // Link back to cerItems
    await db
      .update(cerItems)
      .set({
        assetId: createdAsset.id,
        assetNumber: assetNum,
        serialNumber: sn,
        updatedAt: now,
      })
      .where(eq(cerItems.id, it.id))

    registeredItems.push({
      assetNumber: assetNum,
      serialNumber: sn || '-',
      description: it.description,
      category: request.req.assetCategory,
      kelompokAset: request.req.kelompokAset || '-',
      location: it.allocation || request.siteName || 'Balikpapan',
      condition: 'Baik / Lengkap',
      notes: input.receiverNotes || it.notes || 'Sesuai pesanan & berfungsi normal',
      quantity: it.qty || 1,
    })
  }

  // Generate BAST Number
  const siteCode = (request.siteName || 'CP').split(' ')[0].toUpperCase()
  const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()]
  const year = now.getFullYear()
  const [bastCount] = await db.select({ count: sql<number>`count(*)::int` }).from(cerBasts)
  const seq = String((bastCount?.count || 0) + 1).padStart(3, '0')
  const bastNumber = `BAST/CP/${siteCode}/${monthRoman}/${year}/${seq}`

  // Generate Official BAST PDF with Logo & Digital Signatures!
  let bastPdfUrl: string | null = null
  let bastBuffer: Uint8Array | null = null
  try {
    bastBuffer = await generateCerBastPdf({
      bastNumber,
      cerNumber: request.req.cerNumber,
      subject: request.req.subject,
      handoverDate: input.receivedDate || now,
      userName: request.applicantName || 'Pemohon',
      userJobTitle: request.applicantJobTitle || 'Pemohon Pengadaan',
      applicantName: request.applicantName || 'Pemohon',
      applicantJobTitle: request.applicantJobTitle || 'Pemohon Pengadaan',
      userDepartment: request.deptName,
      departmentName: request.deptName,
      userSite: request.siteName,
      siteName: request.siteName,
      userSignedAt: now,
      userSignatureUrl: input.receiverSignatureUrl || null,
      notes: input.receiverNotes,
      receiverNotes: input.receiverNotes,
      vendorName: request.req.vendorName,
      kelompokAset: request.req.kelompokAset,
      assetCategory: request.req.assetCategory,
      goodsPhotoUrl: input.goodsPhotoUrl || null,
      items: registeredItems,
    })

    bastPdfUrl = await saveGeneratedPdfUpload(bastBuffer, 'cer-bast', bastNumber)
  } catch (pdfErr) {
    console.error('[confirmAssetReceivedAction] BAST PDF error:', pdfErr)
  }

  // Update CER request status to completed / received
  await db
    .update(cerRequests)
    .set({
      status: 'completed',
      receivedAt: now,
      receiverNotes: input.receiverNotes,
      receiverSignatureUrl: input.receiverSignatureUrl || null,
      goodsPhotoUrl: input.goodsPhotoUrl || null,
      deliveryNoteUrl: input.deliveryNoteUrl || null,
      bastPdfUrl: bastPdfUrl || undefined,
      updatedAt: now,
    })
    .where(eq(cerRequests.id, effectiveCerId))

  // Insert into cerBasts record
  await db.insert(cerBasts).values({
    cerRequestId: effectiveCerId,
    bastNumber,
    handoverDate: input.receivedDate || now.toISOString().slice(0, 10),
    gaEmployeeName: request.req.vendorName || 'Vendor / Supplier',
    userEmployeeName: request.applicantName || 'Pemohon',
    userSignatureUrl: input.receiverSignatureUrl || null,
    userSignedAt: now,
    pdfUrl: bastPdfUrl || undefined,
    status: 'completed',
    notes: input.receiverNotes || '',
  })

  // Send Notification to Syamsul Bahri & Evo Dwi (Finance Tagging) asynchronously
  void sendCerAssetReceivedEmail({
    applicantName: request.applicantName || 'Pemohon',
    applicantEmail: request.applicantEmail,
    cerNumber: request.req.cerNumber,
    subject: request.req.subject,
    siteId: request.req.siteId,
    siteName: request.siteName || 'Site',
    receivedDate: input.receivedDate,
    receiverNotes: input.receiverNotes,
    cerId: effectiveCerId,
    bastNumber,
    bastPdfUrl,
    pdfBuffer: bastBuffer || undefined,
  }).catch((err) => console.error('[cer] Asset received email error:', err))

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/central-service/assets')

  return {
    success: true,
    message: `Konfirmasi penerimaan aset & BAST (${bastNumber}) berhasil diterbitkan. Dokumen PDF siap diunduh.`,
    bastPdfUrl,
    bastNumber,
  }
}

/**
 * SIGN AND GENERATE BAST DIGITAL
 */
export async function signCerBastAction(input: {
  cerId: number
  handoverDate: string
  gaName?: string
  notes?: string
}) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  const [request] = await db
    .select({
      req: cerRequests,
      applicantName: employees.name,
      applicantEmail: employees.email,
      applicantSn: employees.employeeSn,
      applicantJobTitle: employees.jobTitle,
      deptName: masterDepartments.name,
      siteName: sites.name,
    })
    .from(cerRequests)
    .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
    .leftJoin(masterDepartments, eq(cerRequests.departmentId, masterDepartments.id))
    .leftJoin(sites, eq(cerRequests.siteId, sites.id))
    .where(eq(cerRequests.id, input.cerId))

  if (!request) {
    return { success: false, message: 'CER tidak ditemukan.' }
  }

  const [currentEmp] = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      email: employees.email,
      accessRole: employees.accessRole,
      name: employees.name,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)
  const isApplicant = currentEmp && request.req.applicantEmployeeId === currentEmp.id

  if (!isSuperAdmin && !isApplicant) {
    return {
      success: false,
      message: 'Akses ditolak: Hanya pengaju (pemohon) atau Super Admin yang berwenang menandatangani dan menerbitkan BAST.',
    }
  }

  const now = new Date()
  const siteCode = (request.siteName || 'CP').split(' ')[0].toUpperCase()
  const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()]
  const year = now.getFullYear()

  const [bastCount] = await db.select({ count: sql<number>`count(*)::int` }).from(cerBasts)
  const seq = String((bastCount?.count || 0) + 1).padStart(3, '0')
  const bastNumber = `BAST/CP/${siteCode}/${monthRoman}/${year}/${seq}`

  // Fetch unit items with asset numbers
  const items = await db
    .select({
      it: cerItems,
      assetNum: centralServiceAssets.assetNumber,
      assetSerial: centralServiceAssets.serialNumber,
      cond: centralServiceAssets.condition,
    })
    .from(cerItems)
    .leftJoin(centralServiceAssets, eq(cerItems.assetId, centralServiceAssets.id))
    .where(eq(cerItems.cerRequestId, input.cerId))

  const vendorName = request.req.vendorName || 'Vendor / Supplier'

  // Generate BAST PDF
  const bastBuffer = await generateCerBastPdf({
    bastNumber,
    cerNumber: request.req.cerNumber,
    subject: request.req.subject,
    handoverDate: input.handoverDate || now,
    userName: request.applicantName || 'Pemohon',
    userJobTitle: request.applicantJobTitle,
    userDepartment: request.deptName,
    userSite: request.siteName,
    userSignedAt: now,
    notes: input.notes,
    vendorName,
    items: items.map((row) => ({
      assetNumber: row.assetNum || '-',
      serialNumber: row.assetSerial || row.it.serialNumber || '-',
      description: row.it.description,
      category: request.req.assetCategory,
      location: row.it.allocation || request.siteName || 'Site',
      holderName: row.it.holderName || '',
      condition: row.cond || 'Baik & Lengkap',
    })),
  })

  // Save BAST PDF
  const pdfUrl = await saveGeneratedPdf(bastBuffer, bastNumber.replace(/\//g, '_'))

  // Insert into hero_cer_basts
  await db.insert(cerBasts).values({
    cerRequestId: input.cerId,
    bastNumber,
    handoverDate: input.handoverDate || now.toISOString().slice(0, 10),
    gaEmployeeName: vendorName,
    userEmployeeName: request.applicantName || 'Pemohon',
    gaSignedAt: null,
    userSignedAt: now,
    pdfUrl,
    status: 'completed',
    notes: input.notes || '',
  })

  // Update CER request status to completed
  await db
    .update(cerRequests)
    .set({
      status: 'completed',
      updatedAt: now,
    })
    .where(eq(cerRequests.id, input.cerId))

  // Send Email with BAST PDF to Syamsul & Evo (Finance Tagging), CC Pemohon & Tim Procurement
  if (request.applicantEmail) {
    await sendCerBastCompletedEmail({
      applicantEmail: request.applicantEmail,
      applicantName: request.applicantName || 'Pemohon',
      bastNumber,
      cerNumber: request.req.cerNumber,
      subject: request.req.subject,
      handoverDate: input.handoverDate || formatIndoDate(now),
      pdfBuffer: bastBuffer,
      pdfUrl,
      cerId: input.cerId,
    }).catch((err) => console.error('[cer] BAST email error:', err))
  }

  revalidatePath('/dashboard/assets/cer')

  return {
    success: true,
    message: `BAST ${bastNumber} berhasil diterbitkan dan ditandatangani digital. Dokumen telah dikirim ke pemohon & CC GA.`,
    bastNumber,
    pdfUrl,
  }
}

/**
 * FINANCE BUDGET CONTROLLER ACTIONS
 */
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

  const budgetPermission = await getCurrentMenuPermission('cer_budget_controller')
  if (!budgetPermission.canEdit && !budgetPermission.canView) {
    return {
      success: false,
      message: 'Akses ditolak: Anda tidak memiliki izin untuk mengelola Budget Controller. Silakan hubungi Administrator untuk pengaturan Role Management.',
    }
  }

  const now = new Date()

  if (input.id) {
    const [existing] = await db.select().from(cerCapexBudgets).where(eq(cerCapexBudgets.id, input.id))
    if (!existing) return { success: false, message: 'Budget tidak ditemukan.' }

    const used = Number(existing.usedAmount)
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

  const budgetPermission = await getCurrentMenuPermission('cer_budget_controller')
  if (!budgetPermission.canDelete && !budgetPermission.canEdit) {
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

/**
 * UPDATE NOTIFICATION CONFIGS (Settings > Email)
 */
export async function updateCerNotificationConfigAction(data: CerNotificationConfigData) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized' }
  }

  const now = new Date()
  const [existing] = await db.select().from(cerNotificationConfigs).limit(1)

  if (existing) {
    await db
      .update(cerNotificationConfigs)
      .set({
        procurementEmail: data.procurementEmail,
        procurementSiteOverrides: data.procurementSiteOverrides,
        evoDwiEmail: data.evoDwiEmail,
        gaAdilaEmail: data.gaAdilaEmail,
        gaBagasEmail: data.gaBagasEmail,
        itBimaEmail: data.itBimaEmail,
        budgetValidatorEmail: data.budgetValidatorEmail,
        updatedById: session.user.id,
        updatedAt: now,
      })
      .where(eq(cerNotificationConfigs.id, existing.id))
  } else {
    await db.insert(cerNotificationConfigs).values({
      procurementEmail: data.procurementEmail,
      procurementSiteOverrides: data.procurementSiteOverrides,
      evoDwiEmail: data.evoDwiEmail,
      gaAdilaEmail: data.gaAdilaEmail,
      gaBagasEmail: data.gaBagasEmail,
      itBimaEmail: data.itBimaEmail,
      budgetValidatorEmail: data.budgetValidatorEmail,
      updatedById: session.user.id,
    })
  }

  revalidatePath('/dashboard/settings/email')
  revalidatePath('/dashboard/assets/cer')

  return { success: true, message: 'Pengaturan email notifikasi CER berhasil disimpan.' }
}


export async function getCerItemsAction(cerId: number) {
  return await db
    .select()
    .from(cerItems)
    .where(eq(cerItems.cerRequestId, cerId))
    .orderBy(asc(cerItems.id))
}
