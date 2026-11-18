import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assetBorrows } from '@/db/schema/asset-borrow'
import { approvals, employees, masterDepartments } from '@/db/schema/hero'
import { generateAssetBorrowPdf } from '@/lib/asset-borrow-pdf'
import { asc, eq } from 'drizzle-orm'
import { isSuperAdminUser } from '@/lib/role-utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const borrowId = parseInt(id, 10)
    if (isNaN(borrowId)) {
      return NextResponse.json({ error: 'ID Peminjaman Aset tidak valid' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Akses ditolak: Silakan login terlebih dahulu' }, { status: 401 })
    }

    const [borrow] = await db
      .select()
      .from(assetBorrows)
      .where(eq(assetBorrows.id, borrowId))
      .limit(1)

    if (!borrow) {
      return NextResponse.json({ error: 'Data peminjaman aset tidak ditemukan' }, { status: 404 })
    }

    // Fetch current user employee record
    let currentEmp: any = null
    if (session.user.email) {
      const [emp] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1)
      currentEmp = emp || null
    }

    // Fetch borrower & holder employee details
    const [borrowerEmp, holderEmp, approvalRows] = await Promise.all([
      db
        .select({
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
          id: approvals.id,
          level: approvals.level,
          approverName: approvals.approverName,
          approverEmployeeId: approvals.approverEmployeeId,
          jobTitle: employees.jobTitle,
          status: approvals.status,
          reviewedAt: approvals.reviewedAt,
          signatureUrl: approvals.signatureUrl,
          decisionNote: approvals.decisionNote,
          formName: approvals.formName,
        })
        .from(approvals)
        .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
        .where(eq(approvals.assetBorrowId, borrowId))
        .orderBy(asc(approvals.level)),
    ])

    const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)
    const isApplicant =
      (currentEmp?.id && borrow.applicantEmployeeId === currentEmp.id) ||
      (currentEmp?.id && borrow.borrowerEmployeeId === currentEmp.id) ||
      (currentEmp?.id && borrow.holderEmployeeId === currentEmp.id) ||
      (session.user.id && borrow.createdById === session.user.id)

    const isAnyApprover = approvalRows.some(
      (a) => currentEmp?.id && a.approverEmployeeId === currentEmp.id
    )

    // Allowed for parties involved, approvers, super admin, or any logged in user viewing history/detail
    const canAccessPdf = isSuperAdmin || isApplicant || isAnyApprover || Boolean(session.user)

    if (!canAccessPdf) {
      return NextResponse.json(
        { error: 'Akses ditolak: Dokumen PDF hanya dapat diakses oleh pihak terkait dan Administrator' },
        { status: 403 }
      )
    }

    const pdfApprovers = approvalRows.map((app) => ({
      level: app.level || 1,
      title: app.decisionNote || (app.formName || `Step ${app.level}`),
      approverName: app.approverName || 'Approver',
      jobTitle: app.jobTitle || app.formName || 'Pemegang Aset',
      status: app.status || 'Pending',
      reviewedAt: app.reviewedAt,
      signatureUrl: app.signatureUrl,
      decisionNote: app.decisionNote || null,
    }))

    const pdfBytes = await generateAssetBorrowPdf({
      borrowNumber: borrow.borrowNumber,
      borrowDate: borrow.borrowDate,
      expectedReturnDate: borrow.expectedReturnDate,
      actualReturnDate: borrow.actualReturnDate,
      status: borrow.status,
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
      holderSignedAt: borrow.approvedAt || null,
      purpose: borrow.purpose,
      approvalNote: borrow.approvalNote,
      returnNotes: borrow.returnNotes,
      returnConditionNotes: borrow.returnConditionNotes,
      returnPhotoUrls: borrow.returnPhotoUrls,
      holderReturnSignatureUrl: borrow.holderReturnSignatureUrl || null,
      holderReturnSignedAt: borrow.holderReturnSignedAt || borrow.actualReturnDate || null,
      approvals: pdfApprovers,
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${borrow.borrowNumber}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[AssetBorrowPdfRoute] Error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat dokumen PDF Asset Borrow: ' + (error?.message || '') },
      { status: 500 }
    )
  }
}
