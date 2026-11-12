import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdminRole } from '@/lib/hero-access'
import { db } from '@/db'
import { cerRequests, cerItems } from '@/db/schema/cer'
import { employees, sites, masterDepartments, masterSections } from '@/db/schema/hero'
import { generateCerBastPdf } from '@/lib/cer-bast-pdf'
import { asc, eq } from 'drizzle-orm'

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
        bastNumber: cerRequests.bastNumber,
        subject: cerRequests.subject,
        assetCategory: cerRequests.assetCategory,
        vendorName: cerRequests.vendorName,
        dateRequired: cerRequests.dateRequired,
        kelompokAset: cerRequests.kelompokAset,
        status: cerRequests.status,
        bastPdfUrl: cerRequests.bastPdfUrl,
        receiverSignatureUrl: cerRequests.receiverSignatureUrl,
        receiverNotes: cerRequests.receiverNotes,
        receivedAt: cerRequests.receivedAt,
        createdAt: cerRequests.createdAt,
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
    const isSuperAdmin = isSuperAdminRole((session.user as any)?.role) || userRole.includes('admin') || userRole.includes('director') || userRole.includes('finance')
    const isApplicant =
      (cer.applicantEmployeeId && session.user.employeeId === cer.applicantEmployeeId) ||
      (cer.createdById && session.user.id === cer.createdById) ||
      (session.user.name && cer.applicantName && session.user.name.toLowerCase() === cer.applicantName.toLowerCase())

    if (!isSuperAdmin && !isApplicant) {
      return NextResponse.json(
        { error: 'Akses ditolak: Dokumen BAST hanya dapat diunduh oleh Pengaju dan Administrator' },
        { status: 403 }
      )
    }

    // Fetch items
    const items = await db
      .select()
      .from(cerItems)
      .where(eq(cerItems.cerRequestId, cerId))
      .orderBy(asc(cerItems.id))

    const bastNumber = cer.bastNumber || `BAST-${cer.cerNumber.replace(/^CER\//, '')}`

    const pdfBuffer = await generateCerBastPdf({
      cerNumber: cer.cerNumber,
      bastNumber,
      handoverDate: cer.receivedAt || new Date(),
      userName: cer.applicantName || 'Penerima Aset',
      applicantName: cer.applicantName || 'Penerima Aset',
      userJobTitle: cer.applicantJobTitle || 'Karyawan',
      applicantJobTitle: cer.applicantJobTitle || 'Karyawan',
      userDepartment: cer.departmentName || '-',
      departmentName: cer.departmentName || '-',
      userSite: cer.siteName || '-',
      siteName: cer.siteName || '-',
      vendorName: cer.vendorName || 'Supplier / Rekanan',
      gaName: 'General Affairs / PIC Logistik',
      kelompokAset: cer.kelompokAset || undefined,
      assetCategory: cer.assetCategory,
      subject: cer.subject,
      dateRequired: cer.dateRequired || undefined,
      receivedAt: cer.receivedAt || undefined,
      receiverNotes: cer.receiverNotes || undefined,
      receiverSignatureUrl: cer.receiverSignatureUrl || undefined,
      items: items.map((it) => ({
        description: it.description,
        qty: it.qty,
        assetNumber: it.assetNumber || undefined,
        pricePerUnit: it.pricePerUnit,
        totalPrice: it.totalPrice,
      })),
    })

    const safeFilename = `${bastNumber.replace(/[\/\\]/g, '_')}.pdf`

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('[API /api/assets/cer/[id]/bast-pdf] Error:', err)
    return NextResponse.json(
      { error: 'Gagal men-generate dokumen PDF BAST', details: err?.message },
      { status: 500 }
    )
  }
}
