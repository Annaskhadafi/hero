import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { isSuperAdminRole } from '@/lib/hero-access'
import { db } from '@/db'
import { assetDisposals } from '@/db/schema/asset-disposal'
import { approvals, employees } from '@/db/schema/hero'
import { generateAssetDisposalPdf } from '@/lib/asset-disposal-pdf'
import { asc, eq } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const disposalId = parseInt(id, 10)
    if (isNaN(disposalId)) {
      return NextResponse.json({ error: 'ID Disposal tidak valid' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Akses ditolak: Silakan login terlebih dahulu' }, { status: 401 })
    }

    const [disposal] = await db
      .select()
      .from(assetDisposals)
      .where(eq(assetDisposals.id, disposalId))
      .limit(1)

    if (!disposal) {
      return NextResponse.json({ error: 'Data Asset Disposal tidak ditemukan' }, { status: 404 })
    }

    const isSuperAdmin = isSuperAdminRole((session.user as any)?.role)
    const isApplicant =
      (disposal.applicantEmployeeId && (session.user as any)?.employeeId === disposal.applicantEmployeeId) ||
      (session.user.name && disposal.applicantName && session.user.name.toLowerCase() === disposal.applicantName.toLowerCase())

    if (!isSuperAdmin && !isApplicant) {
      return NextResponse.json(
        { error: 'Akses ditolak: Dokumen PDF hanya dapat diunduh oleh Pengaju dan Administrator' },
        { status: 403 }
      )
    }

    // Fetch applicant details
    let applicantSn: string | null = null
    let applicantJobTitle = disposal.applicantJobTitle || null

    if (disposal.applicantEmployeeId) {
      const [emp] = await db
        .select({
          employeeSn: employees.employeeSn,
          jobTitle: employees.jobTitle,
        })
        .from(employees)
        .where(eq(employees.id, disposal.applicantEmployeeId))
        .limit(1)

      if (emp) {
        applicantSn = emp.employeeSn
        applicantJobTitle = emp.jobTitle || applicantJobTitle
      }
    }

    // Fetch approvals
    const approvalRows = await db
      .select()
      .from(approvals)
      .where(eq(approvals.assetDisposalId, disposalId))
      .orderBy(asc(approvals.level))

    let parsedAttachments = []
    try {
      parsedAttachments = JSON.parse(disposal.attachments || '[]')
    } catch {}

    const pdfBytes = await generateAssetDisposalPdf({
      disposalNumber: disposal.disposalNumber,
      disposalDate: disposal.disposalDate,
      status: disposal.status,
      applicantName: disposal.applicantName,
      applicantSn,
      applicantJobTitle,
      departmentName: disposal.departmentName,
      sectionName: disposal.sectionName,
      siteName: disposal.siteName,
      assetName: disposal.assetName,
      assetNumber: disposal.assetNumber,
      purchaseYear: disposal.purchaseYear,
      notes: disposal.notes,
      attachments: parsedAttachments,
      applicantSignatureUrl: disposal.applicantSignatureUrl || null,
      submittedAt: disposal.submittedAt,
      approvedAt: disposal.approvedAt,
      approvals: approvalRows.map((app) => ({
        level: app.level || 1,
        title: app.decisionNote?.startsWith('Step') ? app.decisionNote : (app.formName || `Step ${app.level}`),
        approverName: app.approverName || 'Approver',
        jobTitle: app.formName || null,
        status: app.status || 'Pending',
        reviewedAt: app.reviewedAt,
        decisionNote: app.decisionNote && !app.decisionNote.startsWith('Step') ? app.decisionNote : null,
      })),
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${disposal.disposalNumber}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[AssetDisposalPdfRoute] Error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat dokumen PDF Asset Disposal: ' + (error?.message || '') },
      { status: 500 }
    )
  }
}
