'use server'

import { db } from '@/db'
import {
  assetBorrows,
  assetBorrowHistories,
  type AssetBorrowRow,
  type AssetBorrowHistoryRow,
} from '@/db/schema/asset-borrow'
import { centralServiceAssets } from '@/db/schema/central-service'
import { employees, sites, masterDepartments, approvals } from '@/db/schema/hero'
import { createNotificationEventForEmployee } from '@/lib/push-notifications'
import { resolveAssetTestingApprover } from '@/lib/asset-testing-guard'
import { generateAssetBorrowPdf } from '@/lib/asset-borrow-pdf'
import { saveGeneratedPdfUpload } from '@/lib/save-pdf-upload'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployeeAccessContext, isSuperAdminRole } from '@/lib/hero-access'
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import {
  assetBorrowInputSchema,
  type AssetBorrowInput,
  assetBorrowReturnRequestSchema,
  type AssetBorrowReturnRequestInput,
  assetBorrowConfirmReturnSchema,
  type AssetBorrowConfirmReturnInput,
} from './schema'
import {
  sendAssetBorrowSubmittedEmail,
  sendAssetBorrowApprovedEmail,
  sendAssetBorrowReturnRequestedEmail,
  sendAssetBorrowReturnedEmail,
  sendAssetRevisionRequestedEmail,
  sendAssetResubmittedEmail,
  sendAssetBorrowExtensionRequestedEmail,
} from '@/lib/asset-approval-email'

/**
 * Fetch Asset Borrow list with filter, pagination, and KPI statistics
 */
export async function getAssetBorrows(params?: {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Unauthorized',
        items: [],
        total: 0,
        kpi: { total: 0, pending: 0, borrowed: 0, pendingReturn: 0, returned: 0 },
      }
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
          ilike(assetBorrows.borrowNumber, `%${search}%`),
          ilike(assetBorrows.assetName, `%${search}%`),
          ilike(assetBorrows.assetNumber, `%${search}%`),
          ilike(assetBorrows.borrowerName, `%${search}%`),
          ilike(assetBorrows.holderName, `%${search}%`),
          ilike(assetBorrows.purpose, `%${search}%`),
          ilike(assetBorrows.equipmentNotes, `%${search}%`)
        )
      )
    }

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(assetBorrows.status, statusFilter))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // 1. Fetch Paginated Records
    const rows = await db
      .select({
        id: assetBorrows.id,
        borrowNumber: assetBorrows.borrowNumber,
        assetId: assetBorrows.assetId,
        assetName: assetBorrows.assetName,
        assetNumber: assetBorrows.assetNumber,
        serialNumber: assetBorrows.serialNumber,
        borrowerEmployeeId: assetBorrows.borrowerEmployeeId,
        borrowerName: assetBorrows.borrowerName,
        borrowerSignatureUrl: assetBorrows.borrowerSignatureUrl,
        holderEmployeeId: assetBorrows.holderEmployeeId,
        holderName: assetBorrows.holderName,
        equipmentNotes: assetBorrows.equipmentNotes,
        purpose: assetBorrows.purpose,
        borrowDate: assetBorrows.borrowDate,
        expectedReturnDate: assetBorrows.expectedReturnDate,
        actualReturnDate: assetBorrows.actualReturnDate,
        returnRequestDate: assetBorrows.returnRequestDate,
        returnNotes: assetBorrows.returnNotes,
        returnPhotoUrls: assetBorrows.returnPhotoUrls,
        returnConditionNotes: assetBorrows.returnConditionNotes,
        status: assetBorrows.status,
        approvalNote: assetBorrows.approvalNote,
        approvedAt: assetBorrows.approvedAt,
        rejectedAt: assetBorrows.rejectedAt,
        pdfUrl: assetBorrows.pdfUrl,
        createdById: assetBorrows.createdById,
        applicantEmployeeId: assetBorrows.applicantEmployeeId,
        submittedAt: assetBorrows.submittedAt,
        createdAt: assetBorrows.createdAt,
        updatedAt: assetBorrows.updatedAt,
      })
      .from(assetBorrows)
      .where(whereClause)
      .orderBy(desc(assetBorrows.createdAt))
      .limit(pageSize)
      .offset(offset)

    // 2. Fetch Total Count for Pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetBorrows)
      .where(whereClause)

    // 3. KPI Statistics
    const kpiRows = await db
      .select({
        status: assetBorrows.status,
        count: sql<number>`count(*)::int`,
      })
      .from(assetBorrows)
      .groupBy(assetBorrows.status)

    const kpi = {
      total: 0,
      pending: 0,
      borrowed: 0,
      pendingReturn: 0,
      returned: 0,
    }

    for (const r of kpiRows) {
      kpi.total += r.count
      if (r.status === 'pending') kpi.pending += r.count
      if (r.status === 'borrowed') kpi.borrowed += r.count
      if (r.status === 'pending_return') kpi.pendingReturn += r.count
      if (r.status === 'returned') kpi.returned += r.count
    }

    // 4. Map row authorization flags
    const currentEmpId = empContext?.employeeId
    const currentUserId = session.user.id

    const mappedItems = rows.map((r) => {
      const isHolder = Boolean(currentEmpId && r.holderEmployeeId === currentEmpId)
      const isBorrower = Boolean(currentEmpId && r.borrowerEmployeeId === currentEmpId)
      const isCreator = Boolean(
        (currentEmpId && r.applicantEmployeeId === currentEmpId) ||
        (currentUserId && r.createdById === currentUserId)
      )

      const isOverdue = Boolean(
        r.status === 'borrowed' &&
        r.expectedReturnDate &&
        new Date(r.expectedReturnDate).getTime() < Date.now()
      )
      const overdueDays = isOverdue
        ? Math.max(1, Math.floor((Date.now() - new Date(r.expectedReturnDate!).getTime()) / (1000 * 60 * 60 * 24)))
        : 0

      return {
        ...r,
        isOverdue,
        overdueDays,
        canApprove: Boolean((r.status === 'pending') && (isHolder || isSuperAdmin)),
        canRequestReturn: Boolean((r.status === 'borrowed') && (isBorrower || isSuperAdmin)),
        canConfirmReturn: Boolean((r.status === 'pending_return') && (isHolder || isSuperAdmin)),
        canReturn: Boolean(
          ((r.status === 'borrowed') && (isBorrower || isSuperAdmin)) ||
          ((r.status === 'pending_return') && (isHolder || isSuperAdmin))
        ),
        canCancel: Boolean((r.status === 'pending' || r.status === 'needs_revision') && (isCreator || isBorrower || isSuperAdmin)),
        canEditRevision: Boolean((r.status === 'needs_revision') && (isCreator || isBorrower || isSuperAdmin)),
        canDownload: Boolean(isBorrower || isCreator || isHolder || isSuperAdmin),
      }
    })

    return {
      success: true,
      items: mappedItems,
      total: count,
      kpi,
      currentAuth: {
        userId: currentUserId,
        employeeId: currentEmpId,
        isSuperAdmin,
      },
    }
  } catch (error: any) {
    console.error('getAssetBorrows error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal memuat data peminjaman aset',
      items: [],
      total: 0,
      kpi: { total: 0, pending: 0, borrowed: 0, pendingReturn: 0, returned: 0 },
    }
  }
}

/**
 * Fetch single Asset Borrow detail with full timeline history
 */
export async function getAssetBorrowDetail(id: number) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized', item: null }
    }

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, id))
      .limit(1)

    if (!borrow) {
      return { success: false, message: 'Data peminjaman tidak ditemukan', item: null }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const currentEmpId = empContext?.employeeId
    const currentUserId = session.user.id

    const isHolder = Boolean(currentEmpId && borrow.holderEmployeeId === currentEmpId)
    const isBorrower = Boolean(currentEmpId && borrow.borrowerEmployeeId === currentEmpId)
    const isCreator = Boolean(
      (currentEmpId && borrow.applicantEmployeeId === currentEmpId) ||
      (currentUserId && borrow.createdById === currentUserId)
    )

    // 1. Fetch approval steps
    const approvalSteps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.assetBorrowId, id))
      .orderBy(approvals.level)

    // 2. Fetch full chronological history
    const histories = await db
      .select()
      .from(assetBorrowHistories)
      .where(eq(assetBorrowHistories.assetBorrowId, id))
      .orderBy(asc(assetBorrowHistories.createdAt))

    const isOverdue = Boolean(
      borrow.status === 'borrowed' &&
      borrow.expectedReturnDate &&
      new Date(borrow.expectedReturnDate).getTime() < Date.now()
    )
    const overdueDays = isOverdue
      ? Math.max(1, Math.floor((Date.now() - new Date(borrow.expectedReturnDate!).getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return {
      success: true,
      item: {
        ...borrow,
        approvalSteps,
        histories,
        isOverdue,
        overdueDays,
        canApprove: Boolean((borrow.status === 'pending') && (isHolder || isSuperAdmin)),
        canRequestReturn: Boolean((borrow.status === 'borrowed') && (isBorrower || isSuperAdmin)),
        canConfirmReturn: Boolean((borrow.status === 'pending_return') && (isHolder || isSuperAdmin)),
        canReturn: Boolean(
          ((borrow.status === 'borrowed') && (isBorrower || isSuperAdmin)) ||
          ((borrow.status === 'pending_return') && (isHolder || isSuperAdmin))
        ),
        canCancel: Boolean((borrow.status === 'pending' || borrow.status === 'needs_revision') && (isCreator || isBorrower || isSuperAdmin)),
        canRequestExtension: Boolean((borrow.status === 'borrowed') && (isBorrower || isCreator || isSuperAdmin)),
        canEditRevision: Boolean((borrow.status === 'needs_revision') && (isCreator || isBorrower || isSuperAdmin)),
        canDownload: Boolean(isBorrower || isCreator || isHolder || isSuperAdmin),
      },
    }
  } catch (error: any) {
    console.error('getAssetBorrowDetail error:', error)
    return { success: false, message: error?.message || 'Gagal memuat detail', item: null }
  }
}

/**
 * Fetch master data for Asset Borrow form (Master Assets & Employees)
 */
export async function getAssetBorrowFormData() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Unauthorized',
        assets: [],
        employees: [],
      }
    }

    // 1. Fetch Central Service Assets with Holder Info
    const assetRows = await db
      .select({
        id: centralServiceAssets.id,
        description: centralServiceAssets.description,
        assetNumber: centralServiceAssets.assetNumber,
        serialNumber: centralServiceAssets.serialNumber,
        location: centralServiceAssets.location,
        condition: centralServiceAssets.condition,
        workSection: centralServiceAssets.workSection,
        holderEmployeeId: centralServiceAssets.holderEmployeeId,
        holderName: employees.name,
        holderEmployeeSn: employees.employeeSn,
      })
      .from(centralServiceAssets)
      .leftJoin(employees, eq(centralServiceAssets.holderEmployeeId, employees.id))
      .where(sql`${centralServiceAssets.condition} != 'DISPOSED'`)
      .orderBy(centralServiceAssets.description)

    // 2. Fetch Active Employees
    const empRows = await db
      .select({
        id: employees.id,
        employeeSn: employees.employeeSn,
        name: employees.name,
        jobTitle: employees.jobTitle,
        departmentName: masterDepartments.name,
        siteName: sites.name,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(eq(employees.isActive, true))
      .orderBy(employees.name)

    return {
      success: true,
      assets: assetRows,
      employees: empRows,
    }
  } catch (error: any) {
    console.error('getAssetBorrowFormData error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal memuat master data form peminjaman',
      assets: [],
      employees: [],
    }
  }
}

/**
 * Create new Asset Borrow record
 */
export async function createAssetBorrow(rawInput: AssetBorrowInput) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Sesi login telah berakhir. Silakan masuk kembali.' }
    }

    const validated = assetBorrowInputSchema.safeParse(rawInput)
    if (!validated.success) {
      const firstError = (validated.error as any).errors?.[0]?.message || validated.error.message || 'Validasi formulir gagal'
      return { success: false, message: firstError }
    }

    const input = validated.data

    // 1. Validate Asset
    const [asset] = await db
      .select({
        id: centralServiceAssets.id,
        description: centralServiceAssets.description,
        assetNumber: centralServiceAssets.assetNumber,
        serialNumber: centralServiceAssets.serialNumber,
        condition: centralServiceAssets.condition,
        holderEmployeeId: centralServiceAssets.holderEmployeeId,
      })
      .from(centralServiceAssets)
      .where(eq(centralServiceAssets.id, input.assetId))
      .limit(1)

    if (!asset) {
      return { success: false, message: 'Aset tidak ditemukan dalam master data.' }
    }

    if (asset.condition?.toUpperCase() === 'BORROWED') {
      return { success: false, message: 'Aset saat ini sedang dipinjam dan belum dikembalikan.' }
    }

    // 2. Validate Holder
    if (!asset.holderEmployeeId) {
      return {
        success: false,
        message: 'Aset ini belum memiliki pemegang (holder) resmi di master data. Peminjaman harus melalui persetujuan holder fisik barang.',
      }
    }

    const [holder] = await db
      .select({ id: employees.id, name: employees.name, email: employees.email })
      .from(employees)
      .where(eq(employees.id, asset.holderEmployeeId))
      .limit(1)

    if (!holder) {
      return { success: false, message: 'Data pemegang aset saat ini tidak valid.' }
    }

    // 3. Validate Borrower
    const [borrower] = await db
      .select({ id: employees.id, name: employees.name, email: employees.email })
      .from(employees)
      .where(eq(employees.id, input.borrowerEmployeeId))
      .limit(1)

    if (!borrower) {
      return { success: false, message: 'Data peminjam tidak valid.' }
    }

    if (borrower.id === holder.id) {
      return { success: false, message: 'Peminjam tidak boleh orang yang sama dengan pemegang (holder) aset saat ini.' }
    }

    // 4. Generate Document Number: BRW-YYYYMM-XXXX
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const prefix = `BRW-${year}${month}-`

    const [lastRecord] = await db
      .select({ borrowNumber: assetBorrows.borrowNumber })
      .from(assetBorrows)
      .where(ilike(assetBorrows.borrowNumber, `${prefix}%`))
      .orderBy(desc(assetBorrows.id))
      .limit(1)

    let nextSeq = 1
    if (lastRecord?.borrowNumber) {
      const parts = lastRecord.borrowNumber.split('-')
      const num = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(num)) {
        nextSeq = num + 1
      }
    }
    const borrowNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`

    const empContext = await getCurrentEmployeeAccessContext()

    // 5. Insert Record & History in Transaction
    let newBorrow: AssetBorrowRow | null = null

    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(assetBorrows)
        .values({
          borrowNumber,
          assetId: asset.id,
          assetName: asset.description,
          assetNumber: asset.assetNumber || '',
          serialNumber: asset.serialNumber || '',
          borrowerEmployeeId: borrower.id,
          borrowerName: borrower.name,
          borrowerSignatureUrl: input.borrowerSignatureUrl || null,
          holderEmployeeId: holder.id,
          holderName: holder.name,
          equipmentNotes: input.equipmentNotes || null,
          purpose: input.purpose,
          borrowDate: new Date(input.borrowDate),
          expectedReturnDate: input.expectedReturnDate ? new Date(input.expectedReturnDate) : null,
          status: 'pending',
          createdById: session.user.id,
          applicantEmployeeId: empContext?.employeeId || null,
          submittedAt: now,
        })
        .returning()

      newBorrow = inserted

      // Resolusi testing guardrail untuk approver in-app
      const resolvedHolder = await resolveAssetTestingApprover({
        approverEmployeeId: holder.id,
        approverName: holder.name,
        approverEmail: holder.email,
        approverJobTitle: 'Pemegang Aset (Holder)',
      })

      // Sync to hero_approvals for central Approval Inbox
      await tx.insert(approvals).values({
        assetBorrowId: inserted.id,
        level: 1,
        approverName: resolvedHolder.approverName || holder.name,
        approverEmployeeId: resolvedHolder.approverEmployeeId || holder.id,
        status: 'Pending',
        formName: 'Formulir Peminjaman Aset (Asset Borrow)',
        activityType: 'ASSET_BORROW',
        requestNumber: borrowNumber,
        activityTitle: `Peminjaman Aset: ${asset.description}`,
        submittedAt: now,
      })

      // Record History: SUBMITTED
      await tx.insert(assetBorrowHistories).values({
        assetBorrowId: inserted.id,
        action: 'submitted',
        actorEmployeeId: empContext?.employeeId || borrower.id,
        actorName: (empContext as any)?.employeeName || (empContext as any)?.name || borrower.name,
        actorRole: 'Peminjam',
        note: `Pengajuan peminjaman diajukan untuk keperluan: ${input.purpose}`,
      })
    })

    if (!newBorrow) {
      return { success: false, message: 'Gagal membuat data peminjaman aset.' }
    }

    const createdRecord: AssetBorrowRow = newBorrow

    // Resolusi testing guardrail untuk notifikasi lonceng & email
    const resolvedHolder = await resolveAssetTestingApprover({
      approverEmployeeId: holder.id,
      approverName: holder.name,
      approverEmail: holder.email,
      approverJobTitle: 'Pemegang Aset (Holder)',
    })

    // Send Notification to Holder
    if (holder.email) {
      await sendAssetBorrowSubmittedEmail({
        holderEmail: holder.email,
        holderName: holder.name,
        borrowerName: borrower.name,
        borrowNumber: createdRecord.borrowNumber,
        assetName: asset.description,
        assetNumber: asset.assetNumber,
        purpose: input.purpose,
        borrowDate: createdRecord.borrowDate,
        expectedReturnDate: createdRecord.expectedReturnDate,
        equipmentNotes: input.equipmentNotes,
        borrowId: createdRecord.id,
      }).catch((err) => console.error('[createAssetBorrow] Email notify error:', err))
    }

    await createNotificationEventForEmployee({
      employeeId: resolvedHolder.approverEmployeeId || holder.id,
      eventType: 'asset_borrow_submitted',
      category: 'approval_requests',
      title: `${resolvedHolder.isTesting ? '[TESTING] ' : ''}Peminjaman Aset Baru: ${createdRecord.borrowNumber}`,
      body: `${borrower.name} mengajukan peminjaman aset "${asset.description}". Memerlukan persetujuan Anda sebagai Holder.`,
      url: '/dashboard/assets/borrow',
    }).catch((err) => console.error('[createAssetBorrow] Bell notify error:', err))

    revalidatePath('/dashboard/assets/borrow')
    revalidatePath('/dashboard/central-service/assets')

    return {
      success: true,
      message: `Peminjaman aset berhasil diajukan dengan nomor ${createdRecord.borrowNumber}`,
      item: createdRecord,
    }
  } catch (error: any) {
    console.error('createAssetBorrow error:', error)
    return { success: false, message: error?.message || 'Gagal menyimpan pengajuan peminjaman aset' }
  }
}

/**
 * Approve Asset Borrow by Holder or Admin
 */
export async function approveAssetBorrow(id: number, decisionNote: string, signatureUrl?: string) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    if (!decisionNote || !decisionNote.trim()) {
      return { success: false, message: 'Catatan persetujuan wajib diisi.' }
    }

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, id))
      .limit(1)

    if (!borrow) {
      return { success: false, message: 'Data peminjaman tidak ditemukan.' }
    }

    if (borrow.status !== 'pending') {
      return { success: false, message: `Peminjaman ini sudah berstatus ${borrow.status}.` }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isHolder = Boolean(empContext?.employeeId && borrow.holderEmployeeId === empContext.employeeId)

    if (!isHolder && !isSuperAdmin) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak akses untuk menyetujui peminjaman ini. Hanya Holder Aset saat ini yang berwenang.',
      }
    }

    const now = new Date()

    // Fetch borrower details & signature for PDF
    const [borrower] = await db
      .select({
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        department: masterDepartments.name,
        signatureDataUrl: employees.signatureDataUrl,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .where(eq(employees.id, borrow.borrowerEmployeeId))
      .limit(1)

    // Generate Official PDF
    let pdfUrl: string | null = null
    try {
      const pdfBytes = await generateAssetBorrowPdf({
        borrowNumber: borrow.borrowNumber,
        borrowDate: borrow.borrowDate,
        expectedReturnDate: borrow.expectedReturnDate,
        actualReturnDate: borrow.actualReturnDate,
        status: 'borrowed',
        borrowerName: borrow.borrowerName,
        borrowerJobTitle: borrower?.jobTitle,
        borrowerDepartment: borrower?.department,
        borrowerSignatureUrl: borrow.borrowerSignatureUrl || borrower?.signatureDataUrl || null,
        assetName: borrow.assetName,
        assetNumber: borrow.assetNumber,
        serialNumber: borrow.serialNumber,
        equipmentNotes: borrow.equipmentNotes,
        holderName: borrow.holderName,
        holderSignatureUrl: signatureUrl,
        holderSignedAt: now,
        purpose: borrow.purpose,
        approvalNote: decisionNote.trim(),
      })
      pdfUrl = await saveGeneratedPdfUpload(pdfBytes, 'asset-borrow', borrow.borrowNumber)
    } catch (pdfErr) {
      console.error('[approveAssetBorrow] PDF generation error:', pdfErr)
    }

    await db.transaction(async (tx) => {
      // 1. Update Borrow Record
      await tx
        .update(assetBorrows)
        .set({
          status: 'borrowed',
          approvalNote: decisionNote.trim(),
          approvedAt: now,
          pdfUrl: pdfUrl || undefined,
          updatedAt: now,
        })
        .where(eq(assetBorrows.id, id))

      // 2. Lock Central Service Asset Condition to 'BORROWED'
      await tx
        .update(centralServiceAssets)
        .set({
          condition: 'BORROWED',
          updatedAt: now,
        })
        .where(eq(centralServiceAssets.id, borrow.assetId))

      // 3. Update hero_approvals
      await tx
        .update(approvals)
        .set({
          status: 'Approved',
          reviewedAt: now,
          decisionNote: decisionNote.trim(),
          signatureUrl: signatureUrl || undefined,
        })
        .where(eq(approvals.assetBorrowId, id))

      // 4. Record History: APPROVED
      await tx.insert(assetBorrowHistories).values({
        assetBorrowId: id,
        action: 'approved',
        actorEmployeeId: empContext?.employeeId || borrow.holderEmployeeId,
        actorName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.holderName,
        actorRole: isSuperAdmin && !isHolder ? 'Super Admin' : 'Holder',
        note: decisionNote.trim(),
        signatureUrl: signatureUrl || null,
      })
    })

    // Send Notification to Borrower
    if (borrower?.email) {
      await sendAssetBorrowApprovedEmail({
        borrowerEmail: borrower.email,
        borrowerName: borrower.name,
        holderName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.holderName,
        borrowNumber: borrow.borrowNumber,
        assetName: borrow.assetName,
        approvalNote: decisionNote.trim(),
        pdfUrl,
        borrowId: id,
      }).catch((err) => console.error('[approveAssetBorrow] Email notify error:', err))
    }

    await createNotificationEventForEmployee({
      employeeId: borrow.borrowerEmployeeId,
      eventType: 'asset_borrow_approved',
      category: 'approval_requests',
      title: `Peminjaman Disetujui: ${borrow.borrowNumber}`,
      body: `Peminjaman aset "${borrow.assetName}" telah disetujui oleh ${borrow.holderName}. Silakan ambil fisik unit aset.`,
      url: '/dashboard/assets/borrow',
    }).catch((err) => console.error('[approveAssetBorrow] Bell notify error:', err))

    revalidatePath('/dashboard/assets/borrow')
    revalidatePath('/dashboard/central-service/assets')

    return {
      success: true,
      message: `Peminjaman aset ${borrow.borrowNumber} telah disetujui. Dokumen resmi diterbitkan.`,
      pdfUrl,
    }
  } catch (error: any) {
    console.error('approveAssetBorrow error:', error)
    return { success: false, message: error?.message || 'Gagal menyetujui peminjaman aset' }
  }
}

/**
 * Reject Asset Borrow
 */
export async function rejectAssetBorrow(id: number, reason: string) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    if (!reason || !reason.trim()) {
      return { success: false, message: 'Alasan penolakan wajib diisi.' }
    }

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, id))
      .limit(1)

    if (!borrow) {
      return { success: false, message: 'Data peminjaman tidak ditemukan.' }
    }

    if (borrow.status !== 'pending') {
      return { success: false, message: `Peminjaman ini sudah berstatus ${borrow.status}.` }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isHolder = Boolean(empContext?.employeeId && borrow.holderEmployeeId === empContext.employeeId)

    if (!isHolder && !isSuperAdmin) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak akses untuk menolak peminjaman ini.',
      }
    }

    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .update(assetBorrows)
        .set({
          status: 'rejected',
          approvalNote: reason.trim(),
          rejectedAt: now,
          updatedAt: now,
        })
        .where(eq(assetBorrows.id, id))

      await tx
        .update(approvals)
        .set({
          status: 'Rejected',
          reviewedAt: now,
          decisionNote: reason.trim(),
          rejectionReason: reason.trim(),
        })
        .where(eq(approvals.assetBorrowId, id))

      // Record History: REJECTED
      await tx.insert(assetBorrowHistories).values({
        assetBorrowId: id,
        action: 'rejected',
        actorEmployeeId: empContext?.employeeId || borrow.holderEmployeeId,
        actorName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.holderName,
        actorRole: isSuperAdmin && !isHolder ? 'Super Admin' : 'Holder',
        note: reason.trim(),
      })
    })

    await createNotificationEventForEmployee({
      employeeId: borrow.borrowerEmployeeId,
      eventType: 'asset_borrow_rejected',
      category: 'approval_requests',
      title: `Peminjaman Ditolak: ${borrow.borrowNumber}`,
      body: `Peminjaman aset "${borrow.assetName}" ditolak oleh ${borrow.holderName}. Alasan: ${reason.trim()}`,
      url: '/dashboard/assets/borrow',
    }).catch((err) => console.error('[rejectAssetBorrow] Bell notify error:', err))

    revalidatePath('/dashboard/assets/borrow')

    return {
      success: true,
      message: `Peminjaman aset ${borrow.borrowNumber} telah ditolak.`,
    }
  } catch (error: any) {
    console.error('rejectAssetBorrow error:', error)
    return { success: false, message: error?.message || 'Gagal menolak peminjaman aset' }
  }
}

/**
 * Revert Asset Borrow (Kembalikan ke Pemohon untuk Revisi)
 */
export async function revertAssetBorrowAction(id: number, revertReason: string) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    if (!revertReason || !revertReason.trim()) {
      return { success: false, message: 'Catatan alasan revisi wajib diisi.' }
    }

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, id))
      .limit(1)

    if (!borrow) {
      return { success: false, message: 'Data peminjaman tidak ditemukan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isHolder = Boolean(empContext?.employeeId && borrow.holderEmployeeId === empContext.employeeId)

    if (!isHolder && !isSuperAdmin) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak akses untuk merevert pengajuan ini.',
      }
    }

    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .update(assetBorrows)
        .set({
          status: 'needs_revision',
          lastRevertNote: revertReason.trim(),
          lastRevertedByEmployeeId: empContext?.employeeId || null,
          lastRevertStepOrder: 1,
          updatedAt: now,
        })
        .where(eq(assetBorrows.id, id))

      await tx
        .update(approvals)
        .set({
          status: 'Reverted',
          reviewedAt: now,
          decisionNote: `Revisi diminta: ${revertReason.trim()}`,
          rejectionReason: revertReason.trim(),
        })
        .where(eq(approvals.assetBorrowId, id))

      // Record History: NEEDS_REVISION
      await tx.insert(assetBorrowHistories).values({
        assetBorrowId: id,
        action: 'needs_revision',
        actorEmployeeId: empContext?.employeeId || borrow.holderEmployeeId,
        actorName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.holderName,
        actorRole: isSuperAdmin && !isHolder ? 'Super Admin' : 'Holder',
        note: revertReason.trim(),
      })
    })

    // Send email & bell notification to borrower
    const [borrower] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(eq(employees.id, borrow.borrowerEmployeeId))
      .limit(1)

    if (borrower?.email) {
      await sendAssetRevisionRequestedEmail({
        module: 'ASSET_BORROW',
        applicantEmail: borrower.email,
        applicantName: borrower.name,
        documentNumber: borrow.borrowNumber,
        assetName: borrow.assetName,
        revertedByName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.holderName,
        revertNote: revertReason.trim(),
        targetId: id,
      }).catch((err) => console.error('[revertAssetBorrowAction] Email error:', err))
    }

    revalidatePath('/dashboard/assets/borrow')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Pengajuan peminjaman ${borrow.borrowNumber} berhasil dikembalikan ke pemohon untuk revisi.`,
    }
  } catch (error: any) {
    console.error('revertAssetBorrowAction error:', error)
    return { success: false, message: error?.message || 'Gagal merevert pengajuan peminjaman' }
  }
}

/**
 * Resubmit Asset Borrow (Kirim Ulang Revisi oleh Pemohon -> Langsung Kembali ke Last Approver)
 */
export async function resubmitAssetBorrowAction(input: {
  id: number
  purpose: string
  borrowDate: string
  expectedReturnDate?: string
  equipmentNotes?: string
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, input.id))
      .limit(1)

    if (!borrow) {
      return { success: false, message: 'Data peminjaman tidak ditemukan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isBorrower = Boolean(empContext?.employeeId && borrow.borrowerEmployeeId === empContext.employeeId)
    const isCreator = Boolean(
      (empContext?.employeeId && borrow.applicantEmployeeId === empContext.employeeId) ||
      (session.user.id && borrow.createdById === session.user.id)
    )

    if (!isBorrower && !isCreator && !isSuperAdmin) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak akses untuk memperbarui pengajuan ini.',
      }
    }

    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .update(assetBorrows)
        .set({
          purpose: input.purpose,
          borrowDate: new Date(input.borrowDate),
          expectedReturnDate: input.expectedReturnDate ? new Date(input.expectedReturnDate) : null,
          equipmentNotes: input.equipmentNotes || null,
          status: 'pending',
          updatedAt: now,
        })
        .where(eq(assetBorrows.id, input.id))

      // Reset approval back to Pending for the holder (last approver)
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
        .where(eq(approvals.assetBorrowId, input.id))

      // Record History: RESUBMITTED
      await tx.insert(assetBorrowHistories).values({
        assetBorrowId: input.id,
        action: 'resubmitted',
        actorEmployeeId: empContext?.employeeId || borrow.borrowerEmployeeId,
        actorName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.borrowerName,
        actorRole: 'Peminjam',
        note: `Pengajuan diperbaiki: ${input.purpose}`,
      })
    })

    // Send email & bell notification to holder (last approver)
    const [holder] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(eq(employees.id, borrow.holderEmployeeId))
      .limit(1)

    if (holder?.email) {
      await sendAssetResubmittedEmail({
        module: 'ASSET_BORROW',
        approverEmail: holder.email,
        approverName: holder.name,
        documentNumber: borrow.borrowNumber,
        assetName: borrow.assetName,
        applicantName: borrow.borrowerName,
      }).catch((err) => console.error('[resubmitAssetBorrowAction] Email error:', err))
    }

    revalidatePath('/dashboard/assets/borrow')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Revisi peminjaman ${borrow.borrowNumber} berhasil dikirim kembali ke Pemegang Aset (${borrow.holderName}).`,
    }
  } catch (error: any) {
    console.error('resubmitAssetBorrowAction error:', error)
    return { success: false, message: error?.message || 'Gagal mengirim ulang revisi peminjaman' }
  }
}

/**
 * Request Asset Return (Langkah 1: Peminjam Mengajukan Pengembalian Aset Fisik)
 * Wajib melampirkan minimal 1 foto fisik kondisi aset.
 */
export async function requestAssetBorrowReturn(rawInput: AssetBorrowReturnRequestInput) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const validated = assetBorrowReturnRequestSchema.safeParse(rawInput)
    if (!validated.success) {
      const firstError = (validated.error as any).errors?.[0]?.message || validated.error.message || 'Validasi pengembalian gagal'
      return { success: false, message: firstError }
    }

    const input = validated.data

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, input.id))
      .limit(1)

    if (!borrow) {
      return { success: false, message: 'Data peminjaman tidak ditemukan.' }
    }

    if (borrow.status !== 'borrowed') {
      return { success: false, message: `Aset ini tidak dalam status sedang dipinjam (status saat ini: ${borrow.status}).` }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isBorrower = Boolean(empContext?.employeeId && borrow.borrowerEmployeeId === empContext.employeeId)

    if (!isBorrower && !isSuperAdmin) {
      return {
        success: false,
        message: 'Hanya Peminjam Aset atau Super Admin yang dapat mengajukan pengembalian aset.',
      }
    }

    if (!input.photoUrls || input.photoUrls.length === 0) {
      return {
        success: false,
        message: 'Wajib mengunggah minimal 1 foto kondisi fisik aset saat pengembalian.',
      }
    }

    const now = new Date()
    const parsedReturnDate = new Date(input.actualReturnDate)
    const returnReqDate = isNaN(parsedReturnDate.getTime()) ? now : parsedReturnDate

    await db.transaction(async (tx) => {
      // 1. Update Borrow record to pending_return
      await tx
        .update(assetBorrows)
        .set({
          status: 'pending_return',
          returnRequestDate: returnReqDate,
          returnNotes: input.returnNotes.trim(),
          returnPhotoUrls: JSON.stringify(input.photoUrls),
          updatedAt: now,
        })
        .where(eq(assetBorrows.id, input.id))

      // 2. Record History: RETURN_REQUESTED
      await tx.insert(assetBorrowHistories).values({
        assetBorrowId: input.id,
        action: 'return_requested',
        actorEmployeeId: empContext?.employeeId || borrow.borrowerEmployeeId,
        actorName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.borrowerName,
        actorRole: isSuperAdmin && !isBorrower ? 'Super Admin' : 'Peminjam',
        note: input.returnNotes.trim(),
        photoUrl: input.photoUrls[0],
        signatureUrl: input.signatureUrl || null,
      })
    })

    // Notify Holder
    const [holderEmp] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(eq(employees.id, borrow.holderEmployeeId))
      .limit(1)

    if (holderEmp?.email) {
      await sendAssetBorrowReturnRequestedEmail({
        holderEmail: holderEmp.email,
        holderName: holderEmp.name,
        borrowerName: borrow.borrowerName,
        borrowNumber: borrow.borrowNumber,
        assetName: borrow.assetName,
        returnNotes: input.returnNotes.trim(),
        borrowId: input.id,
      }).catch((err) => console.error('[requestAssetBorrowReturn] Email notify error:', err))
    }

    await createNotificationEventForEmployee({
      employeeId: borrow.holderEmployeeId,
      eventType: 'asset_borrow_return_requested',
      category: 'approval_requests',
      title: `Pengembalian Fisik Aset: ${borrow.borrowNumber}`,
      body: `${borrow.borrowerName} mengajukan pengembalian fisik aset "${borrow.assetName}". Mohon verifikasi kondisi fisik.`,
      url: '/dashboard/assets/borrow',
    }).catch((err) => console.error('[requestAssetBorrowReturn] Bell notify error:', err))

    revalidatePath('/dashboard/assets/borrow')

    return {
      success: true,
      message: `Pengajuan pengembalian ${borrow.borrowNumber} berhasil dikirim ke Holder (${borrow.holderName}) untuk verifikasi fisik.`,
    }
  } catch (error: any) {
    console.error('requestAssetBorrowReturn error:', error)
    return { success: false, message: error?.message || 'Gagal mengajukan pengembalian aset' }
  }
}

/**
 * Confirm Asset Return (Langkah 2: Holder Memeriksa Fisik & Konfirmasi Penerimaan Kembali)
 * Mengubah status menjadi 'returned' dan mengembalikan kondisi aset di master data ke 'ACTIVE'.
 */
export async function confirmAssetBorrowReturn(rawInput: AssetBorrowConfirmReturnInput) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const validated = assetBorrowConfirmReturnSchema.safeParse(rawInput)
    if (!validated.success) {
      const firstError = (validated.error as any).errors?.[0]?.message || validated.error.message || 'Validasi gagal'
      return { success: false, message: firstError }
    }

    const input = validated.data

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, input.id))
      .limit(1)

    if (!borrow) {
      return { success: false, message: 'Data peminjaman tidak ditemukan.' }
    }

    if (borrow.status !== 'borrowed' && borrow.status !== 'pending_return') {
      return {
        success: false,
        message: `Aset ini tidak dalam status dipinjam atau menunggu konfirmasi pengembalian (status saat ini: ${borrow.status}).`,
      }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isHolder = Boolean(empContext?.employeeId && borrow.holderEmployeeId === empContext.employeeId)

    if (!isHolder && !isSuperAdmin) {
      return {
        success: false,
        message: 'Hanya Holder Aset (atau Super Admin) yang berwenang mengonfirmasi penerimaan fisik aset.',
      }
    }

    const now = new Date()
    const returnDate = borrow.returnRequestDate || now

    // Fetch employee details & approval rows for PDF generation and notifications
    const [borrowerEmp, holderEmp, approvalRows] = await Promise.all([
      db
        .select({
          name: employees.name,
          email: employees.email,
          jobTitle: employees.jobTitle,
          department: masterDepartments.name,
          signatureDataUrl: employees.signatureDataUrl,
        })
        .from(employees)
        .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
        .where(eq(employees.id, borrow.borrowerEmployeeId))
        .limit(1)
        .then((r) => r[0] || null),
      db
        .select({
          jobTitle: employees.jobTitle,
          signatureDataUrl: employees.signatureDataUrl,
        })
        .from(employees)
        .where(eq(employees.id, borrow.holderEmployeeId))
        .limit(1)
        .then((r) => r[0] || null),
      db
        .select({
          level: approvals.level,
          approverName: approvals.approverName,
          jobTitle: employees.jobTitle,
          status: approvals.status,
          reviewedAt: approvals.reviewedAt,
          signatureUrl: approvals.signatureUrl,
          decisionNote: approvals.decisionNote,
          formName: approvals.formName,
        })
        .from(approvals)
        .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
        .where(eq(approvals.assetBorrowId, input.id))
        .orderBy(asc(approvals.level)),
    ])

    // Regenerate Official PDF with Return Confirmation & Physical Asset Photos
    let pdfUrl = borrow.pdfUrl
    try {
      const pdfApprovers = approvalRows.map((app) => ({
        level: app.level || 1,
        title: app.decisionNote || (app.formName || `Step ${app.level}`),
        approverName: app.approverName || 'Approver',
        jobTitle: app.jobTitle || app.formName || 'Pemegang Aset',
        status: app.status || 'Approved',
        reviewedAt: app.reviewedAt,
        signatureUrl: app.signatureUrl,
        decisionNote: app.decisionNote || null,
      }))

      const pdfBytes = await generateAssetBorrowPdf({
        borrowNumber: borrow.borrowNumber,
        borrowDate: borrow.borrowDate,
        expectedReturnDate: borrow.expectedReturnDate,
        actualReturnDate: returnDate,
        status: 'returned',
        borrowerName: borrow.borrowerName,
        borrowerJobTitle: borrowerEmp?.jobTitle || 'Karyawan',
        borrowerDepartment: borrowerEmp?.department || null,
        borrowerSignatureUrl: borrow.borrowerSignatureUrl || borrowerEmp?.signatureDataUrl || null,
        assetName: borrow.assetName,
        assetNumber: borrow.assetNumber,
        serialNumber: borrow.serialNumber,
        equipmentNotes: borrow.equipmentNotes,
        holderName: borrow.holderName,
        holderJobTitle: holderEmp?.jobTitle || 'Pemegang Aset',
        holderSignatureUrl: borrow.holderSignatureUrl || holderEmp?.signatureDataUrl || null,
        holderSignedAt: borrow.approvedAt || now,
        purpose: borrow.purpose,
        approvalNote: borrow.approvalNote,
        returnNotes: borrow.returnNotes,
        returnConditionNotes: input.returnConditionNotes.trim(),
        assetCondition: input.assetCondition || 'ACTIVE',
        returnPhotoUrls: borrow.returnPhotoUrls,
        holderReturnSignatureUrl: input.signatureUrl || holderEmp?.signatureDataUrl || null,
        holderReturnSignedAt: now,
        approvals: pdfApprovers.length > 0 ? pdfApprovers : undefined,
      })

      const generatedUrl = await saveGeneratedPdfUpload(pdfBytes, 'asset-borrow', borrow.borrowNumber)
      if (generatedUrl) {
        pdfUrl = generatedUrl
      }
    } catch (pdfErr) {
      console.error('[confirmAssetBorrowReturn] PDF generation error:', pdfErr)
    }

    await db.transaction(async (tx) => {
      // 1. Update Borrow record
      await tx
        .update(assetBorrows)
        .set({
          status: 'returned',
          actualReturnDate: returnDate,
          returnConditionNotes: input.returnConditionNotes.trim(),
          holderReturnSignatureUrl: input.signatureUrl || undefined,
          holderReturnSignedAt: now,
          pdfUrl: pdfUrl || undefined,
          updatedAt: now,
        })
        .where(eq(assetBorrows.id, input.id))

      // 2. Restore Central Service Asset condition
      await tx
        .update(centralServiceAssets)
        .set({
          condition: input.assetCondition || 'ACTIVE',
          updatedAt: now,
        })
        .where(eq(centralServiceAssets.id, borrow.assetId))

      // 3. Record History: RETURNED
      await tx.insert(assetBorrowHistories).values({
        assetBorrowId: input.id,
        action: 'returned',
        actorEmployeeId: empContext?.employeeId || borrow.holderEmployeeId,
        actorName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.holderName,
        actorRole: isSuperAdmin && !isHolder ? 'Super Admin' : 'Holder',
        note: input.returnConditionNotes.trim(),
        signatureUrl: input.signatureUrl || null,
      })
    })

    // Notify Borrower
    if (borrowerEmp?.email) {
      await sendAssetBorrowReturnedEmail({
        borrowerEmail: borrowerEmp.email,
        borrowerName: borrowerEmp.name,
        holderName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.holderName,
        borrowNumber: borrow.borrowNumber,
        assetName: borrow.assetName,
        returnConditionNotes: input.returnConditionNotes.trim(),
        borrowId: input.id,
      }).catch((err) => console.error('[confirmAssetBorrowReturn] Email notify error:', err))
    }

    await createNotificationEventForEmployee({
      employeeId: borrow.borrowerEmployeeId,
      eventType: 'asset_borrow_returned',
      category: 'approval_requests',
      title: `Peminjaman Aset Selesai: ${borrow.borrowNumber}`,
      body: `Pengembalian fisik aset "${borrow.assetName}" telah diverifikasi dan diterima kembali oleh ${borrow.holderName}.`,
      url: '/dashboard/assets/borrow',
    }).catch((err) => console.error('[confirmAssetBorrowReturn] Bell notify error:', err))

    revalidatePath('/dashboard/assets/borrow')
    revalidatePath('/dashboard/central-service/assets')

    return {
      success: true,
      message: `Aset ${borrow.assetName} telah berhasil dikonfirmasi diterima kembali oleh Holder.`,
      pdfUrl,
    }
  } catch (error: any) {
    console.error('confirmAssetBorrowReturn error:', error)
    return { success: false, message: error?.message || 'Gagal mengonfirmasi pengembalian aset' }
  }
}

/**
 * Return Asset (Backward compatibility wrapper calling confirmAssetBorrowReturn)
 */
export async function returnAssetBorrow(id: number, returnNotes?: string, signatureUrl?: string) {
  return confirmAssetBorrowReturn({
    id,
    returnConditionNotes: returnNotes || 'Fisik aset telah diperiksa dan diterima kembali dalam kondisi baik.',
    assetCondition: 'ACTIVE',
    signatureUrl: signatureUrl || undefined,
  })
}

/**
 * Cancel Asset Borrow (Pembatalan Pengajuan oleh Pembuat/Admin)
 * Otomatis menghapus pengajuan dari database beserta approval dan history terkait.
 */
export async function cancelAssetBorrow(id: number) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, id))
      .limit(1)

    if (!borrow) {
      return { success: false, message: 'Data peminjaman tidak ditemukan.' }
    }

    if (borrow.status !== 'pending' && borrow.status !== 'needs_revision') {
      return { success: false, message: 'Hanya pengajuan berstatus Pending atau Perlu Revisi yang dapat dibatalkan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isBorrower = Boolean(empContext?.employeeId && borrow.borrowerEmployeeId === empContext.employeeId)
    const isCreator = Boolean(
      (empContext?.employeeId && borrow.applicantEmployeeId === empContext.employeeId) ||
      (session.user.id && borrow.createdById === session.user.id)
    )

    if (!isCreator && !isBorrower && !isSuperAdmin) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak untuk membatalkan pengajuan ini.',
      }
    }

    await db.transaction(async (tx) => {
      // 1. Delete from hero_approvals
      await tx.delete(approvals).where(eq(approvals.assetBorrowId, id))

      // 2. Delete from hero_asset_borrow_histories
      await tx.delete(assetBorrowHistories).where(eq(assetBorrowHistories.assetBorrowId, id))

      // 3. Delete from hero_asset_borrows
      await tx.delete(assetBorrows).where(eq(assetBorrows.id, id))
    })

    revalidatePath('/dashboard/assets/borrow')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      message: `Pengajuan peminjaman ${borrow.borrowNumber} telah berhasil dibatalkan dan dihapus dari sistem.`,
    }
  } catch (error: any) {
    console.error('cancelAssetBorrow error:', error)
    return { success: false, message: error?.message || 'Gagal membatalkan pengajuan' }
  }
}

/**
 * Permohonan Perpanjangan Waktu Peminjaman Aset (Loan Extension)
 */
export async function requestAssetBorrowExtension(params: {
  borrowId: number
  newExpectedReturnDate: string
  extensionReason: string
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, params.borrowId))
      .limit(1)

    if (!borrow) {
      return { success: false, message: 'Data peminjaman tidak ditemukan.' }
    }

    if (borrow.status !== 'borrowed') {
      return { success: false, message: 'Perpanjangan hanya dapat diajukan untuk aset yang sedang dipinjam.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isBorrower = Boolean(empContext?.employeeId && borrow.borrowerEmployeeId === empContext.employeeId)

    if (!isBorrower && !isSuperAdmin) {
      return { success: false, message: 'Hanya peminjam atau admin yang dapat mengajukan perpanjangan.' }
    }

    const newDate = new Date(params.newExpectedReturnDate)
    if (isNaN(newDate.getTime()) || newDate.getTime() <= new Date(borrow.borrowDate).getTime()) {
      return { success: false, message: 'Tanggal batas perpanjangan harus lebih besar dari tanggal mulai pinjam.' }
    }

    const now = new Date()
    const formattedNewDate = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(newDate)

    await db.transaction(async (tx) => {
      await tx
        .update(assetBorrows)
        .set({
          expectedReturnDate: newDate,
          updatedAt: now,
        })
        .where(eq(assetBorrows.id, params.borrowId))

      await tx.insert(assetBorrowHistories).values({
        assetBorrowId: params.borrowId,
        action: 'extension_requested',
        actorEmployeeId: empContext?.employeeId || borrow.borrowerEmployeeId,
        actorName: (empContext as any)?.employeeName || (empContext as any)?.name || borrow.borrowerName,
        actorRole: 'Peminjam',
        note: `Perpanjangan waktu pengembalian diajukan sampai ${formattedNewDate}. Alasan: ${params.extensionReason}`,
      })
    })

    // Notify Holder
    const [holderEmp] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(eq(employees.id, borrow.holderEmployeeId))
      .limit(1)

    if (holderEmp?.email) {
      await sendAssetBorrowExtensionRequestedEmail({
        holderEmail: holderEmp.email,
        holderName: holderEmp.name,
        borrowerName: borrow.borrowerName,
        borrowNumber: borrow.borrowNumber,
        assetName: borrow.assetName,
        newExpectedDate: formattedNewDate,
        extensionReason: params.extensionReason,
        borrowId: params.borrowId,
      }).catch((err) => console.error('[requestAssetBorrowExtension] Email error:', err))
    }

    await createNotificationEventForEmployee({
      employeeId: borrow.holderEmployeeId,
      eventType: 'asset_borrow_extension',
      category: 'approval_requests',
      title: `Perpanjangan Peminjaman: ${borrow.borrowNumber}`,
      body: `${borrow.borrowerName} mengajukan perpanjangan batas pengembalian untuk aset "${borrow.assetName}" hingga ${formattedNewDate}.`,
      url: '/dashboard/assets/borrow',
    }).catch((err) => console.error('[requestAssetBorrowExtension] Bell notify error:', err))

    revalidatePath('/dashboard/assets/borrow')

    return {
      success: true,
      message: `Perpanjangan batas waktu hingga ${formattedNewDate} berhasil dicatat.`,
    }
  } catch (error: any) {
    console.error('requestAssetBorrowExtension error:', error)
    return { success: false, message: error?.message || 'Gagal mengajukan perpanjangan waktu' }
  }
}

/**
 * Fetch Asset Borrow Histories List with Date Range, Action Filter, Search, and Pagination
 * Accessible by all logged in users.
 */
export async function getAssetBorrowHistoriesList(params?: {
  startDate?: string
  endDate?: string
  action?: string
  search?: string
  page?: number
  pageSize?: number
}) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Unauthorized',
        items: [],
        total: 0,
      }
    }

    const search = params?.search?.trim() || ''
    const actionFilter = params?.action?.trim() || ''
    const page = Math.max(1, params?.page || 1)
    const pageSize = Math.max(1, Math.min(200, params?.pageSize || 50))
    const offset = (page - 1) * pageSize

    const conditions = []

    // Date range filter on createdAt
    if (params?.startDate) {
      const start = new Date(params.startDate)
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0)
        conditions.push(sql`${assetBorrowHistories.createdAt} >= ${start}`)
      }
    }

    if (params?.endDate) {
      const end = new Date(params.endDate)
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999)
        conditions.push(sql`${assetBorrowHistories.createdAt} <= ${end}`)
      }
    }

    if (actionFilter && actionFilter !== 'all') {
      conditions.push(eq(assetBorrowHistories.action, actionFilter))
    }

    if (search) {
      conditions.push(
        or(
          ilike(assetBorrows.borrowNumber, `%${search}%`),
          ilike(assetBorrows.assetName, `%${search}%`),
          ilike(assetBorrows.assetNumber, `%${search}%`),
          ilike(assetBorrows.borrowerName, `%${search}%`),
          ilike(assetBorrows.holderName, `%${search}%`),
          ilike(assetBorrowHistories.actorName, `%${search}%`),
          ilike(assetBorrowHistories.note, `%${search}%`)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id: assetBorrowHistories.id,
        assetBorrowId: assetBorrowHistories.assetBorrowId,
        action: assetBorrowHistories.action,
        actorEmployeeId: assetBorrowHistories.actorEmployeeId,
        actorName: assetBorrowHistories.actorName,
        actorRole: assetBorrowHistories.actorRole,
        note: assetBorrowHistories.note,
        photoUrl: assetBorrowHistories.photoUrl,
        signatureUrl: assetBorrowHistories.signatureUrl,
        createdAt: assetBorrowHistories.createdAt,
        borrowNumber: assetBorrows.borrowNumber,
        assetName: assetBorrows.assetName,
        assetNumber: assetBorrows.assetNumber,
        serialNumber: assetBorrows.serialNumber,
        borrowerName: assetBorrows.borrowerName,
        holderName: assetBorrows.holderName,
        status: assetBorrows.status,
      })
      .from(assetBorrowHistories)
      .innerJoin(assetBorrows, eq(assetBorrowHistories.assetBorrowId, assetBorrows.id))
      .where(whereClause)
      .orderBy(desc(assetBorrowHistories.createdAt))
      .limit(pageSize)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetBorrowHistories)
      .innerJoin(assetBorrows, eq(assetBorrowHistories.assetBorrowId, assetBorrows.id))
      .where(whereClause)

    return {
      success: true,
      items: rows,
      total: count,
    }
  } catch (error: any) {
    console.error('getAssetBorrowHistoriesList error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal memuat riwayat pengajuan peminjaman aset',
      items: [],
      total: 0,
    }
  }
}
