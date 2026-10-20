'use server'

import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
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
import { resolveApprovalRouteForActivity } from '@/lib/approval-engine'
import {
  sendCerSubmittedEmail,
  sendCerRevisionRequestedEmail,
  sendCerResubmittedEmail,
  sendCerFullApprovedEmail,
  sendCerAssetReceivedEmail,
  sendCerBastCompletedEmail,
  getCerNotificationConfig,
  type CerNotificationConfigData,
} from '@/lib/cer-email'
import { generateCerPdf } from '@/lib/cer-pdf'
import { generateCerBastPdf } from '@/lib/cer-bast-pdf'
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
      departmentName: string
      sectionName: string
      siteName: string
      budgetName: string | null
      itemsCount: number
      bastsCount: number
      approvals: Array<{
        id: number
        level: number
        approverName: string
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
    jobTitle: string | null
    departmentId: number | null
    siteId: number | null
  } | null
  isFinanceOrAdmin: boolean
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
      email: employees.email,
      jobTitle: employees.jobTitle,
      departmentId: employees.departmentId,
      siteId: employees.siteId,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(and(eq(employees.email, session.user.email), eq(employees.isActive, true)))
    .limit(1)

  const isFinanceOrAdmin = Boolean(
    currentEmployee?.accessRole?.toLowerCase() === 'super admin' ||
      currentEmployee?.accessRole?.toLowerCase() === 'admin' ||
      currentEmployee?.jobTitle?.toLowerCase().includes('finance') ||
      currentEmployee?.jobTitle?.toLowerCase().includes('accounting') ||
      currentEmployee?.departmentId === 4
  )

  // Fetch all related master data
  const [siteRows, deptRows, secRows, budgetRows, requestRows] = await Promise.all([
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
    db.select().from(cerCapexBudgets).orderBy(desc(cerCapexBudgets.fiscalYear), asc(cerCapexBudgets.budgetName)),
    db
      .select({
        request: cerRequests,
        applicantName: employees.name,
        applicantEmail: employees.email,
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
            status: approvals.status,
            reviewedAt: approvals.reviewedAt,
            decisionNote: approvals.decisionNote,
          })
          .from(approvals)
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

  const mappedRequests = requestRows.map((row) => ({
    ...row.request,
    applicantName: row.applicantName || 'Unknown Employee',
    applicantEmail: row.applicantEmail || '',
    departmentName: row.deptName || '-',
    sectionName: row.secName || '-',
    siteName: row.siteName || '-',
    budgetName: row.budgetName,
    itemsCount: itemsCountMap.get(row.request.id) || 0,
    bastsCount: 0,
    approvals: approvalsMap.get(row.request.id) || [],
  }))

  return {
    requests: mappedRequests,
    budgets: budgetRows,
    sites: siteRows,
    departments: deptRows,
    sections: secRows,
    currentEmployee,
    isFinanceOrAdmin,
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
}) {
  const resolution = await resolveApprovalRouteForActivity({
    employeeId: params.employeeId,
    activityType: params.assetCategory,
    priority: 'Normal',
    overtimeMinutes: 0,
    transactionType: 'cer_request',
    siteId: params.siteId,
    departmentId: params.departmentId,
    assetCategory: params.assetCategory,
  })

  return resolution.steps
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
    estimatedLifespan: string
  }>
  attachments?: Array<{
    fileName: string
    fileUrl: string
    fileType: string
    fileSize?: number
    mimeType?: string
  }>
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
  const seq = String((countResult?.count || 0) + 1).padStart(3, '0')
  const cerNumber = `CER/CP/${siteCode}/${monthRoman}/${year}/${seq}`

  // Resolve approval chain
  const approvalResolution = await resolveApprovalRouteForActivity({
    employeeId: applicant.id,
    activityType: input.assetCategory,
    priority: 'Normal',
    overtimeMinutes: 0,
    transactionType: 'cer_request',
    siteId: input.siteId,
    departmentId: input.departmentId,
    assetCategory: input.assetCategory,
  })

  const steps = approvalResolution.steps
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
    await db.insert(approvals).values({
      cerRequestId: newRequest.id,
      level: s.stepOrder,
      approverName: s.approverName,
      approverEmployeeId: s.approverEmployeeId,
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
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(eq(employees.id, step1.approverEmployeeId))
    if (appEmp?.email) {
      const [dept] = await db
        .select({ name: masterDepartments.name })
        .from(masterDepartments)
        .where(eq(masterDepartments.id, input.departmentId))
      await sendCerSubmittedEmail({
        approverEmail: appEmp.email,
        approverName: appEmp.name,
        cerNumber,
        subject: input.subject,
        applicantName: applicant.name,
        siteName: site?.name || 'Site',
        departmentName: dept?.name || 'Department',
        totalEstimatedPrice,
        approvalStep: step1.label,
      }).catch((err) => console.error('[cer] Send email error:', err))
    }
  }

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/approval')

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
export async function approveCerStepAction(approvalId: number, decisionNote?: string) {
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

  // Mark current approval step Approved
  await db
    .update(approvals)
    .set({
      status: 'Approved',
      reviewedAt: now,
      decisionNote: decisionNote || 'Disetujui',
    })
    .where(eq(approvals.id, approvalId))

  // Find all steps for this CER
  const allSteps = await db
    .select()
    .from(approvals)
    .where(eq(approvals.cerRequestId, cerId))
    .orderBy(asc(approvals.level))

  const nextStep = allSteps.find((s) => s.level === currentApproval.level + 1)

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

  if (nextStep) {
    // Advance to next step
    await db
      .update(approvals)
      .set({ status: 'Pending', submittedAt: now })
      .where(eq(approvals.id, nextStep.id))

    await db
      .update(cerRequests)
      .set({
        currentStepOrder: nextStep.level,
        currentApproverName: nextStep.approverName,
        currentApproverEmployeeId: nextStep.approverEmployeeId,
        updatedAt: now,
      })
      .where(eq(cerRequests.id, cerId))

    // Send email to next approver
    if (nextStep.approverEmployeeId) {
      const [nextEmp] = await db
        .select({ email: employees.email, name: employees.name })
        .from(employees)
        .where(eq(employees.id, nextStep.approverEmployeeId))
      if (nextEmp?.email) {
        await sendCerSubmittedEmail({
          approverEmail: nextEmp.email,
          approverName: nextEmp.name,
          cerNumber: request.req.cerNumber,
          subject: request.req.subject,
          applicantName: request.applicantName || 'Pemohon',
          siteName: request.siteName || 'Site',
          departmentName: 'Central Services',
          totalEstimatedPrice: request.req.totalEstimatedPrice,
          approvalStep: `Tahap ${nextStep.level}`,
        }).catch((err) => console.error('[cer] Next approver email error:', err))
      }
    }

    revalidatePath('/dashboard/assets/cer')
    revalidatePath('/dashboard/approval')

    return { success: true, message: `Disetujui. Berkas diteruskan ke ${nextStep.approverName}.` }
  } else {
    // FINAL APPROVAL: FULL APPROVED!
    // 1. Fetch items
    const items = await db.select().from(cerItems).where(eq(cerItems.cerRequestId, cerId))

    // 2. Map approvals for PDF
    const pdfApprovals = allSteps.map((s) => ({
      stepOrder: s.level,
      label: s.decisionNote || `Tahap ${s.level}`,
      approverName: s.approverName,
      status: 'Approved',
      reviewedAt: s.reviewedAt || now,
    }))

    // 3. Generate Official CER Document PDF
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
      items: items.map((it) => ({
        description: it.description,
        qty: it.qty,
        pricePerUnit: it.pricePerUnit,
        totalPrice: it.totalPrice,
        allocation: it.allocation,
        holderName: it.holderName,
        estimatedLifespan: it.estimatedLifespan,
      })),
      approvals: pdfApprovals,
    })

    // 4. Save PDF
    const pdfUrl = await saveGeneratedPdf(pdfBuffer, request.req.cerNumber.replace(/\//g, '_'))

    // 5. Update CER status to full_approved
    await db
      .update(cerRequests)
      .set({
        status: 'full_approved',
        approvedAt: now,
        pdfUrl,
        updatedAt: now,
      })
      .where(eq(cerRequests.id, cerId))

    // 6. Send Email to Procurement & Pemohon, CC Evo Dwi with PDF attached
    if (request.applicantEmail) {
      await sendCerFullApprovedEmail({
        applicantEmail: request.applicantEmail,
        applicantName: request.applicantName || 'Pemohon',
        cerNumber: request.req.cerNumber,
        subject: request.req.subject,
        siteId: request.req.siteId,
        siteName: request.siteName || 'Site',
        totalEstimatedPrice: request.req.totalEstimatedPrice,
        vendorName: request.req.vendorName,
        pdfBuffer,
        pdfUrl,
        cerId,
      }).catch((err) => console.error('[cer] Full approved email error:', err))
    }

    revalidatePath('/dashboard/assets/cer')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Persetujuan final berhasil. CER ${request.req.cerNumber} telah berstatus Full Approved dan dokumen resmi telah dikirim ke Procurement & Pemohon.`,
      pdfUrl,
    }
  }
}

/**
 * REVERT CER STEP (Request Revision)
 */
export async function revertCerStepAction(approvalId: number, revertNote: string) {
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

  // Mark current approval step Reverted
  await db
    .update(approvals)
    .set({
      status: 'Reverted',
      reviewedAt: now,
      rejectionReason: revertNote,
      decisionNote: `Revisi diminta: ${revertNote}`,
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

  // Update CER request status to need_revision
  await db
    .update(cerRequests)
    .set({
      status: 'need_revision',
      lastRevertStepOrder: currentApproval.level,
      lastRevertedByEmployeeId: currentApproval.approverEmployeeId,
      lastRevertNote: revertNote,
      updatedAt: now,
    })
    .where(eq(cerRequests.id, cerId))

  // Send Email & Bell to Applicant
  if (request.applicantEmail) {
    await sendCerRevisionRequestedEmail({
      applicantEmail: request.applicantEmail,
      applicantName: request.applicantName || 'Pemohon',
      cerNumber: request.req.cerNumber,
      subject: request.req.subject,
      revertedByName: currentApproval.approverName,
      revertNote,
      cerId,
    }).catch((err) => console.error('[cer] Revert email error:', err))
  }

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/approval')

  return {
    success: true,
    message: `Permintaan revisi telah dikirim ke pemohon (${request.applicantName}).`,
  }
}

/**
 * RESUBMIT CER REQUEST (After user edited form)
 * Per agreement: returns directly to the approver who requested revision!
 */
export async function resubmitCerRequestAction(input: {
  cerId: number
  subject: string
  dateRequired?: string
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
    estimatedLifespan: string
  }>
}) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  const [existing] = await db.select().from(cerRequests).where(eq(cerRequests.id, input.cerId))
  if (!existing) {
    return { success: false, message: 'Pengajuan CER tidak ditemukan.' }
  }

  const now = new Date()
  const totalEstimatedPrice = input.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)

  // Update master CER
  await db
    .update(cerRequests)
    .set({
      subject: input.subject,
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
        estimatedLifespan: it.estimatedLifespan || '',
      }))
    )
  }

  // Return directly to the approver step that requested revision!
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

    // Send email to this approver
    if (targetStep.approverEmployeeId) {
      const [appEmp] = await db
        .select({ email: employees.email, name: employees.name })
        .from(employees)
        .where(eq(employees.id, targetStep.approverEmployeeId))
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

  return {
    success: true,
    message: `Form CER ${existing.cerNumber} berhasil diperbarui dan dikirim kembali ke ${targetStep?.approverName || 'Approver'}.`,
  }
}

/**
 * CONFIRM ASSET RECEIVED (Smartphone friendly by Requester)
 * Registers received items into centralServiceAssets for sticker generation!
 */
export async function confirmAssetReceivedAction(input: {
  cerId: number
  receivedDate: string
  receiverNotes: string
  goodsPhotoUrl?: string
  deliveryNoteUrl?: string
  unitSerialNumbers?: Record<number, string> // cerItemId -> serialNumber
}) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return { success: false, message: 'Unauthorized' }
  }

  const [request] = await db
    .select({
      req: cerRequests,
      siteName: sites.name,
      applicantName: employees.name,
    })
    .from(cerRequests)
    .leftJoin(sites, eq(cerRequests.siteId, sites.id))
    .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
    .where(eq(cerRequests.id, input.cerId))

  if (!request) {
    return { success: false, message: 'CER tidak ditemukan.' }
  }

  const now = new Date()

  // Update CER request status to received
  await db
    .update(cerRequests)
    .set({
      status: 'received',
      receivedAt: now,
      receiverNotes: input.receiverNotes,
      goodsPhotoUrl: input.goodsPhotoUrl || null,
      deliveryNoteUrl: input.deliveryNoteUrl || null,
      updatedAt: now,
    })
    .where(eq(cerRequests.id, input.cerId))

  // Fetch unit items
  const items = await db.select().from(cerItems).where(eq(cerItems.cerRequestId, input.cerId))

  // Insert each item into centralServiceAssets so that it immediately gets asset number & sticker!
  for (const it of items) {
    const sn = (input.unitSerialNumbers && input.unitSerialNumbers[it.id]) || it.serialNumber || ''
    const [assetCount] = await db.select({ count: sql<number>`count(*)::int` }).from(centralServiceAssets)
    const assetNum = `AST/${(request.siteName || 'CP').slice(0, 3).toUpperCase()}/${now.getFullYear()}/${String(
      (assetCount?.count || 0) + 1
    ).padStart(4, '0')}`

    const [createdAsset] = await db
      .insert(centralServiceAssets)
      .values({
        workSection: request.req.assetCategory,
        section: it.allocation || 'Central Service',
        location: request.siteName || 'Balikpapan',
        description: it.description,
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
        serialNumber: sn,
        updatedAt: now,
      })
      .where(eq(cerItems.id, it.id))
  }

  // Send Notification to Procurement & CC Evo Dwi
  await sendCerAssetReceivedEmail({
    applicantName: request.applicantName || 'Pemohon',
    cerNumber: request.req.cerNumber,
    subject: request.req.subject,
    siteId: request.req.siteId,
    siteName: request.siteName || 'Site',
    receivedDate: input.receivedDate,
    receiverNotes: input.receiverNotes,
    cerId: input.cerId,
  }).catch((err) => console.error('[cer] Asset received email error:', err))

  revalidatePath('/dashboard/assets/cer')
  revalidatePath('/dashboard/central-service/assets')

  return {
    success: true,
    message: 'Konfirmasi penerimaan aset berhasil. Aset telah terdaftar di database Asset Management dan siap dicetak stikernya.',
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

  const gaName = input.gaName || 'Adila Tri Arizona (General Affairs)'

  // Generate BAST PDF
  const bastBuffer = await generateCerBastPdf({
    bastNumber,
    cerNumber: request.req.cerNumber,
    subject: request.req.subject,
    handoverDate: input.handoverDate || now,
    gaName,
    gaSignedAt: now,
    userName: request.applicantName || 'Pemohon',
    userJobTitle: request.applicantJobTitle,
    userDepartment: request.deptName,
    userSite: request.siteName,
    userSignedAt: now,
    notes: input.notes,
    items: items.map((row) => ({
      assetNumber: row.assetNum || '-',
      serialNumber: row.assetSerial || row.it.serialNumber || '-',
      description: row.it.description,
      category: request.req.assetCategory,
      location: request.siteName || 'Site',
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
    gaEmployeeName: gaName,
    userEmployeeName: request.applicantName || 'Pemohon',
    gaSignedAt: now,
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

  // Send Email with BAST PDF to User, CC GA (Adila & Bagas)
  if (request.applicantEmail) {
    await sendCerBastCompletedEmail({
      applicantEmail: request.applicantEmail,
      applicantName: request.applicantName || 'Pemohon',
      bastNumber,
      cerNumber: request.req.cerNumber,
      subject: request.req.subject,
      gaName,
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

    revalidatePath('/dashboard/assets/cer')
    return { success: true, message: `Pagu CapEx ${input.budgetCode} berhasil ditambahkan.` }
  }
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
