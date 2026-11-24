'use server'

import { db } from '@/db'
import { assetTransfers, type AssetTransferRow } from '@/db/schema/asset-transfer'
import { centralServiceAssets, centralServiceAssetHistories } from '@/db/schema/central-service'
import { employees, sites, approvals, masterDepartments } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployeeAccessContext, isSuperAdminRole } from '@/lib/hero-access'
import { isSuperAdminUser } from '@/lib/role-utils'
import { resolveApprovalRouteForActivity } from '@/lib/approval-engine'
import { resolveAssetTestingApprover } from '@/lib/asset-testing-guard'
import { and, desc, eq, ilike, or, sql, asc, inArray, gte, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { generateAssetTransferPdf } from '@/lib/asset-transfer-pdf'
import { saveGeneratedPdfUpload } from '@/lib/save-pdf-upload'
import { assetTransferInputSchema, type AssetTransferInput } from './schema'
import { sendAssetRevisionRequestedEmail, sendAssetResubmittedEmail } from '@/lib/asset-approval-email'
import {
  sendAssetTransferSubmittedEmail,
  sendAssetTransferFullApprovedEmail,
  sendAssetTransferRejectedEmail,
} from '@/lib/asset-transfer-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getPublicAppUrl } from '@/lib/auth-config'

/**
 * Fetch Asset Transfer list with filter and KPI stats
 */
export async function getAssetTransfers(params?: {
  search?: string
  status?: string
  startDate?: string | Date
  endDate?: string | Date
  page?: number
  pageSize?: number
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized', items: [], total: 0, kpi: { total: 0, pending: 0, approved: 0, rejected: 0 } }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    let currentEmp: any = null
    if (session.user.email) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      currentEmp = emp || null
    }
    const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)

    const search = params?.search?.trim() || ''
    const statusFilter = params?.status?.trim() || ''
    const page = Math.max(1, params?.page || 1)
    const pageSize = Math.max(1, Math.min(100, params?.pageSize || 25))
    const offset = (page - 1) * pageSize

    const conditions = []

    if (search) {
      conditions.push(
        or(
          ilike(assetTransfers.transferNumber, `%${search}%`),
          ilike(assetTransfers.assetName, `%${search}%`),
          ilike(assetTransfers.assetNumber, `%${search}%`),
          ilike(assetTransfers.currentHolderName, `%${search}%`),
          ilike(assetTransfers.newHolderName, `%${search}%`),
          ilike(assetTransfers.currentLocationName, `%${search}%`),
          ilike(assetTransfers.targetLocationName, `%${search}%`)
        )
      )
    }

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(assetTransfers.status, statusFilter))
    }

    if (params?.startDate) {
      const start = new Date(params.startDate)
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0)
        conditions.push(gte(assetTransfers.createdAt, start))
      }
    }

    if (params?.endDate) {
      const end = new Date(params.endDate)
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999)
        conditions.push(lte(assetTransfers.createdAt, end))
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, totalResult, kpiStats] = await Promise.all([
      db
        .select({
          id: assetTransfers.id,
          transferNumber: assetTransfers.transferNumber,
          assetId: assetTransfers.assetId,
          assetName: assetTransfers.assetName,
          assetNumber: assetTransfers.assetNumber,
          serialNumber: assetTransfers.serialNumber,
          equipmentChecklist: assetTransfers.equipmentChecklist,
          equipmentOtherNote: assetTransfers.equipmentOtherNote,
          assetPhotos: assetTransfers.assetPhotos,
          receivedPhotos: assetTransfers.receivedPhotos,
          currentHolderEmployeeId: assetTransfers.currentHolderEmployeeId,
          currentHolderName: assetTransfers.currentHolderName,
          currentLocationSiteId: assetTransfers.currentLocationSiteId,
          currentLocationName: assetTransfers.currentLocationName,
          newHolderEmployeeId: assetTransfers.newHolderEmployeeId,
          newHolderName: assetTransfers.newHolderName,
          targetLocationSiteId: assetTransfers.targetLocationSiteId,
          targetLocationName: assetTransfers.targetLocationName,
          notes: assetTransfers.notes,
          status: assetTransfers.status,
          currentStepOrder: assetTransfers.currentStepOrder,
          currentApproverTitle: assetTransfers.currentApproverTitle,
          currentApproverName: assetTransfers.currentApproverName,
          currentApproverEmployeeId: assetTransfers.currentApproverEmployeeId,
          createdById: assetTransfers.createdById,
          applicantEmployeeId: assetTransfers.applicantEmployeeId,
          applicantSignatureUrl: assetTransfers.applicantSignatureUrl,
          pdfUrl: assetTransfers.pdfUrl,
          createdAt: assetTransfers.createdAt,
          submittedAt: assetTransfers.submittedAt,
        })
        .from(assetTransfers)
        .where(whereClause)
        .orderBy(desc(assetTransfers.createdAt))
        .limit(pageSize)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(assetTransfers)
        .where(whereClause),

      db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${assetTransfers.status} in ('pending', 'in_review', 'draft'))::int`,
          approved: sql<number>`count(*) filter (where ${assetTransfers.status} in ('approved', 'completed'))::int`,
          rejected: sql<number>`count(*) filter (where ${assetTransfers.status} = 'rejected')::int`,
        })
        .from(assetTransfers),
    ])

    const transferIds = items.map((i) => i.id)
    const pendingApprovals = transferIds.length > 0
      ? await db
          .select({
            id: approvals.id,
            assetTransferId: approvals.assetTransferId,
            level: approvals.level,
            approverEmployeeId: approvals.approverEmployeeId,
            approverName: approvals.approverName,
            status: approvals.status,
          })
          .from(approvals)
          .where(
            and(
              inArray(approvals.assetTransferId, transferIds),
              eq(approvals.status, 'Pending')
            )
          )
      : []

    const mappedItems = items.map((item) => {
      const pendingStep = pendingApprovals.find((a) => a.assetTransferId === item.id)
      const isPendingOrInReview = ['pending', 'in_review', 'draft'].includes(item.status)
      const canApprove = Boolean(
        isPendingOrInReview &&
          (isSuperAdmin ||
            (empContext?.employeeId &&
              (item.currentApproverEmployeeId === empContext.employeeId ||
                pendingStep?.approverEmployeeId === empContext.employeeId)))
      )
      const canCancel = Boolean(
        isPendingOrInReview &&
          (isSuperAdmin ||
            item.createdById === session.user.id ||
            (empContext?.employeeId && item.applicantEmployeeId === empContext.employeeId))
      )
      const canEditRevision = Boolean(
        item.status === 'needs_revision' &&
          (isSuperAdmin ||
            item.createdById === session.user.id ||
            (empContext?.employeeId && item.applicantEmployeeId === empContext.employeeId) ||
            (empContext?.employeeId && item.currentHolderEmployeeId === empContext.employeeId))
      )
      return {
        ...item,
        currentApprovalId: pendingStep?.id || null,
        canApprove,
        canCancel,
        canEditRevision,
        canDownload: Boolean(isSuperAdmin || item.createdById === session.user.id || (empContext?.employeeId && (item.applicantEmployeeId === empContext.employeeId || item.currentHolderEmployeeId === empContext.employeeId || item.newHolderEmployeeId === empContext.employeeId))),
      }
    })

    return {
      success: true,
      items: mappedItems,
      total: totalResult[0]?.count || 0,
      kpi: kpiStats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 },
      currentAuth: {
        userId: session.user.id,
        employeeId: empContext?.employeeId ?? null,
        isSuperAdmin,
      },
    }
  } catch (error: any) {
    console.error('[getAssetTransfers] Error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal memuat daftar transfer aset',
      items: [],
      total: 0,
      kpi: { total: 0, pending: 0, approved: 0, rejected: 0 },
    }
  }
}

/**
 * Get master assets for dropdown
 */
export async function getMasterAssetsForTransfer() {
  try {
    const assets = await db
      .select({
        id: centralServiceAssets.id,
        description: centralServiceAssets.description,
        assetNumber: centralServiceAssets.assetNumber,
        serialNumber: centralServiceAssets.serialNumber,
        location: centralServiceAssets.location,
        condition: centralServiceAssets.condition,
        workSection: centralServiceAssets.workSection,
        section: centralServiceAssets.section,
        holderEmployeeId: centralServiceAssets.holderEmployeeId,
        holderName: employees.name,
        holderEmployeeSn: employees.employeeSn,
      })
      .from(centralServiceAssets)
      .leftJoin(employees, eq(centralServiceAssets.holderEmployeeId, employees.id))
      .orderBy(centralServiceAssets.description)
      .limit(500)

    return { success: true, data: assets }
  } catch (error: any) {
    console.error('[getMasterAssetsForTransfer] Error:', error)
    return { success: false, data: [] }
  }
}

/**
 * Get active employees for holder selection
 */
export async function getEmployeesForTransfer() {
  try {
    const data = await db
      .select({
        id: employees.id,
        employeeSn: employees.employeeSn,
        name: employees.name,
        position: employees.jobTitle,
        siteId: employees.siteId,
        siteName: employees.workLocation,
        departmentName: employees.department,
        directManagerId: employees.directManagerId,
      })
      .from(employees)
      .orderBy(employees.name)
      .limit(1000)

    return { success: true, data }
  } catch (error: any) {
    console.error('[getEmployeesForTransfer] Error:', error)
    return { success: false, data: [] }
  }
}

/**
 * Get sites for location selection
 */
export async function getSitesForTransfer() {
  try {
    const data = await db
      .select({
        id: sites.id,
        name: sites.name,
        code: sites.location,
      })
      .from(sites)
      .orderBy(sites.name)

    return { success: true, data }
  } catch (error: any) {
    console.error('[getSitesForTransfer] Error:', error)
    return { success: false, data: [] }
  }
}

/**
 * Create a new Asset Transfer request
 */
export async function createAssetTransfer(rawInput: AssetTransferInput) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    const parsed = assetTransferInputSchema.safeParse(rawInput)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join(', ')
      return { success: false, message: `Validasi gagal: ${issues}` }
    }
    const input = parsed.data

    let currentEmp: any = null
    if (session.user.email) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      currentEmp = emp || null
    }

    // 1. Fetch Asset snapshot
    const [asset] = await db
      .select()
      .from(centralServiceAssets)
      .where(eq(centralServiceAssets.id, input.assetId))
      .limit(1)

    if (!asset) {
      return { success: false, message: 'Data master aset tidak ditemukan.' }
    }

    // 2. Fetch Employee snapshots
    const [currentHolder] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, input.currentHolderEmployeeId))
      .limit(1)

    const [newHolder] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, input.newHolderEmployeeId))
      .limit(1)

    if (!currentHolder || !newHolder) {
      return { success: false, message: 'Data karyawan pemegang aset tidak valid.' }
    }

    // 3. Fetch Sites snapshots
    const [currentSite] = await db
      .select()
      .from(sites)
      .where(eq(sites.id, input.currentLocationSiteId))
      .limit(1)

    const [targetSite] = await db
      .select()
      .from(sites)
      .where(eq(sites.id, input.targetLocationSiteId))
      .limit(1)

    if (!currentSite || !targetSite) {
      return { success: false, message: 'Data lokasi site tidak valid.' }
    }

    // 4. Generate sequential Transfer Number: TRF-YYYYMM-XXXX
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const prefix = `TRF-${yearMonth}-`

    const [lastRecord] = await db
      .select({ transferNumber: assetTransfers.transferNumber })
      .from(assetTransfers)
      .where(ilike(assetTransfers.transferNumber, `${prefix}%`))
      .orderBy(desc(assetTransfers.id))
      .limit(1)

    let nextSeq = 1
    if (lastRecord?.transferNumber) {
      const parts = lastRecord.transferNumber.split('-')
      const num = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(num)) {
        nextSeq = num + 1
      }
    }
    const transferNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`

    // 5. Resolve 4-Step Approval Chain:
    // Step 1: Pemegang Saat Ini (Pelepasan Aset)
    // Step 2: Atasan Langsung Current Holder (Persetujuan Pelepasan Aset)
    // Step 3: New Holder (Penerima Konfirmasi Serah Terima Fisik)
    // Step 4: Atasan Langsung New Holder (Penerimaan ke Unit Kerja)

    const isApplicantCurrentHolder = Boolean(
      (currentEmp?.id && currentEmp.id === currentHolder.id) ||
      (currentHolder.email && session.user.email && currentHolder.email.toLowerCase() === session.user.email.toLowerCase())
    )

    // Step 1: Pemegang Saat Ini (Current Holder)
    const step1ApproverId = currentHolder.id
    const step1ApproverName = currentHolder.name
    const step1ApproverEmail = currentHolder.email || null
    const step1Status = isApplicantCurrentHolder ? 'Approved' : 'Pending'
    const step1ReviewedAt = isApplicantCurrentHolder ? now : null
    const step1Sig = isApplicantCurrentHolder ? input.applicantSignatureUrl : null

    // Step 2: Atasan Langsung Current Holder
    let step2ApproverId = input.currentHolderManagerId || currentHolder.directManagerId || null
    let step2ApproverName = 'Atasan Langsung Current Holder'
    let step2ApproverEmail = currentHolder.email || null
    let step2ApproverJobTitle = 'Atasan Langsung Current Holder'
    if (step2ApproverId) {
      const [mgr2] = await db
        .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle, email: employees.email })
        .from(employees)
        .where(eq(employees.id, step2ApproverId))
        .limit(1)
      if (mgr2) {
        step2ApproverName = mgr2.name
        step2ApproverEmail = mgr2.email || null
        step2ApproverJobTitle = mgr2.jobTitle || 'Atasan Langsung Current Holder'
      }
    } else {
      step2ApproverId = currentHolder.id
      step2ApproverName = currentHolder.name
      step2ApproverEmail = currentHolder.email || null
    }
    const step2Status = isApplicantCurrentHolder ? 'Pending' : 'Draft'

    // Step 3: Pemegang Baru (New Holder)
    const step3ApproverId = newHolder.id
    const step3ApproverName = newHolder.name
    const step3ApproverEmail = newHolder.email || null
    const step3Status = 'Draft'

    // Step 4: Atasan Langsung New Holder
    let step4ApproverId = input.newHolderManagerId || newHolder.directManagerId || null
    let step4ApproverName = 'Atasan Langsung New Holder'
    let step4ApproverEmail = newHolder.email || null
    let step4ApproverJobTitle = 'Atasan Langsung New Holder'
    if (step4ApproverId) {
      const [mgr4] = await db
        .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle, email: employees.email })
        .from(employees)
        .where(eq(employees.id, step4ApproverId))
        .limit(1)
      if (mgr4) {
        step4ApproverName = mgr4.name
        step4ApproverEmail = mgr4.email || null
        step4ApproverJobTitle = mgr4.jobTitle || 'Atasan Langsung New Holder'
      }
    } else {
      step4ApproverId = newHolder.id
      step4ApproverName = newHolder.name
      step4ApproverEmail = newHolder.email || null
    }
    const step4Status = 'Draft'

    const approvalChain = [
      {
        level: 1,
        title: 'Step 1: Pemegang Saat Ini (Pelepasan Aset)',
        approverName: step1ApproverName,
        approverEmployeeId: step1ApproverId,
        approverEmail: step1ApproverEmail,
        status: step1Status,
        reviewedAt: step1ReviewedAt,
        signatureUrl: step1Sig,
      },
      {
        level: 2,
        title: 'Step 2: Atasan Langsung Pemegang Lama (Pelepasan Aset)',
        approverName: step2ApproverName,
        approverEmployeeId: step2ApproverId,
        approverEmail: step2ApproverEmail,
        status: step2Status,
        reviewedAt: null,
        signatureUrl: null,
      },
      {
        level: 3,
        title: 'Step 3: Pemegang Baru (Konfirmasi Serah Terima Fisik)',
        approverName: step3ApproverName,
        approverEmployeeId: step3ApproverId,
        approverEmail: step3ApproverEmail,
        status: step3Status,
        reviewedAt: null,
        signatureUrl: null,
      },
      {
        level: 4,
        title: 'Step 4: Atasan Langsung Pemegang Baru (Penerimaan Aset)',
        approverName: step4ApproverName,
        approverEmployeeId: step4ApproverId,
        approverEmail: step4ApproverEmail,
        status: step4Status,
        reviewedAt: null,
        signatureUrl: null,
      },
    ]

    const initialStepOrder = isApplicantCurrentHolder ? 2 : 1
    const initialApproverTitle = isApplicantCurrentHolder
      ? 'Atasan Langsung Pemegang Lama'
      : 'Pemegang Saat Ini (Pelepasan Aset)'
    const initialApproverName = isApplicantCurrentHolder ? step2ApproverName : step1ApproverName
    const initialApproverId = isApplicantCurrentHolder ? step2ApproverId : step1ApproverId

    // 6. Insert Asset Transfer Record
    const [newTransfer] = await db
      .insert(assetTransfers)
      .values({
        transferNumber,
        assetId: asset.id,
        assetName: asset.description,
        assetNumber: asset.assetNumber || '',
        serialNumber: asset.serialNumber || '',
        equipmentChecklist: input.equipmentChecklist,
        equipmentOtherNote: input.equipmentOtherNote || null,
        assetPhotos: JSON.stringify(input.assetPhotos || []),
        currentHolderEmployeeId: currentHolder.id,
        currentHolderName: currentHolder.name,
        currentLocationSiteId: currentSite.id,
        currentLocationName: currentSite.name,
        newHolderEmployeeId: newHolder.id,
        newHolderName: newHolder.name,
        targetLocationSiteId: targetSite.id,
        targetLocationName: targetSite.name,
        notes: input.notes || null,
        status: 'pending',
        currentStepOrder: initialStepOrder,
        currentApproverTitle: initialApproverTitle,
        currentApproverName: initialApproverName,
        currentApproverEmployeeId: initialApproverId,
        createdById: session.user.id,
        applicantEmployeeId: currentEmp?.id || currentHolder.id,
        applicantSignatureUrl: input.applicantSignatureUrl,
        submittedAt: now,
      })
      .returning()

    // 7. Insert 4 steps into hero_approvals for central inbox integration
    for (const step of approvalChain) {
      const resolvedStep = await resolveAssetTestingApprover({
        approverEmployeeId: step.approverEmployeeId,
        approverName: step.approverName,
        approverEmail: step.approverEmail,
      })

      await db.insert(approvals).values({
        assetTransferId: newTransfer.id,
        level: step.level,
        approverName: resolvedStep.approverName || step.approverName,
        approverEmployeeId: resolvedStep.approverEmployeeId,
        approverEmail: resolvedStep.approverEmail,
        status: step.status,
        submittedAt: now,
        reviewedAt: step.reviewedAt,
        signatureUrl: step.signatureUrl,
        activityType: 'asset_transfer',
        requestNumber: transferNumber,
        activityTitle: `Transfer Aset: ${asset.description} (${asset.assetNumber || '-'})`,
        formName: 'Transfer Aset',
        decisionNote: step.title,
        resolutionSource: 'matrix',
      })
    }

    // 8. Notify Active Approver via CER-style Email and HERO Notification Center
    const notifyApproverId = initialApproverId
    if (notifyApproverId) {
      try {
        const [activeApproverEmp] = await db
          .select({ email: employees.email, name: employees.name, jobTitle: employees.jobTitle })
          .from(employees)
          .where(eq(employees.id, notifyApproverId))
          .limit(1)

        if (activeApproverEmp?.email) {
          const appUrl = getPublicAppUrl()
          const equipmentText =
            input.equipmentOtherNote ||
            (Array.isArray(input.equipmentChecklist) && input.equipmentChecklist.length > 0
              ? input.equipmentChecklist.join(', ')
              : 'Unit Lengkap beserta perlengkapan standar')

          const resolvedNotify = await resolveAssetTestingApprover({
            approverEmployeeId: notifyApproverId,
            approverName: activeApproverEmp.name || initialApproverName,
            approverEmail: activeApproverEmp.email,
          })

          // Send CER-style Email notification
          await sendAssetTransferSubmittedEmail({
            approverEmail: activeApproverEmp.email,
            approverName: activeApproverEmp.name || initialApproverName,
            approverJobTitle: activeApproverEmp.jobTitle || initialApproverTitle,
            transferNumber,
            assetName: asset.description,
            assetNumber: asset.assetNumber || '',
            serialNumber: asset.serialNumber || '',
            currentHolderName: currentHolder.name,
            currentHolderJobTitle: currentHolder.jobTitle || null,
            currentLocationName: currentSite.name,
            newHolderName: newHolder.name,
            newHolderJobTitle: newHolder.jobTitle || null,
            targetLocationName: targetSite.name,
            equipmentText,
            notes: input.notes || null,
            applicantName: currentEmp?.name || currentHolder.name,
            applicantSn: currentEmp?.employeeSn || currentHolder.employeeSn || null,
            applicantJobTitle: currentEmp?.jobTitle || currentHolder.jobTitle || null,
            approvalStepTitle: initialApproverTitle,
            approvalStepLevel: initialStepOrder,
            approvalUrl: `${appUrl}/dashboard/approval`,
          })

          // Send in-app Bell Notification (redirect to testing approver if testing mode)
          await notifyWorkflowBellRecipients({
            recipientEmails: [resolvedNotify.approverEmail || activeApproverEmp.email],
            eventType: 'asset_transfer.approval_requested',
            category: 'approval_requests',
            title: `${resolvedNotify.isTesting ? '[TESTING] ' : ''}Persetujuan Transfer Aset: ${transferNumber}`,
            body: `Permohonan transfer aset "${asset.description}" (${currentHolder.name} -> ${newHolder.name}) menunggu persetujuan Anda.`,
            url: '/dashboard/approval',
          })
        }
      } catch (notifErr) {
        console.error('[createAssetTransfer] Notification error:', notifErr)
      }
    }

    revalidatePath('/dashboard/assets/transfer')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Form Transfer Aset ${transferNumber} berhasil diajukan.`,
      transferNumber,
      id: newTransfer.id,
    }
  } catch (error: any) {
    console.error('[createAssetTransfer] Error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal menyimpan pengajuan transfer aset.',
    }
  }
}

/**
 * Get detail of a transfer record
 */
export async function getAssetTransferDetail(id: number) {
  try {
    const session = await getServerSession()
    const empContext = await getCurrentEmployeeAccessContext()
    let currentEmp: any = null
    if (session.user.email) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      currentEmp = emp || null
    }
    const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)

    const [transfer] = await db
      .select()
      .from(assetTransfers)
      .where(eq(assetTransfers.id, id))
      .limit(1)

    if (!transfer) {
      return { success: false, message: 'Data transfer aset tidak ditemukan.' }
    }

    // Fetch related approval rows
    const approvalSteps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.assetTransferId, id))
      .orderBy(approvals.level)

    const isPendingOrInReview = ['pending', 'in_review', 'draft'].includes(transfer.status)
    const activeStep = approvalSteps.find((s) => s.status === 'Pending' || s.level === transfer.currentStepOrder)
    const currentApproverId = transfer.currentApproverEmployeeId || activeStep?.approverEmployeeId

    const canApprove = Boolean(
      isPendingOrInReview &&
        (isSuperAdmin || (empContext?.employeeId && currentApproverId === empContext.employeeId))
    )
    const canCancel = Boolean(
      isPendingOrInReview &&
        (isSuperAdmin ||
          (session?.user?.id && transfer.createdById === session.user.id) ||
          (empContext?.employeeId && transfer.applicantEmployeeId === empContext.employeeId))
    )

    const canEditRevision = Boolean(
      transfer.status === 'needs_revision' &&
        (isSuperAdmin ||
          (session?.user?.id && transfer.createdById === session.user.id) ||
          (empContext?.employeeId && transfer.applicantEmployeeId === empContext.employeeId) ||
          (empContext?.employeeId && transfer.currentHolderEmployeeId === empContext.employeeId))
    )

    const isNewHolderStep = Boolean(
      transfer.currentStepOrder === 2 ||
      transfer.currentApproverEmployeeId === transfer.newHolderEmployeeId
    )

    return {
      success: true,
      data: {
        ...transfer,
        photos: JSON.parse(transfer.assetPhotos || '[]'),
        receivedPhotos: JSON.parse(transfer.receivedPhotos || '[]'),
        approvalSteps,
        canApprove,
        canCancel,
        canEditRevision,
        canDownload: Boolean(isSuperAdmin || (session?.user?.id && transfer.createdById === session.user.id) || (empContext?.employeeId && (transfer.applicantEmployeeId === empContext.employeeId || transfer.currentHolderEmployeeId === empContext.employeeId || transfer.newHolderEmployeeId === empContext.employeeId))),
        isNewHolderStep,
      },
    }
  } catch (error: any) {
    console.error('[getAssetTransferDetail] Error:', error)
    return { success: false, message: error?.message || 'Gagal mengambil detail transfer aset.' }
  }
}

/**
 * Approve step / Final Approve
 */
export async function approveAssetTransfer(
  id: number,
  decisionNote?: string,
  receivedPhotos?: Array<{ fileName: string; fileUrl: string; fileSize?: number; mimeType?: string }>,
  signatureUrl?: string
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    if (!decisionNote || !decisionNote.trim()) {
      return { success: false, message: 'Catatan persetujuan wajib diisi.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    let currentEmp: any = null
    if (session.user.email) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      currentEmp = emp || null
    }
    const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)

    const [transfer] = await db
      .select()
      .from(assetTransfers)
      .where(eq(assetTransfers.id, id))
      .limit(1)

    if (!transfer) {
      return { success: false, message: 'Data transfer tidak ditemukan.' }
    }

    if (!['pending', 'in_review'].includes(transfer.status)) {
      return { success: false, message: 'Pengajuan transfer ini tidak dalam status menunggu persetujuan.' }
    }

    const isCurrentApprover = empContext?.employeeId && transfer.currentApproverEmployeeId === empContext.employeeId
    if (!isSuperAdmin && !isCurrentApprover) {
      return { success: false, message: 'Anda tidak memiliki hak akses untuk menyetujui tahap ini.' }
    }

    const now = new Date()

    // Mark current pending approval row as Approved
    await db
      .update(approvals)
      .set({
        status: 'Approved',
        reviewedAt: now,
        decisionNote: (decisionNote || 'Disetujui').trim(),
        signatureUrl: signatureUrl || undefined,
      })
      .where(
        and(
          eq(approvals.assetTransferId, id),
          eq(approvals.level, transfer.currentStepOrder)
        )
      )

    // Check if there is next step
    const nextSteps = await db
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.assetTransferId, id),
          eq(approvals.level, transfer.currentStepOrder + 1)
        )
      )
      .limit(1)

    const updateData: Record<string, any> = {
      updatedAt: now,
    }

    if (receivedPhotos && receivedPhotos.length > 0) {
      updateData.receivedPhotos = JSON.stringify(receivedPhotos)
    }

    if (nextSteps.length > 0) {
      const next = nextSteps[0]
      await db
        .update(approvals)
        .set({ status: 'Pending' })
        .where(eq(approvals.id, next.id))

      await db
        .update(assetTransfers)
        .set({
          ...updateData,
          currentStepOrder: transfer.currentStepOrder + 1,
          currentApproverName: next.approverName,
          currentApproverEmployeeId: next.approverEmployeeId,
          currentApproverTitle: next.decisionNote || `Step ${next.level}`,
          status: 'in_review',
        })
        .where(eq(assetTransfers.id, id))

      // Notify next approver via CER-style Email and HERO Notification Center
      if (next.approverEmployeeId) {
        try {
          const [nextEmp] = await db
            .select({ email: employees.email, name: employees.name, jobTitle: employees.jobTitle })
            .from(employees)
            .where(eq(employees.id, next.approverEmployeeId))
            .limit(1)

          if (nextEmp?.email) {
            const appUrl = getPublicAppUrl()
            await sendAssetTransferSubmittedEmail({
              approverEmail: nextEmp.email,
              approverName: nextEmp.name || next.approverName,
              approverJobTitle: nextEmp.jobTitle || next.decisionNote,
              transferNumber: transfer.transferNumber,
              assetName: transfer.assetName,
              assetNumber: transfer.assetNumber || '',
              serialNumber: transfer.serialNumber || '',
              currentHolderName: transfer.currentHolderName,
              currentLocationName: transfer.currentLocationName,
              newHolderName: transfer.newHolderName,
              targetLocationName: transfer.targetLocationName,
              equipmentText:
                transfer.equipmentOtherNote ||
                (Array.isArray(transfer.equipmentChecklist) && transfer.equipmentChecklist.length > 0
                  ? transfer.equipmentChecklist.join(', ')
                  : 'Unit Lengkap beserta perlengkapan standar'),
              notes: transfer.notes || null,
              applicantName: transfer.currentHolderName,
              approvalStepTitle: next.decisionNote || `Tahap ${next.level}`,
              approvalStepLevel: next.level,
              approvalUrl: `${appUrl}/dashboard/approval`,
            })

            await notifyWorkflowBellRecipients({
              recipientEmails: [nextEmp.email],
              eventType: 'asset_transfer.approval_requested',
              category: 'approval_requests',
              title: `Persetujuan Transfer Aset: ${transfer.transferNumber}`,
              body: `Pengajuan transfer aset "${transfer.assetName}" telah disetujui di tahap sebelumnya dan siap Anda tinjau.`,
              url: '/dashboard/approval',
            })
          }
        } catch (notifErr) {
          console.error('[approveAssetTransfer] Step notification error:', notifErr)
        }
      }
    } else {
      // Final Approved (Step 4)! Generate Official PDF Document
      let pdfUrl: string | null = null
      try {
        const [applicant, holderEmp, newHolderEmp] = await Promise.all([
          db
            .select({
              name: employees.name,
              jobTitle: employees.jobTitle,
              department: masterDepartments.name,
              section: employees.section,
            })
            .from(employees)
            .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
            .where(eq(employees.id, transfer.applicantEmployeeId || 0))
            .limit(1)
            .then((r) => r[0] || null),
          db
            .select({ jobTitle: employees.jobTitle })
            .from(employees)
            .where(eq(employees.id, transfer.currentHolderEmployeeId))
            .limit(1)
            .then((r) => r[0] || null),
          db
            .select({ jobTitle: employees.jobTitle })
            .from(employees)
            .where(eq(employees.id, transfer.newHolderEmployeeId))
            .limit(1)
            .then((r) => r[0] || null),
        ])

        const allApprovals = await db
          .select({
            id: approvals.id,
            level: approvals.level,
            label: approvals.decisionNote,
            approverName: approvals.approverName,
            status: approvals.status,
            signedAt: approvals.reviewedAt,
            signatureUrl: approvals.signatureUrl,
            jobTitle: employees.jobTitle,
          })
          .from(approvals)
          .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
          .where(eq(approvals.assetTransferId, id))
          .orderBy(asc(approvals.level))

        const pdfApprovers = allApprovals.map((s) => ({
          level: s.level,
          label: s.label || `Tahap ${s.level}`,
          approverName: s.approverName,
          approverJobTitle: s.jobTitle || null,
          status: s.status,
          signedAt: s.signedAt,
          signatureUrl: s.signatureUrl,
        }))

        const completenessText =
          transfer.equipmentOtherNote ||
          (Array.isArray(transfer.equipmentChecklist) && transfer.equipmentChecklist.length > 0
            ? transfer.equipmentChecklist.join(', ')
            : 'Unit Lengkap beserta perlengkapan standar')

        const parsedPhotos: Array<{ fileName: string; fileUrl: string }> = (() => {
          try {
            const arr = JSON.parse(transfer.assetPhotos || '[]')
            return Array.isArray(arr) ? arr : []
          } catch {
            return []
          }
        })()

        const pdfBytes = await generateAssetTransferPdf({
          transferNumber: transfer.transferNumber,
          requestDate: transfer.requestDate,
          applicantName: applicant?.name || transfer.applicantName || 'Pemohon',
          applicantJobTitle: applicant?.jobTitle,
          applicantSignatureUrl: transfer.applicantSignatureUrl,
          departmentName: applicant?.department || transfer.currentLocationName,
          sectionName: applicant?.section,
          assetName: transfer.assetName,
          assetNumber: transfer.assetNumber,
          serialNumber: transfer.serialNumber,
          equipmentText: completenessText,
          currentHolderName: transfer.currentHolderName,
          currentLocationName: transfer.currentLocationName,
          targetHolderName: transfer.newHolderName,
          targetLocationName: transfer.targetLocationName,
          currentHolderJobTitle: holderEmp?.jobTitle || 'Pemegang Asal',
          newHolderJobTitle: newHolderEmp?.jobTitle || 'Pemegang Baru',
          reason: transfer.notes || transfer.reason || 'Mutasi dan pemindahan penugasan operasional aset',
          notes: transfer.notes,
          assetPhotos: parsedPhotos,
          photoUrl: parsedPhotos[0]?.fileUrl || null,
          approvers: pdfApprovers,
        })

        pdfUrl = await saveGeneratedPdfUpload(pdfBytes, 'asset-transfer', transfer.transferNumber)
      } catch (pdfErr) {
        console.error('[approveAssetTransfer] PDF generation error:', pdfErr)
      }

      await db
        .update(assetTransfers)
        .set({
          ...updateData,
          status: 'approved',
          pdfUrl: pdfUrl || undefined,
          transferredAt: now,
        })
        .where(eq(assetTransfers.id, id))

      if (transfer.assetId) {
        // 1. Update Central Service Asset Master Data (Holder & Location)
        await db
          .update(centralServiceAssets)
          .set({
            holderEmployeeId: transfer.newHolderEmployeeId,
            location: transfer.targetLocationName,
            updatedAt: now,
          })
          .where(eq(centralServiceAssets.id, transfer.assetId))

        // 2. Insert record into Central Service Asset Histories
        await db.insert(centralServiceAssetHistories).values({
          assetId: transfer.assetId,
          action: 'TRANSFER_APPROVED',
          fieldName: 'holder_and_location',
          fieldLabel: 'Pemegang & Lokasi Aset',
          previousValue: `${transfer.currentHolderName} (${transfer.currentLocationName})`,
          newValue: `${transfer.newHolderName} (${transfer.targetLocationName})`,
          changeRemark: `Mutasi resmi disetujui via Transfer Aset No. ${transfer.transferNumber}`,
        })
      }

      // Notify applicant & holders via CER-style Email (with PDF Attachment) & HERO Notification Center
      try {
        const [appEmp, holderEmp, newHolderEmp] = await Promise.all([
          transfer.applicantEmployeeId
            ? db
                .select({ email: employees.email, name: employees.name })
                .from(employees)
                .where(eq(employees.id, transfer.applicantEmployeeId))
                .limit(1)
                .then((r) => r[0] || null)
            : null,
          transfer.currentHolderEmployeeId
            ? db
                .select({ email: employees.email, name: employees.name })
                .from(employees)
                .where(eq(employees.id, transfer.currentHolderEmployeeId))
                .limit(1)
                .then((r) => r[0] || null)
            : null,
          transfer.newHolderEmployeeId
            ? db
                .select({ email: employees.email, name: employees.name })
                .from(employees)
                .where(eq(employees.id, transfer.newHolderEmployeeId))
                .limit(1)
                .then((r) => r[0] || null)
            : null,
        ])

        const applicantEmail = appEmp?.email || holderEmp?.email || session.user.email
        if (applicantEmail) {
          await sendAssetTransferFullApprovedEmail({
            applicantEmail,
            applicantName: appEmp?.name || applicant?.name || transfer.applicantName || 'Pemohon',
            currentHolderEmail: holderEmp?.email,
            currentHolderName: transfer.currentHolderName,
            newHolderEmail: newHolderEmp?.email,
            newHolderName: transfer.newHolderName,
            transferNumber: transfer.transferNumber,
            assetName: transfer.assetName,
            assetNumber: transfer.assetNumber || '',
            serialNumber: transfer.serialNumber || '',
            currentLocationName: transfer.currentLocationName,
            targetLocationName: transfer.targetLocationName,
            equipmentText: completenessText,
            notes: transfer.notes || null,
            pdfBuffer: pdfBytes ? Buffer.from(pdfBytes) : undefined,
            pdfUrl: pdfUrl || undefined,
            transferId: id,
            cc: [
              'syamsul.bahri@chitraparatama.co.id',
              'evo.yulianti@chitraparatama.co.id',
            ],
          })
        }

        const empIdsToNotify = Array.from(
          new Set(
            [
              transfer.applicantEmployeeId,
              transfer.currentHolderEmployeeId,
              transfer.newHolderEmployeeId,
            ].filter(Boolean)
          )
        )

        if (empIdsToNotify.length > 0) {
          const empRows = await db
            .select({ email: employees.email })
            .from(employees)
            .where(inArray(employees.id, empIdsToNotify as number[]))

          const emails = Array.from(
            new Set([
              ...empRows.map((e) => e.email).filter(Boolean),
              'syamsul.bahri@chitraparatama.co.id',
              'evo.yulianti@chitraparatama.co.id',
            ])
          )
          if (emails.length > 0) {
            await notifyWorkflowBellRecipients({
              recipientEmails: emails,
              eventType: 'asset_transfer.approved',
              category: 'info',
              title: `Transfer Aset Disetujui Penuh: ${transfer.transferNumber}`,
              body: `Mutasi aset "${transfer.assetName}" ke ${transfer.newHolderName} telah disetujui penuh. Berita Acara resmi telah terbit.`,
              url: '/dashboard/assets/transfer',
            })
          }
        }
      } catch (notifErr) {
        console.error('[approveAssetTransfer] Final notification error:', notifErr)
      }
    }

    revalidatePath('/dashboard/assets/transfer')
    revalidatePath('/dashboard/central-service/assets')
    revalidatePath('/dashboard/approval')

    return { success: true, message: 'Persetujuan berhasil diproses.' }
  } catch (error: any) {
    console.error('[approveAssetTransfer] Error:', error)
    return { success: false, message: error?.message || 'Gagal memproses approval.' }
  }
}

/**
 * Reject transfer request
 */
export async function rejectAssetTransfer(id: number, reason: string) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    if (!reason || !reason.trim()) {
      return { success: false, message: 'Alasan penolakan wajib diisi.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    let currentEmp: any = null
    if (session.user.email) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      currentEmp = emp || null
    }
    const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)

    const [transfer] = await db
      .select()
      .from(assetTransfers)
      .where(eq(assetTransfers.id, id))
      .limit(1)

    if (!transfer) {
      return { success: false, message: 'Data transfer tidak ditemukan.' }
    }

    if (!['pending', 'in_review'].includes(transfer.status)) {
      return { success: false, message: 'Pengajuan transfer ini tidak dalam status dapat ditolak.' }
    }

    const isCurrentApprover = empContext?.employeeId && transfer.currentApproverEmployeeId === empContext.employeeId
    if (!isSuperAdmin && !isCurrentApprover) {
      return { success: false, message: 'Anda tidak memiliki hak akses untuk menolak tahap ini.' }
    }

    const now = new Date()

    await db
      .update(assetTransfers)
      .set({
        status: 'rejected',
        notes: reason.trim(),
        updatedAt: now,
      })
      .where(eq(assetTransfers.id, id))

    await db
      .update(approvals)
      .set({
        status: 'Rejected',
        reviewedAt: now,
        rejectionReason: reason.trim(),
        decisionNote: reason.trim(),
      })
      .where(
        and(
          eq(approvals.assetTransferId, id),
          eq(approvals.status, 'Pending')
        )
      )

    revalidatePath('/dashboard/assets/transfer')
    revalidatePath('/dashboard/approval')

    // Notify applicant & current holder via CER-style Email & HERO Notification Center
    try {
      const [appEmp] = transfer.applicantEmployeeId
        ? await db
            .select({ email: employees.email, name: employees.name })
            .from(employees)
            .where(eq(employees.id, transfer.applicantEmployeeId))
            .limit(1)
        : [null]

      if (appEmp?.email) {
        await sendAssetTransferRejectedEmail({
          applicantEmail: appEmp.email,
          applicantName: appEmp.name || 'Pemohon',
          transferNumber: transfer.transferNumber,
          assetName: transfer.assetName,
          rejectedByName: currentEmp?.name || session.user.name || 'Approver',
          rejectionReason: reason.trim(),
        })
      }

      const empIdsToNotify = Array.from(
        new Set([transfer.applicantEmployeeId, transfer.currentHolderEmployeeId].filter(Boolean))
      )
      if (empIdsToNotify.length > 0) {
        const empRows = await db
          .select({ email: employees.email })
          .from(employees)
          .where(inArray(employees.id, empIdsToNotify as number[]))

        const emails = empRows.map((e) => e.email).filter(Boolean)
        if (emails.length > 0) {
          await notifyWorkflowBellRecipients({
            recipientEmails: emails,
            eventType: 'asset_transfer.rejected',
            category: 'approval_requests',
            title: `Transfer Aset Ditolak: ${transfer.transferNumber}`,
            body: `Pengajuan transfer aset "${transfer.assetName}" ditolak: "${reason.trim()}".`,
            url: '/dashboard/assets/transfer',
          })
        }
      }
    } catch (notifErr) {
      console.error('[rejectAssetTransfer] Notification error:', notifErr)
    }

    return { success: true, message: 'Transfer aset ditolak.' }
  } catch (error: any) {
    console.error('[rejectAssetTransfer] Error:', error)
    return { success: false, message: error?.message || 'Gagal menolak transfer.' }
  }
}

/**
 * Cancel and hard delete asset transfer request (Creator / Requester / Super Admin only)
 */
export async function cancelAssetTransfer(id: number) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    let currentEmp: any = null
    if (session.user.email) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      currentEmp = emp || null
    }
    const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)

    const [transfer] = await db
      .select()
      .from(assetTransfers)
      .where(eq(assetTransfers.id, id))
      .limit(1)

    if (!transfer) {
      return { success: false, message: 'Data pengajuan transfer aset tidak ditemukan.' }
    }

    if (!['pending', 'in_review', 'draft'].includes(transfer.status)) {
      return {
        success: false,
        message: 'Pengajuan yang sudah disetujui atau ditolak tidak dapat dibatalkan.',
      }
    }

    const isCreator =
      transfer.createdById === session.user.id ||
      (empContext?.employeeId && transfer.applicantEmployeeId === empContext.employeeId)

    if (!isSuperAdmin && !isCreator) {
      return {
        success: false,
        message: 'Hanya pembuat pengajuan yang berhak membatalkan pengajuan ini.',
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(approvals).where(eq(approvals.assetTransferId, id))
      await tx.delete(assetTransfers).where(eq(assetTransfers.id, id))
    })

    revalidatePath('/dashboard/assets/transfer')
    revalidatePath('/dashboard/approval')

    // Notify applicant via HERO Notification Center
    try {
      if (transfer.applicantEmployeeId) {
        const [appEmp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, transfer.applicantEmployeeId))
          .limit(1)

        if (appEmp?.email) {
          await notifyWorkflowBellRecipients({
            recipientEmails: [appEmp.email],
            eventType: 'asset_transfer.cancelled',
            category: 'info',
            title: `Transfer Aset Dibatalkan: ${transfer.transferNumber}`,
            body: `Pengajuan transfer aset "${transfer.assetName}" (${transfer.transferNumber}) telah dibatalkan.`,
            url: '/dashboard/assets/transfer',
          })
        }
      }
    } catch (notifErr) {
      console.error('[cancelAssetTransfer] Notification error:', notifErr)
    }

    return {
      success: true,
      message: `Pengajuan transfer aset ${transfer.transferNumber} berhasil dibatalkan dan dihapus.`,
    }
  } catch (error: any) {
    console.error('[cancelAssetTransfer] Error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal membatalkan pengajuan transfer aset.',
    }
  }
}

/**
 * Revert Asset Transfer (Kembalikan ke Pemohon untuk Revisi)
 */
export async function revertAssetTransferAction(id: number, revertReason: string) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    if (!revertReason || !revertReason.trim()) {
      return { success: false, message: 'Catatan alasan revisi wajib diisi.' }
    }

    const [transfer] = await db
      .select()
      .from(assetTransfers)
      .where(eq(assetTransfers.id, id))
      .limit(1)

    if (!transfer) {
      return { success: false, message: 'Data transfer aset tidak ditemukan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    let currentEmp: any = null
    if (session.user.email) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      currentEmp = emp || null
    }
    const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)
    const isCurrentApprover = Boolean(
      empContext?.employeeId && transfer.currentApproverEmployeeId === empContext.employeeId
    )

    if (!isSuperAdmin && !isCurrentApprover) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak akses untuk merevert pengajuan transfer ini.',
      }
    }

    const allSteps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.assetTransferId, id))
      .orderBy(approvals.level)

    const activeStep =
      allSteps.find((s) => s.status === 'Pending' || s.level === transfer.currentStepOrder) ||
      allSteps[0]

    const revertStepLevel = activeStep?.level || transfer.currentStepOrder || 1
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .update(assetTransfers)
        .set({
          status: 'needs_revision',
          lastRevertNote: revertReason.trim(),
          lastRevertStepOrder: revertStepLevel,
          lastRevertedByEmployeeId: empContext?.employeeId || null,
          updatedAt: now,
        })
        .where(eq(assetTransfers.id, id))

      if (activeStep) {
        await tx
          .update(approvals)
          .set({
            status: 'Reverted',
            reviewedAt: now,
            decisionNote: `Revisi diminta: ${revertReason.trim()}`,
            rejectionReason: revertReason.trim(),
          })
          .where(eq(approvals.id, activeStep.id))
      }
    })

    // Send email & bell notification to applicant (current holder)
    const applicantEmpId = transfer.applicantEmployeeId || transfer.currentHolderEmployeeId
    const [applicant] = applicantEmpId
      ? await db
          .select({ email: employees.email, name: employees.name })
          .from(employees)
          .where(eq(employees.id, applicantEmpId))
          .limit(1)
      : [null]

    if (applicant?.email) {
      await sendAssetRevisionRequestedEmail({
        module: 'ASSET_TRANSFER',
        applicantEmail: applicant.email,
        applicantName: applicant.name,
        documentNumber: transfer.transferNumber,
        assetName: transfer.assetName,
        revertedByName: empContext?.employeeName || transfer.currentApproverName || 'Approver',
        revertNote: revertReason.trim(),
        targetId: id,
      }).catch((err) => console.error('[revertAssetTransferAction] Email error:', err))
    }

    revalidatePath('/dashboard/assets/transfer')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Pengajuan transfer ${transfer.transferNumber} berhasil dikembalikan ke pemohon untuk revisi.`,
    }
  } catch (error: any) {
    console.error('[revertAssetTransferAction] Error:', error)
    return { success: false, message: error?.message || 'Gagal merevert pengajuan transfer aset.' }
  }
}

export const revertAssetTransfer = revertAssetTransferAction

/**
 * Resubmit Asset Transfer (Kirim Ulang Revisi oleh Pemohon -> Langsung Kembali ke Last Approver)
 */
export async function resubmitAssetTransferAction(input: {
  id: number
  notes?: string
  equipmentChecklist?: string[]
  equipmentOtherNote?: string
  assetPhotos?: string[]
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const [transfer] = await db
      .select()
      .from(assetTransfers)
      .where(eq(assetTransfers.id, input.id))
      .limit(1)

    if (!transfer) {
      return { success: false, message: 'Data transfer aset tidak ditemukan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    let currentEmp: any = null
    if (session.user.email) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      currentEmp = emp || null
    }
    const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)
    const isCreator = Boolean(
      (empContext?.employeeId && transfer.applicantEmployeeId === empContext.employeeId) ||
      (empContext?.employeeId && transfer.currentHolderEmployeeId === empContext.employeeId) ||
      (session.user.id && transfer.createdById === session.user.id)
    )

    if (!isCreator && !isSuperAdmin) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak akses untuk memperbarui pengajuan ini.',
      }
    }

    const now = new Date()
    const targetStepLevel = transfer.lastRevertStepOrder || transfer.currentStepOrder || 1

    const [targetStep] = await db
      .select()
      .from(approvals)
      .where(and(eq(approvals.assetTransferId, input.id), eq(approvals.level, targetStepLevel)))
      .limit(1)

    await db.transaction(async (tx) => {
      await tx
        .update(assetTransfers)
        .set({
          notes: input.notes !== undefined ? input.notes : transfer.notes,
          equipmentChecklist: input.equipmentChecklist !== undefined ? input.equipmentChecklist : transfer.equipmentChecklist,
          equipmentOtherNote: input.equipmentOtherNote !== undefined ? input.equipmentOtherNote : transfer.equipmentOtherNote,
          assetPhotos: input.assetPhotos ? JSON.stringify(input.assetPhotos) : transfer.assetPhotos,
          status: 'pending',
          currentStepOrder: targetStepLevel,
          currentApproverEmployeeId: targetStep?.approverEmployeeId || transfer.currentApproverEmployeeId,
          currentApproverName: targetStep?.approverName || transfer.currentApproverName,
          updatedAt: now,
        })
        .where(eq(assetTransfers.id, input.id))

      if (targetStep) {
        // Reset only the reverted step back to Pending. Previous steps remain Approved!
        await tx
          .update(approvals)
          .set({
            status: 'Pending',
            submittedAt: now,
            decisionNote: 'Resubmitted oleh pemohon',
            rejectionReason: '',
            reviewedAt: null,
            signatureUrl: null,
          })
          .where(eq(approvals.id, targetStep.id))
      }
    })

    // Send email & bell notification to the last approver
    if (targetStep?.approverEmployeeId) {
      const [approverEmp] = await db
        .select({ email: employees.email, name: employees.name })
        .from(employees)
        .where(eq(employees.id, targetStep.approverEmployeeId))
        .limit(1)

      if (approverEmp?.email) {
        await sendAssetResubmittedEmail({
          module: 'ASSET_TRANSFER',
          approverEmail: approverEmp.email,
          approverName: approverEmp.name,
          documentNumber: transfer.transferNumber,
          assetName: transfer.assetName,
          applicantName: transfer.currentHolderName,
        }).catch((err) => console.error('[resubmitAssetTransferAction] Email error:', err))
      }
    }

    revalidatePath('/dashboard/assets/transfer')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Revisi transfer ${transfer.transferNumber} berhasil dikirim kembali ke ${targetStep?.approverName || 'Approver'}.`,
    }
  } catch (error: any) {
    console.error('[resubmitAssetTransferAction] Error:', error)
    return { success: false, message: error?.message || 'Gagal mengirim ulang revisi transfer aset.' }
  }
}
