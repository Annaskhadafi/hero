import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Daily Activity PDF & Evidence QR verification', () => {
  const pdfRoutePath = path.join(process.cwd(), 'app/api/activity-sessions/[sessionId]/pdf/route.ts')
  assert.ok(fs.existsSync(pdfRoutePath), 'PDF route file exists')
  const pdfContent = fs.readFileSync(pdfRoutePath, 'utf8')

  assert.ok(pdfContent.includes('QRCode'), 'PDF route imports QRCode')
  assert.ok(pdfContent.includes('activity-evidence'), 'PDF route generates URL to activity-evidence')
  assert.ok(pdfContent.includes('Evidence (QR)'), 'PDF table includes Evidence (QR) column')
  assert.ok(pdfContent.includes('qrImage'), 'PDF draws qrImage in header and table')

  const evidencePagePath = path.join(process.cwd(), 'app/activity-evidence/[sessionId]/page.tsx')
  assert.ok(fs.existsSync(evidencePagePath), 'Activity evidence page exists')

  const evidenceViewerPath = path.join(process.cwd(), 'components/activity-evidence-viewer.tsx')
  assert.ok(fs.existsSync(evidenceViewerPath), 'Activity evidence viewer component exists')
  const viewerContent = fs.readFileSync(evidenceViewerPath, 'utf8')
  assert.ok(viewerContent.includes('evidenceItems'), 'Viewer handles all evidence items')
  assert.ok(viewerContent.includes('selectedImage'), 'Viewer provides lightbox zoom')

  const docsHelperPath = path.join(process.cwd(), 'lib/daily-activity-documents.ts')
  const helperContent = fs.readFileSync(docsHelperPath, 'utf8')
  assert.ok(helperContent.includes('getPublicDailyActivityEvidenceData'), 'Documents helper exports getPublicDailyActivityEvidenceData')
})
