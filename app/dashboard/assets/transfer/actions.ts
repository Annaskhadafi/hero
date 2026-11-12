'use server'

import { db } from '@/db'
import { assetTransfers, type AssetTransferRow } from '@/db/schema/asset-transfer'
import { centralServiceAssets, centralServiceAssetHistories } from '@/db/schema/central-service'
import { employees, sites, approvals } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployeeAccessContext, isSuperAdminRole } from '@/lib/hero-access'
import { resolveApprovalRouteForActivity } from '@/lib/approval-engine'
import { and, desc, eq, ilike, or, sql, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { generateAssetTransferPdf } from '@/lib/asset-transfer-pdf'
import { saveGeneratedPdfUpload } from '@/lib/save-pdf-upload'
import { assetTransferInputSchema, type AssetTransferInput } from './schema'
import { sendAssetRevisionRequestedEmail, sendAssetResubmittedEmail } from '@/lib/asset-approval-email'

/**
 * Fetch Asset Transfer list with filter and KPI stats
 */
export async function getAssetTransfers(params?: {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized', items: [], total: 0, kpi: { total: 0, pending: 0, approved: 0, rejected: 0 } }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

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

    const mappedItems = items.map((item) => {
      const isPendingOrInReview = ['pending', 'in_review', 'draft'].includes(item.status)
      const canApprove = Boolean(
        isPendingOrInReview &&
          (isSuperAdmin || (empContext?.employeeId && item.currentApproverEmployeeId === empContext.employeeId))
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

    // 5. Resolve 3-Step Approval Chain:
    // Step 1: Atasan Langsung Current Holder (Pelepasan aset)
    // Step 2: New Holder (Penerima konfirmasi serah terima fisik)
    // Step 3: Atasan Langsung New Holder (Penerimaan ke unit kerja)

    // Resolve Step 1 Approver:
    let step1ApproverId = input.currentHolderManagerId || currentHolder.directManagerId || null
    let step1ApproverName = 'Atasan Langsung Current Holder'
    if (step1ApproverId) {
      const [mgr1] = await db
        .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle })
        .from(employees)
        .where(eq(employees.id, step1ApproverId))
        .limit(1)
      if (mgr1) {
        step1ApproverName = mgr1.name
      }
    } else {
      step1ApproverId = currentHolder.id
      step1ApproverName = currentHolder.name
    }

    // Step 2 Approver: New Holder (Penerima)
    const step2ApproverId = newHolder.id
    const step2ApproverName = newHolder.name

    // Resolve Step 3 Approver: Atasan Langsung New Holder
    let step3ApproverId = input.newHolderManagerId || newHolder.directManagerId || null
    let step3ApproverName = 'Atasan Langsung New Holder'
    if (step3ApproverId) {
      const [mgr3] = await db
        .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle })
        .from(employees)
        .where(eq(employees.id, step3ApproverId))
        .limit(1)
      if (mgr3) {
        step3ApproverName = mgr3.name
      }
    } else {
      step3ApproverId = newHolder.id
      step3ApproverName = newHolder.name
    }

    const approvalChain = [
      {
        level: 1,
        title: 'Step 1: Atasan Langsung Pemegang Lama (Pelepasan Aset)',
        approverName: step1ApproverName,
        approverEmployeeId: step1ApproverId,
        status: 'Pending',
      },
      {
        level: 2,
        title: 'Step 2: Pemegang Baru (Konfirmasi Serah Terima Fisik)',
        approverName: step2ApproverName,
        approverEmployeeId: step2ApproverId,
        status: 'Draft',
      },
      {
        level: 3,
        title: 'Step 3: Atasan Langsung Pemegang Baru (Penerimaan Aset)',
        approverName: step3ApproverName,
        approverEmployeeId: step3ApproverId,
        status: 'Draft',
      },
    ]

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
        currentStepOrder: 1,
        currentApproverTitle: 'Atasan Langsung Current Holder',
        currentApproverName: step1ApproverName,
        currentApproverEmployeeId: step1ApproverId,
        createdById: session.user.id,
        applicantEmployeeId: currentHolder.id,
        submittedAt: now,
      })
      .returning()

    // 7. Insert 3 steps into hero_approvals for central inbox integration
    for (const step of approvalChain) {
      await db.insert(approvals).values({
        assetTransferId: newTransfer.id,
        level: step.level,
        approverName: step.approverName,
        approverEmployeeId: step.approverEmployeeId,
        status: step.status,
        submittedAt: now,
        activityType: 'asset_transfer',
        requestNumber: transferNumber,
        activityTitle: `Transfer Aset: ${asset.description} (${asset.assetNumber || '-'})`,
        formName: 'Transfer Aset',
        decisionNote: step.title,
        resolutionSource: 'matrix',
      })
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
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

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
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

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
    } else {
      // Final Approved (Step 3)! Generate Official PDF Document
      let pdfUrl: string | null = null
      try {
        const [applicant] = await db
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

        const allApprovals = await db
          .select()
          .from(approvals)
          .where(eq(approvals.assetTransferId, id))
          .orderBy(asc(approvals.level))

        const pdfApprovers = allApprovals.map((s) => ({
          level: s.level,
          label: s.decisionNote || `Tahap ${s.level}`,
          approverName: s.approverName,
          status: s.status,
          signedAt: s.reviewedAt,
          signatureUrl: s.signatureUrl,
        }))

        const pdfBytes = await generateAssetTransferPdf({
          transferNumber: transfer.transferNumber,
          requestDate: transfer.requestDate,
          applicantName: applicant?.name || transfer.applicantName || 'Pemohon',
          applicantJobTitle: applicant?.jobTitle,
          departmentName: applicant?.department || transfer.currentLocationName,
          sectionName: applicant?.section,
          assetName: transfer.assetName,
          assetNumber: transfer.assetNumber,
          serialNumber: transfer.serialNumber,
          currentHolderName: transfer.currentHolderName,
          currentLocationName: transfer.currentLocationName,
          targetHolderName: transfer.newHolderName,
          targetLocationName: transfer.targetLocationName,
          reason: transfer.reason,
          notes: transfer.notes,
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
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

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
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

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
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
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
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
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
