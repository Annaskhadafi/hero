import { db } from '../db'
import { createFiveRReportAction, getFiveRReportDetailAction } from '../app/dashboard/quality/5r/actions'

async function main() {
  console.log('=== TEST 5R SUBMIT WITH SIGNATURE & A4 PREVIEW DATA ===')

  const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  // 1. Submit report with signature
  const createRes = await createFiveRReportAction({
    masterAreaId: 7, // Balikpapan - Facility - Sandi
    picAreaName: 'Balikpapan – Facility – Sandi',
    siteId: 126,
    auditorId: 1181, // Ria Annisa Putri
    auditorName: 'Ria Annisa Putri',
    auditorEmail: 'ria.annisa@chitraparatama.co.id',
    auditPeriod: 'September',
    auditDate: '2026-09-02',
    reportType: 'ada_temuan',
    scoreRapi: 80,
    scoreRingkas: 80,
    scoreResik: 80,
    scoreRawat: 80,
    scoreRajin: 80,
    auditorSignatureUrl: fakeDataUrl,
    findings: [
      {
        category5r: 'Resik',
        area: 'Balikpapan – Facility – Sandi',
        findingDescription: 'Debu di rak arsip',
        findingPhotoUrl: 'https://example.com/photo.jpg',
        actionDescription: 'Pembersihan rutin',
        actionPhotoUrl: '',
        noFindingPhotoUrl: '',
      },
    ],
  })

  console.log('Create result:', createRes.message)
  if (!createRes.success || !createRes.reportId) {
    throw new Error('Failed to create report')
  }

  console.log('✅ Created report ID:', createRes.reportId)

  // 2. Fetch detail and check auditorSignatureUrl
  const detailRes = await getFiveRReportDetailAction(createRes.reportId)
  if (!detailRes.success || !detailRes.report) {
    throw new Error('Failed to get detail')
  }

  const r = detailRes.report
  console.log('Report Number:', r.reportNumber)
  console.log('Auditor Name:', r.auditorName)
  console.log('Auditor Signature URL present:', Boolean(r.auditorSignatureUrl))

  if (r.auditorSignatureUrl === fakeDataUrl) {
    console.log('🎉 VERIFIED: Auditor signature is successfully stored and available for A4 document preview!')
  } else {
    throw new Error(`Expected signature ${fakeDataUrl}, got ${r.auditorSignatureUrl}`)
  }
}

main().then(() => process.exit(0)).catch(console.error)
