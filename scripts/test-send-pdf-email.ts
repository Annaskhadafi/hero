import { db } from '../db'
import { approvals } from '../db/schema/hero'
import { repairFormWo } from '../db/schema/form-wo'
import { eq, asc } from 'drizzle-orm'
import { sendFormWoCompletedWithPdfEmail } from '../lib/form-wo-email'
import { type FormWoPdfData } from '../lib/form-wo-pdf'

async function run() {
  const existing = await db
    .select()
    .from(repairFormWo)
    .where(eq(repairFormWo.noPengajuan, 'FRMWO/26/08/0024'))
    .limit(1)
    .then((r) => r[0])

  if (!existing) {
    console.log('Not found')
    return
  }

  const stepRows = await db
    .select()
    .from(approvals)
    .where(eq(approvals.repairFormWoId, existing.id))
    .orderBy(asc(approvals.level))

  const pdfSteps = stepRows.map((s) => {
    let jobTitle = 'Approver'
    if (s.routeSnapshot) {
      try {
        const snap = JSON.parse(s.routeSnapshot)
        jobTitle = snap.label || snap.nodeLabel || jobTitle
      } catch {}
    }
    return {
      level: s.level,
      approverName: s.approverName,
      jobTitle,
      signatureUrl: s.signatureUrl,
      status: s.status,
      reviewedAt: s.reviewedAt,
      decisionNote: s.decisionNote,
    }
  })

  const pdfData: FormWoPdfData = {
    id: existing.id,
    noPengajuan: existing.noPengajuan,
    jenisPengajuan: existing.jenisPengajuan,
    noWoTerbit: '65657575',
    noPo: existing.noPo || '-',
    tanggalPo: existing.tanggalPo ? String(existing.tanggalPo) : null,
    hari: existing.hari,
    tanggal: existing.tanggal ? String(existing.tanggal) : null,
    tanggalPengajuan: existing.createdAt,
    customer: existing.customer,
    site: existing.site,
    pemohon: existing.pemohon,
    submitterSignatureUrl: existing.submitterSignatureUrl,
    catatanPengajuan: existing.catatanPengajuan,
    totalAmount: existing.totalAmount,
    items: existing.items,
    steps: pdfSteps,
  }

  console.log('Sending Completed Form WO PDF email to andirivlni@gmail.com...')
  const res = await sendFormWoCompletedWithPdfEmail({
    adminCpSiteEmail: 'andirivlni@gmail.com',
    qcLeaderEmail: 'andirivlni@gmail.com',
    pemohon: existing.pemohon || 'Admin CP Site',
    noPengajuan: existing.noPengajuan,
    noWoTerbit: '65657575',
    noPo: existing.noPo || '-',
    customer: existing.customer || '-',
    site: existing.site || '-',
    jobType: existing.jobType || '-',
    totalAmount: existing.totalAmount || '-',
    pdfData,
  })

  console.log('Result:', res)
}

run().catch(console.error)
