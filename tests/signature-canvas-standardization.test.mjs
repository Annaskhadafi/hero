import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

test('SignaturePad component integrates profile signature, canvas drawing, image upload, and save to profile', () => {
  const sigPadFile = path.join(root, 'components/signature-pad.tsx')
  const content = fs.readFileSync(sigPadFile, 'utf8')

  assert.ok(content.includes('getUserSignatureAction'), 'Must import getUserSignatureAction')
  assert.ok(content.includes('saveUserSignatureAction'), 'Must import saveUserSignatureAction')
  assert.ok(content.includes('TTD Profil HERO Aktif'), 'Must show TTD Profil HERO Aktif badge')
  assert.ok(content.includes('Ubah / Gores Manual'), 'Must provide switch to manual signature')
  assert.ok(content.includes('Gunakan TTD Profil'), 'Must provide switch back to profile signature')
  assert.ok(content.includes('Upload Gambar'), 'Must provide image upload capability')
  assert.ok(content.includes('Simpan TTD Ini ke Profil HERO'), 'Must provide button to save newly drawn signature to profile')
  assert.ok(content.includes('getCroppedCanvas'), 'Must support trimmed canvas cropping')
})

test('Cargo Manifest uses unified SignaturePad and loads profile signature', () => {
  const cargoFile = path.join(root, 'components/cargo-manifest-panels.tsx')
  const content = fs.readFileSync(cargoFile, 'utf8')

  assert.ok(content.includes('SignaturePad'), 'Cargo manifest must use SignaturePad')
  assert.ok(content.includes('getUserSignatureAction'), 'Cargo manifest must load user profile info')
  assert.ok(!content.includes('isDrawingRef.current'), 'Old primitive canvas state should be removed')
})

test('RFR Requestor form uses unified SignaturePad and synchronizes with live PDF preview', () => {
  const rfrFormFile = path.join(root, 'app/dashboard/hc/rfr/form/client-form.tsx')
  const content = fs.readFileSync(rfrFormFile, 'utf8')

  assert.ok(content.includes('SignaturePad'), 'RFR client form must use SignaturePad')
  assert.ok(content.includes('defaultDataUrl={liveSignatureUrl}'), 'RFR client form must pass defaultDataUrl')
  assert.ok(content.includes('onDataUrlChange={setLiveSignatureUrl}'), 'RFR client form must update liveSignatureUrl')
})

test('RFR Admin approval dialog uses unified SignaturePad', () => {
  const rfrDialogFile = path.join(root, 'components/admin/rfr-approval-dialog.tsx')
  const content = fs.readFileSync(rfrDialogFile, 'utf8')

  assert.ok(content.includes('SignaturePad'), 'RFR approval dialog must use SignaturePad')
  assert.ok(content.includes('onDataUrlChange={setLiveSignatureUrl}'), 'RFR approval dialog must bind setLiveSignatureUrl')
})

test('Mobile RFR form and approval card use unified SignaturePad', () => {
  const mobileFormFile = path.join(root, 'app/mobile/rfr/new/mobile-form-client.tsx')
  const mobileCardFile = path.join(root, 'components/admin/mobile-rfr-approval-card.tsx')
  
  const formContent = fs.readFileSync(mobileFormFile, 'utf8')
  const cardContent = fs.readFileSync(mobileCardFile, 'utf8')

  assert.ok(formContent.includes('SignaturePad'), 'Mobile RFR form must use SignaturePad')
  assert.ok(cardContent.includes('SignaturePad'), 'Mobile RFR card must use SignaturePad')
})

test('Public RFR review page uses unified SignaturePad', () => {
  const publicRfrFile = path.join(root, 'app/review/rfr/[token]/public-approval.tsx')
  const content = fs.readFileSync(publicRfrFile, 'utf8')

  assert.ok(content.includes('SignaturePad'), 'RFR public approval must use SignaturePad')
})

test('Five-R, JSA, and Summary approval dialogs use unified SignaturePad', () => {
  const fiveRFile = path.join(root, 'components/admin/five-r-approval-dialog.tsx')
  const jsaFile = path.join(root, 'components/hse/jsa-form-dialog.tsx')
  const summaryFile = path.join(root, 'components/summary/summary-approval-dialog.tsx')

  const fiveRContent = fs.readFileSync(fiveRFile, 'utf8')
  const jsaContent = fs.readFileSync(jsaFile, 'utf8')
  const summaryContent = fs.readFileSync(summaryFile, 'utf8')

  assert.ok(fiveRContent.includes('SignaturePad'), 'Five R approval dialog must use SignaturePad')
  assert.ok(jsaContent.includes('SignaturePad'), 'JSA form dialog must use SignaturePad')
  assert.ok(summaryContent.includes('SignaturePad'), 'Summary approval dialog must use SignaturePad')
})
