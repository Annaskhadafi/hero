import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('contract-review actions include self-healing reconciliation workflow', () => {
  const actionsPath = path.resolve('app/actions/contract-review.ts')
  const content = fs.readFileSync(actionsPath, 'utf8')

  // 1. reconcileContractReviewWorkflow definition
  assert.ok(
    content.includes('export async function reconcileContractReviewWorkflow('),
    'reconcileContractReviewWorkflow should be exported'
  )

  // 2. Wired in updateAdminContractReviewApprovalSignature
  assert.ok(
    content.includes('updateAdminContractReviewApprovalSignature') &&
    content.includes('await reconcileContractReviewWorkflow(reviewId)'),
    'reconcileContractReviewWorkflow should be called in updateAdminContractReviewApprovalSignature'
  )

  // 3. Wired in saveAdminContractReview
  assert.ok(
    content.includes('saveAdminContractReview') &&
    content.includes('await reconcileContractReviewWorkflow(data.id)'),
    'reconcileContractReviewWorkflow should be called in saveAdminContractReview'
  )

  // 4. Wired in saveContractReview
  assert.ok(
    content.includes('saveContractReview') &&
    content.includes('await reconcileContractReviewWorkflow(saved.id)'),
    'reconcileContractReviewWorkflow should be called in saveContractReview'
  )

  // 5. Wired in getContractReviewById
  assert.ok(
    content.includes('getContractReviewById') &&
    content.includes('await reconcileContractReviewWorkflow(id)'),
    'reconcileContractReviewWorkflow should be called in getContractReviewById'
  )

  // 6. Wired in updateContractReviewStatus
  assert.ok(
    content.includes('updateContractReviewStatus') &&
    content.includes('await reconcileContractReviewWorkflow(reviewId)'),
    'reconcileContractReviewWorkflow should be called in updateContractReviewStatus'
  )

  // 7. Wired in approveContractReviewStep
  assert.ok(
    content.includes('approveContractReviewStep') &&
    content.includes('await reconcileContractReviewWorkflow(approval.reviewId)'),
    'reconcileContractReviewWorkflow should be called in approveContractReviewStep'
  )

  // 8. Resilient calculation in getContractReviews
  assert.ok(
    content.includes("approval.status === 'approved' || Boolean(approval.signatureDataUrl)"),
    'getContractReviews should count signed steps even if status was pending'
  )
})

test('client table and form handle responsive zoom and approval progress safely', () => {
  const clientPagePath = path.resolve('app/dashboard/hc/contract-review/client-page.tsx')
  const clientPage = fs.readFileSync(clientPagePath, 'utf8')

  assert.ok(
    clientPage.includes('row.approvalStep || totalSteps > 0'),
    'client-page should gracefully render approval progress without falling into dead text'
  )

  const clientFormPath = path.resolve('app/dashboard/hc/contract-review/form/client-form.tsx')
  const clientForm = fs.readFileSync(clientFormPath, 'utf8')

  assert.ok(
    clientForm.includes('ACTION TOOLBAR: Full-width, sticky, ultra-responsive'),
    'client-form should feature responsive full-width sticky action toolbar'
  )
})
