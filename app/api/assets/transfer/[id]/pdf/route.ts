import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assetTransfers } from '@/db/schema/asset-transfer'
import { approvals, employees } from '@/db/schema/hero'
import { generateAssetTransferPdf } from '@/lib/asset-transfer-pdf'
import { asc, eq } from 'drizzle-orm'
import { isSuperAdminUser } from '@/lib/role-utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const transferId = parseInt(id, 10)
    if (isNaN(transferId)) {
      return NextResponse.json({ error: 'ID Transfer Aset tidak valid' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Akses ditolak: Silakan login terlebih dahulu' }, { status: 401 })
    }

    const [transfer] = await db
      .select()
      .from(assetTransfers)
      .where(eq(assetTransfers.id, transferId))
      .limit(1)

    if (!transfer) {
      return NextResponse.json({ error: 'Data Asset Transfer tidak ditemukan' }, { status: 404 })
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

    const isSuperAdmin = isSuperAdminUser(currentEmp, session.user)
    const isApplicant =
      (currentEmp?.id && transfer.applicantEmployeeId === currentEmp.id) ||
      (currentEmp?.id && transfer.currentHolderEmployeeId === currentEmp.id) ||
      (currentEmp?.id && transfer.newHolderEmployeeId === currentEmp.id) ||
      (session.user.id && transfer.createdById === session.user.id)

    // Approver check & employee details
    const [holderEmp, newHolderEmp, approvalRows] = await Promise.all([
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
        .where(eq(approvals.assetTransferId, transferId))
        .orderBy(asc(approvals.level)),
    ])

    const isAnyApprover = approvalRows.some(
      (a) => currentEmp?.id && a.approverEmployeeId === currentEmp.id
    )

    const canAccessPdf = isSuperAdmin || isApplicant || isAnyApprover || transfer.status === 'approved'

    if (!canAccessPdf) {
      return NextResponse.json(
        { error: 'Akses ditolak: Dokumen PDF hanya dapat diakses oleh pihak terkait dan Administrator' },
        { status: 403 }
      )
    }

    // Completeness text
    const completenessText =
      transfer.equipmentOtherNote ||
      (Array.isArray(transfer.equipmentChecklist) && transfer.equipmentChecklist.length > 0
        ? transfer.equipmentChecklist.join(', ')
        : 'Unit Lengkap beserta perlengkapan standar')

    const pdfApprovers = approvalRows.map((app) => ({
      level: app.level || 1,
      label: app.decisionNote || (app.formName || `Step ${app.level}`),
      approverName: app.approverName || 'Approver',
      approverJobTitle: app.jobTitle || app.formName || null,
      status: app.status || 'Pending',
      signedAt: app.reviewedAt,
      signatureUrl: app.signatureUrl,
      decisionNote: app.decisionNote || null,
    }))

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
      requestDate: transfer.submittedAt || transfer.createdAt,
      applicantName: transfer.currentHolderName,
      applicantSignatureUrl: transfer.applicantSignatureUrl,
      departmentName: transfer.currentLocationName,
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
      reason: transfer.notes || 'Pemindahan operasional penugasan aset',
      notes: transfer.notes,
      assetPhotos: parsedPhotos,
      photoUrl: parsedPhotos[0]?.fileUrl || null,
      approvers: pdfApprovers,
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${transfer.transferNumber}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[AssetTransferPdfRoute] Error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat dokumen PDF Asset Transfer: ' + (error?.message || '') },
      { status: 500 }
    )
  }
}
