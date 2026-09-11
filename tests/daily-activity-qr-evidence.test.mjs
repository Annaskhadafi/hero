import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Daily Activity PDF & Evidence QR verification', () => {
  const pdfRoutePath = path.join(process.cwd(), 'app/api/activity-sessions/[sessionId]/pdf/route.ts')
  assert.ok(fs.existsSync(pdfRoutePath), 'PDF route file exists')
  const pdfContent = fs.readFileSync(pdfRoutePath, 'utf8')

  assert.ok(pdfContent.includes('QRCode.toDataURL'), 'PDF route embeds Evidence QR')
  assert.ok(pdfContent.includes('Remark'), 'PDF table includes Remark column')
  assert.ok(pdfContent.includes('Poin'), 'PDF table includes Poin column')
  assert.ok(pdfContent.includes('DAILY ACTIVITY APPROVAL REPORT'), 'PDF has Approval Report title')

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

  const desktopFormPath = path.join(process.cwd(), 'components/daily-activity-approval-form.tsx')
  const desktopFormContent = fs.readFileSync(desktopFormPath, 'utf8')
  assert.ok(desktopFormContent.includes('Remark'), 'Desktop approval form includes Remark column')
  assert.ok(desktopFormContent.includes('Poin'), 'Desktop approval form includes Poin column')
  assert.ok(desktopFormContent.includes('DailyActivityEvidenceModal'), 'Desktop approval form renders DailyActivityEvidenceModal')

  const modalPath = path.join(process.cwd(), 'components/daily-activity-evidence-modal.tsx')
  assert.ok(fs.existsSync(modalPath), 'DailyActivityEvidenceModal component exists')
  const modalContent = fs.readFileSync(modalPath, 'utf8')
  assert.ok(modalContent.includes('DailyActivityEvidenceModal'), 'Modal exports DailyActivityEvidenceModal')
  assert.ok(modalContent.includes('evidenceItems'), 'Modal handles evidence items')

  const apiRoutePath = path.join(process.cwd(), 'app/api/activity-sessions/[sessionId]/evidence/route.ts')
  assert.ok(fs.existsSync(apiRoutePath), 'Evidence API route exists')
  const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8')
  assert.ok(apiRouteContent.includes('cleanSessionId'), 'Evidence route cleans prefix if present')

  const clientPath = path.join(process.cwd(), 'app/dashboard/activity-hub/approval/client.tsx')
  assert.ok(fs.existsSync(clientPath), 'Approval client exists')
  const clientContent = fs.readFileSync(clientPath, 'utf8')
  assert.ok(clientContent.includes('DAILY ACTIVITY APPROVAL REPORT'), 'Approval client uses DAILY ACTIVITY APPROVAL REPORT title')
  assert.ok(clientContent.includes('DailyActivityEvidenceModal'), 'Approval client renders DailyActivityEvidenceModal')

  const publicPath = path.join(process.cwd(), 'app/review/daily-activity/[token]/public-approval.tsx')
  assert.ok(fs.existsSync(publicPath), 'Public approval exists')
  const publicContent = fs.readFileSync(publicPath, 'utf8')
  assert.ok(publicContent.includes('DAILY ACTIVITY APPROVAL REPORT'), 'Public approval uses DAILY ACTIVITY APPROVAL REPORT title')
  assert.ok(publicContent.includes('B. Approval Steps'), 'Public approval includes B. Approval Steps table')

  assert.ok(pdfContent.includes('drawApprovalStepsTable'), 'PDF route includes drawApprovalStepsTable')
  assert.ok(pdfContent.includes('Signatories'), 'PDF route includes Signatories title')
  assert.ok(!pdfContent.includes('{ title: "Unit"'), 'PDF table does not include Unit column')

  const mobileFormPath = path.join(process.cwd(), 'components/mobile/mobile-daily-activity-form.tsx')
  assert.ok(fs.existsSync(mobileFormPath), 'Mobile form exists')
  const mobileFormContent = fs.readFileSync(mobileFormPath, 'utf8')
  assert.ok(mobileFormContent.includes('existingUrls'), 'Mobile form restores existingUrls in selfInputEntries')
  assert.ok(mobileFormContent.includes('existingPreviewUrls'), 'Mobile form prepareEvidence preserves existing preview URLs')
})


