import { NextResponse } from 'next/server'
import { db } from '@/db'
import { repairFormWo } from '@/db/schema/form-wo'
import { approvals, employees } from '@/db/schema/hero'
import { generateFormWoPdf } from '@/lib/form-wo-pdf'
import { eq, asc } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formWoId = parseInt(id, 10)
    if (isNaN(formWoId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const [doc] = await db
      .select()
      .from(repairFormWo)
      .where(eq(repairFormWo.id, formWoId))
      .limit(1)

    if (!doc) {
      return NextResponse.json({ error: 'Form WO not found' }, { status: 404 })
    }

    let pemohonJobTitle = doc.jenisPengajuan === 'service' ? 'Service Operation Other' : 'Admin CP Site'
    if (doc.createdBy) {
      const creatorId = parseInt(doc.createdBy, 10)
      if (!isNaN(creatorId)) {
        const [emp] = await db
          .select({ jobTitle: employees.jobTitle, name: employees.name })
          .from(employees)
          .where(eq(employees.id, creatorId))
          .limit(1)
        if (emp?.jobTitle) pemohonJobTitle = emp.jobTitle
      }
    }

    const stepRows = await db
      .select()
      .from(approvals)
      .where(eq(approvals.repairFormWoId, formWoId))
      .orderBy(asc(approvals.level))

    const steps = stepRows.map((s) => ({
      level: s.level,
      approverName: s.approverName,
      jobTitle: s.routeSnapshot ? JSON.parse(s.routeSnapshot)?.label : 'Approver',
      signatureUrl: s.signatureUrl,
      status: s.status,
      reviewedAt: s.reviewedAt,
      decisionNote: s.decisionNote,
    }))

    const pdfBuffer = await generateFormWoPdf({
      id: doc.id,
      noPengajuan: doc.noPengajuan,
      jenisPengajuan: doc.jenisPengajuan,
      noWoTerbit: doc.noWoTerbit,
      noPo: doc.noPo,
      tanggalPo: doc.tanggalPo,
      hari: doc.hari,
      tanggal: doc.tanggal,
      tanggalPengajuan: doc.tanggalPengajuan,
      customer: doc.customer,
      site: doc.site,
      pemohon: doc.pemohon,
      pemohonJobTitle,
      submitterSignatureUrl: doc.submitterSignatureUrl,
      catatanPengajuan: doc.catatanPengajuan,
      totalAmount: doc.totalAmount,
      items: doc.items,
      steps,
    })

    const safeNo = (doc.noPengajuan || `WO-${doc.id}`).replace(/[^a-zA-Z0-9_-]/g, '_')

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Form_WO_${safeNo}_Landscape.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('Error generating Form WO PDF:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
