import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdminRole } from '@/lib/hero-access'
import { db } from '@/db'
import { cerRequests, cerItems } from '@/db/schema/cer'
import { approvals, employees, sites, masterDepartments, masterSections } from '@/db/schema/hero'
import { generateCerPdf } from '@/lib/cer-pdf'
import { saveGeneratedPdfUpload } from '@/lib/save-pdf-upload'
import { asc, eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cerId = parseInt(id, 10)
    if (isNaN(cerId)) {
      return NextResponse.json({ error: 'ID CER tidak valid' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Akses ditolak: Silakan login terlebih dahulu' }, { status: 401 })
    }

    const [cer] = await db
      .select({
        id: cerRequests.id,
        cerNumber: cerRequests.cerNumber,
        subject: cerRequests.subject,
        purchaseType: cerRequests.purchaseType,
        budgetSource: cerRequests.budgetSource,
        level: cerRequests.level,
        assetCategory: cerRequests.assetCategory,
        purchasePurpose: cerRequests.purchasePurpose,
        vendorName: cerRequests.vendorName,
        totalEstimatedPrice: cerRequests.totalEstimatedPrice,
        dateRequired: cerRequests.dateRequired,
        kelompokAset: cerRequests.kelompokAset,
        status: cerRequests.status,
        pdfUrl: cerRequests.pdfUrl,
        applicantSignatureUrl: cerRequests.applicantSignatureUrl,
        createdAt: cerRequests.createdAt,
        approvedAt: cerRequests.approvedAt,
        financeCheckedAt: cerRequests.financeCheckedAt,
        financeCheckedByEmployeeId: cerRequests.financeCheckedByEmployeeId,
        applicantEmployeeId: cerRequests.applicantEmployeeId,
        createdById: cerRequests.createdById,
        applicantName: employees.name,
        applicantSn: employees.employeeSn,
        applicantJobTitle: employees.jobTitle,
        departmentName: masterDepartments.name,
        sectionName: masterSections.name,
        siteName: sites.name,
      })
      .from(cerRequests)
      .leftJoin(employees, eq(cerRequests.applicantEmployeeId, employees.id))
      .leftJoin(masterDepartments, eq(cerRequests.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(cerRequests.sectionId, masterSections.id))
      .leftJoin(sites, eq(cerRequests.siteId, sites.id))
      .where(eq(cerRequests.id, cerId))
      .limit(1)

    if (!cer) {
      return NextResponse.json({ error: 'Data CER tidak ditemukan' }, { status: 404 })
    }

    const userRole = ((session.user as any)?.role || '').toLowerCase()
    const userEmpId = (session.user as any)?.employeeId
    const isSuperAdmin = isSuperAdminRole((session.user as any)?.role) || userRole.includes('admin') || userRole.includes('director') || userRole.includes('finance')
    const isApplicant =
      (cer.applicantEmployeeId && userEmpId === cer.applicantEmployeeId) ||
      (cer.createdById && session.user.id === cer.createdById) ||
      (session.user.name && cer.applicantName && session.user.name.toLowerCase() === cer.applicantName.toLowerCase())

    let isApprover = false
    if (userEmpId) {
      const [appr] = await db
        .select({ id: approvals.id })
        .from(approvals)
        .where(
          and(
            eq(approvals.cerRequestId, cerId),
            eq(approvals.approverEmployeeId, userEmpId)
          )
        )
        .limit(1)
      if (appr) isApprover = true
    }

    if (!isSuperAdmin && !isApplicant && !isApprover) {
      return NextResponse.json(
        { error: 'Akses ditolak: Dokumen PDF hanya dapat diunduh oleh Pengaju, Approver, dan Administrator' },
        { status: 403 }
      )
    }

    // Fetch items
    const items = await db
      .select()
      .from(cerItems)
      .where(eq(cerItems.cerRequestId, cerId))
      .orderBy(asc(cerItems.id))

    // Fetch approvals
    const approvalRows = await db
      .select({
        id: approvals.id,
        level: approvals.level,
        status: approvals.status,
        approverName: approvals.approverName,
        jobTitle: employees.jobTitle,
        formName: approvals.formName,
        decisionNote: approvals.decisionNote,
        signatureUrl: approvals.signatureUrl,
        reviewedAt: approvals.reviewedAt,
      })
      .from(approvals)
      .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
      .where(eq(approvals.cerRequestId, cerId))
      .orderBy(asc(approvals.level))

    // Fetch Finance checker name if applicable
    let financeCheckerName = 'Syamsul Bahri / Evo Dwi'
    if (cer.financeCheckedByEmployeeId) {
      const [fc] = await db
        .select({ name: employees.name })
        .from(employees)
        .where(eq(employees.id, cer.financeCheckedByEmployeeId))
        .limit(1)
      if (fc?.name) financeCheckerName = fc.name
    }

    // After generating PDF, save it and update the record, then return the URL
    const pdfBuffer = await generateCerPdf({
      cerNumber: cer.cerNumber,
      subject: cer.subject,
      applicantName: cer.applicantName || 'Pemohon',
      applicantSn: cer.applicantSn || null,
      applicantJobTitle: cer.applicantJobTitle || 'Pemohon Capex',
      applicantSignatureUrl: cer.applicantSignatureUrl || null,
      siteName: cer.siteName || 'Balikpapan',
      departmentName: cer.departmentName || 'Central Services',
      sectionName: cer.sectionName || null,
      level: cer.level || 'Staff',
      purchaseType: cer.purchaseType,
      budgetSource: cer.budgetSource,
      assetCategory: cer.assetCategory,
      purchasePurpose: cer.purchasePurpose,
      vendorName: cer.vendorName,
      totalEstimatedPrice: cer.totalEstimatedPrice || 0,
      dateRequired: cer.dateRequired,
      kelompokAset: cer.kelompokAset || 'IT Device & Elektronik',
      financeCheckedAt: cer.financeCheckedAt || cer.approvedAt,
      financeCheckedByName: financeCheckerName,
      createdAt: cer.createdAt,
      approvedAt: cer.approvedAt,
      items: items.map((it) => ({
        description: it.description,
        qty: it.qty,
        pricePerUnit: it.pricePerUnit,
        totalPrice: it.totalPrice,
        allocation: it.allocation || undefined,
        holderName: it.holderName || undefined,
        estimatedLifespan: it.estimatedLifespan || undefined,
        assetNumber: it.assetNumber || undefined,
      })),
      approvals: approvalRows.map((app) => ({
        stepOrder: app.level,
        label: app.formName || app.decisionNote || `Tahap ${app.level}`,
        approverName: app.approverName,
        jobTitle: app.jobTitle || app.formName || `Approver Step ${app.level}`,
        status: app.status,
        reviewedAt: app.reviewedAt,
        signatureUrl: app.signatureUrl,
        decisionNote: app.decisionNote,
      })),
    })
    // Save the PDF and update the record
    const pdfUrl = await saveGeneratedPdfUpload(pdfBuffer, 'cer-pdf', cer.cerNumber)
    // Update cerRequests table with the new pdfUrl (ignore if already set)
    await db
      .update(cerRequests)
      .set({ pdfUrl })
      .where(eq(cerRequests.id, cerId))



    const safeFilename = `CER_${cer.cerNumber.replace(/[\\/]/g, '_')}.pdf`
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('[API /api/assets/cer/[id]/pdf] Error:', err)
    return NextResponse.json(
      { error: 'Gagal men-generate dokumen PDF CER', details: err?.message },
      { status: 500 }
    )
  }
}
