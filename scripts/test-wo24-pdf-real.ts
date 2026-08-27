import fs from 'fs'
import path from 'path'
import { db } from '../db'
import { approvals, employees } from '../db/schema/hero'
import { repairFormWo } from '../db/schema/form-wo'
import { eq, asc } from 'drizzle-orm'
import { generateFormWoPdf, type FormWoPdfData } from '../lib/form-wo-pdf'

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
    noPo: existing.noPo,
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

  console.log('Generating PDF with data...')
  const pdfBuffer = await generateFormWoPdf(pdfData)
  const outPath = path.join(process.cwd(), 'scripts', 'test-output-form-wo-real.pdf')
  fs.writeFileSync(outPath, pdfBuffer)
  console.log(`PDF saved to ${outPath} (${pdfBuffer.length} bytes)!`)
}

run().catch(console.error)
