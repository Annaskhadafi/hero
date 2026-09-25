import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('contract review schema includes attachments jsonb column', () => {
  const schemaPath = path.resolve('db/schema/hero.ts')
  const content = fs.readFileSync(schemaPath, 'utf8')
  assert.ok(content.includes("attachments: jsonb('attachments')"), 'attachments jsonb column must be declared in hero_hc_employee_contract_reviews')
})

test('contract review server actions support adding and deleting attachments with session or approval token', () => {
  const actionsPath = path.resolve('app/actions/contract-review.ts')
  const content = fs.readFileSync(actionsPath, 'utf8')
  assert.ok(content.includes('export async function addContractReviewAttachment'), 'addContractReviewAttachment must be exported')
  assert.ok(content.includes('export async function deleteContractReviewAttachment'), 'deleteContractReviewAttachment must be exported')
  assert.ok(content.includes('attachments: updatedAttachments'), 'updatedAttachments must be saved to database')
})

test('upload file action authorizes contract review attachments with approval token or session', () => {
  const uploadPath = path.resolve('app/actions/upload.ts')
  const content = fs.readFileSync(uploadPath, 'utf8')
  assert.ok(content.includes('isContractReviewAttachment'), 'uploadTarget contract-review-attachment must be handled')
  assert.ok(content.includes('approvalToken'), 'approvalToken must be validated if session is not present')
})

test('client form implements percentage inputs, auto summary logic, and attachments preview', () => {
  const formPath = path.resolve('app/dashboard/hc/contract-review/form/client-form.tsx')
  const content = fs.readFileSync(formPath, 'utf8')

  // Percentage input & scoring logic
  assert.ok(content.includes('formatAchievementDisplay'), 'must have formatAchievementDisplay helper')
  assert.ok(content.includes('exceed') && content.includes('meet') && content.includes('below'), 'must check exceed, meet, and below categories')
  assert.ok(content.includes('type="number"'), 'must use number input for percentage')

  // Attachments card and preview
  assert.ok(content.includes('Lampiran Dokumen Pendukung'), 'must include Lampiran Dokumen Pendukung section')
  assert.ok(content.includes('attachmentsPreviewSection'), 'must render attachmentsPreviewSection')
  assert.ok(content.includes('handleFileUpload'), 'must handle file upload')
  assert.ok(content.includes('handleDeleteAttachment'), 'must handle attachment deletion')
})

test('public approval implements percentage display, auto summary, upload card, and cumulative attachments preview', () => {
  const publicPath = path.resolve('app/review/[token]/public-approval.tsx')
  const content = fs.readFileSync(publicPath, 'utf8')

  // Percentage logic in public approval
  assert.ok(content.includes('formatAchievementDisplay'), 'must have formatAchievementDisplay in public approval')
  assert.ok(content.includes("achCategory === 'exceed'"), 'must check exceed category')
  assert.ok(content.includes("achCategory === 'meet'"), 'must check meet category')
  assert.ok(content.includes("achCategory === 'below'"), 'must check below category')

  // Public upload & cumulative preview
  assert.ok(content.includes('Lampiran Dokumen'), 'must include Lampiran Dokumen section in sidebar')
  assert.ok(content.includes('handleFileUpload'), 'must implement upload handler for signatories')
  assert.ok(content.includes('handleDeleteAttachment'), 'must implement delete handler for signatories')
  assert.ok(content.includes('Lampiran Dokumen Pendukung'), 'must render Lampiran Dokumen Pendukung below preview letter')
})

test('public approval and action support selectable revert target to any previous step with feedback', () => {
  const actionsPath = path.resolve('app/actions/contract-review.ts')
  const actionsContent = fs.readFileSync(actionsPath, 'utf8')
  assert.ok(actionsContent.includes('export async function revertContractReviewStep'), 'must export revertContractReviewStep')
  assert.ok(actionsContent.includes('targetStepOrder'), 'must take targetStepOrder')
  assert.ok(actionsContent.includes("leaderSignatureDataUrl = null"), 'must reset leaderSignatureDataUrl if reverted to step 1')

  const publicPath = path.resolve('app/review/[token]/public-approval.tsx')
  const publicContent = fs.readFileSync(publicPath, 'utf8')
  assert.ok(publicContent.includes('previousSteps'), 'must compute previousSteps for selection')
  assert.ok(publicContent.includes('revertTargetStep'), 'must have revertTargetStep state')
  assert.ok(publicContent.includes('revertRemarks'), 'must have revertRemarks state')
  assert.ok(publicContent.includes('revertedMessage'), 'must have visual feedback for reverted action')
  assert.ok(publicContent.includes('revertNoteFromLaterStep'), 'must display revert reason from later step')
  assert.ok(publicContent.includes('pdfScale'), 'must include pdfScale hook for mobile fit')
})
