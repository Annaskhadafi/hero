'use server'

import { db } from '@/db'
import { assetBorrows, type AssetBorrowRow } from '@/db/schema/asset-borrow'
import { centralServiceAssets } from '@/db/schema/central-service'
import { employees, sites, masterDepartments, approvals } from '@/db/schema/hero'
import { generateAssetBorrowPdf } from '@/lib/asset-borrow-pdf'
import { saveGeneratedPdfUpload } from '@/lib/save-pdf-upload'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployeeAccessContext, isSuperAdminRole } from '@/lib/hero-access'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { assetBorrowInputSchema, type AssetBorrowInput } from './schema'
import { sendAssetRevisionRequestedEmail, sendAssetResubmittedEmail } from '@/lib/asset-approval-email'

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
        kpi: { total: 0, pending: 0, borrowed: 0, returned: 0 },
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
        holderEmployeeId: assetBorrows.holderEmployeeId,
        holderName: assetBorrows.holderName,
        equipmentNotes: assetBorrows.equipmentNotes,
        purpose: assetBorrows.purpose,
        borrowDate: assetBorrows.borrowDate,
        expectedReturnDate: assetBorrows.expectedReturnDate,
        actualReturnDate: assetBorrows.actualReturnDate,
        returnNotes: assetBorrows.returnNotes,
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
      returned: 0,
    }

    for (const r of kpiRows) {
      kpi.total += r.count
      if (r.status === 'pending') kpi.pending += r.count
      if (r.status === 'borrowed') kpi.borrowed += r.count
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

      return {
        ...r,
        canApprove: Boolean((r.status === 'pending') && (isHolder || isSuperAdmin)),
        canReturn: Boolean((r.status === 'borrowed') && (isHolder || isBorrower || isSuperAdmin)),
        canCancel: Boolean((r.status === 'pending') && (isCreator || isSuperAdmin)),
        canEditRevision: Boolean((r.status === 'needs_revision') && (isCreator || isBorrower || isSuperAdmin)),
        canDownload: Boolean(isBorrower || isCreator || isHolder || isSuperAdmin),
      }
    })

    return {
      success: true,
      items: mappedItems,
      total: count,
      kpi,
    }
  } catch (error: any) {
    console.error('getAssetBorrows error:', error)
    return {
      success: false,
      message: error?.message || 'Gagal memuat data peminjaman aset',
      items: [],
      total: 0,
      kpi: { total: 0, pending: 0, borrowed: 0, returned: 0 },
    }
  }
}

/**
 * Fetch single Asset Borrow detail
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

    const approvalSteps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.assetBorrowId, id))
      .orderBy(approvals.level)

    return {
      success: true,
      item: {
        ...borrow,
        approvalSteps,
        canApprove: Boolean((borrow.status === 'pending') && (isHolder || isSuperAdmin)),
        canReturn: Boolean((borrow.status === 'borrowed') && (isHolder || isBorrower || isSuperAdmin)),
        canCancel: Boolean((borrow.status === 'pending') && (isCreator || isSuperAdmin)),
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
      const firstError = validated.error.errors[0]?.message || 'Validasi formulir gagal'
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
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(eq(employees.id, asset.holderEmployeeId))
      .limit(1)

    if (!holder) {
      return { success: false, message: 'Data pemegang aset saat ini tidak valid.' }
    }

    // 3. Validate Borrower
    const [borrower] = await db
      .select({ id: employees.id, name: employees.name })
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

    // 5. Insert Record
    const [newBorrow] = await db
      .insert(assetBorrows)
      .values({
        borrowNumber,
        assetId: asset.id,
        assetName: asset.description,
        assetNumber: asset.assetNumber || '',
        serialNumber: asset.serialNumber || '',
        borrowerEmployeeId: borrower.id,
        borrowerName: borrower.name,
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

    // Sync to hero_approvals for central Approval Inbox
    await db.insert(approvals).values({
      assetBorrowId: newBorrow.id,
      level: 1,
      approverName: holder.name,
      approverEmployeeId: holder.id,
      status: 'Pending',
      formName: 'Formulir Peminjaman Aset (Asset Borrow)',
      activityType: 'ASSET_BORROW',
      requestNumber: borrowNumber,
      activityTitle: `Peminjaman Aset: ${asset.description}`,
      submittedAt: now,
    })

    revalidatePath('/dashboard/assets/borrow')
    revalidatePath('/dashboard/central-service/assets')

    return {
      success: true,
      message: `Peminjaman aset berhasil diajukan dengan nomor ${newBorrow.borrowNumber}`,
      item: newBorrow,
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
        borrowerSignatureUrl: borrower?.signatureDataUrl,
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
    })

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
    })

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
 * Return Asset (Kembalikan Aset Fisik)
 */
export async function returnAssetBorrow(id: number, returnNotes?: string) {
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

    if (borrow.status !== 'borrowed') {
      return { success: false, message: `Aset ini tidak dalam status dipinjam (status: ${borrow.status}).` }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isHolder = Boolean(empContext?.employeeId && borrow.holderEmployeeId === empContext.employeeId)
    const isBorrower = Boolean(empContext?.employeeId && borrow.borrowerEmployeeId === empContext.employeeId)

    if (!isHolder && !isBorrower && !isSuperAdmin) {
      return {
        success: false,
        message: 'Hanya Holder Aset, Peminjam, atau Super Admin yang dapat mengonfirmasi pengembalian aset.',
      }
    }

    const now = new Date()

    await db.transaction(async (tx) => {
      // 1. Update Borrow record
      await tx
        .update(assetBorrows)
        .set({
          status: 'returned',
          actualReturnDate: now,
          returnNotes: returnNotes?.trim() || null,
          updatedAt: now,
        })
        .where(eq(assetBorrows.id, id))

      // 2. Restore Central Service Asset condition to 'ACTIVE'
      await tx
        .update(centralServiceAssets)
        .set({
          condition: 'ACTIVE',
          updatedAt: now,
        })
        .where(eq(centralServiceAssets.id, borrow.assetId))
    })

    revalidatePath('/dashboard/assets/borrow')
    revalidatePath('/dashboard/central-service/assets')

    return {
      success: true,
      message: `Aset ${borrow.assetName} telah berhasil dikonfirmasi kembali ke pemegang aset.`,
    }
  } catch (error: any) {
    console.error('returnAssetBorrow error:', error)
    return { success: false, message: error?.message || 'Gagal mengonfirmasi pengembalian aset' }
  }
}

/**
 * Cancel Asset Borrow (Pembatalan Pengajuan oleh Pembuat/Admin)
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

    if (borrow.status !== 'pending') {
      return { success: false, message: 'Hanya pengajuan berstatus Pending yang dapat dibatalkan.' }
    }

    const empContext = await getCurrentEmployeeAccessContext()
    const isSuperAdmin = isSuperAdminRole(empContext?.roleName)
    const isCreator = Boolean(
      (empContext?.employeeId && borrow.applicantEmployeeId === empContext.employeeId) ||
      (session.user.id && borrow.createdById === session.user.id)
    )

    if (!isCreator && !isSuperAdmin) {
      return {
        success: false,
        message: 'Anda tidak memiliki hak untuk membatalkan pengajuan ini.',
      }
    }

    await db.delete(assetBorrows).where(eq(assetBorrows.id, id))

    revalidatePath('/dashboard/assets/borrow')

    return {
      success: true,
      message: `Pengajuan peminjaman ${borrow.borrowNumber} telah berhasil dibatalkan dan dihapus.`,
    }
  } catch (error: any) {
    console.error('cancelAssetBorrow error:', error)
    return { success: false, message: error?.message || 'Gagal membatalkan pengajuan' }
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
        revertedByName: empContext?.employeeName || borrow.holderName,
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
