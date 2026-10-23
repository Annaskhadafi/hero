import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('contract-review actions automatically synchronize approval steps with signatories', () => {
  const actionsPath = path.resolve('app/actions/contract-review.ts')
  const content = fs.readFileSync(actionsPath, 'utf8')

  // 1. syncExistingContractReviewApprovals function defined
  assert.ok(
    content.includes('syncExistingContractReviewApprovals('),
    'syncExistingContractReviewApprovals helper should be defined'
  )

  // 2. ensureContractReviewApprovals calls syncExistingContractReviewApprovals
  assert.ok(
    content.includes('await syncExistingContractReviewApprovals(review, existingApprovals)'),
    'ensureContractReviewApprovals must call syncExistingContractReviewApprovals'
  )

  // 3. Superior name synchronization
  assert.ok(
    content.includes('review.superiorName') &&
    content.includes("approverRole === 'section_head_confirmation'"),
    'superiorName should synchronize section_head_confirmation step'
  )

  // 4. Invalid signature reset when approver changed
  assert.ok(
    content.includes('superiorStep.signatureDataUrl') &&
    content.includes('updateData.signatureDataUrl = null'),
    'previous signature should be invalidated if approver name changed'
  )

  // 5. Case-insensitive name resolution with ilike
  assert.ok(
    content.includes('ilike(employees.name'),
    'getUserByName should support case-insensitive employee name matching'
  )
})

test('client form synchronizes approval list in real-time when signatories are changed', () => {
  const clientFormPath = path.resolve('app/dashboard/hc/contract-review/form/client-form.tsx')
  const content = fs.readFileSync(clientFormPath, 'utf8')

  // 1. Real-time sync function exists
  assert.ok(
    content.includes('syncApprovalSignatory = ('),
    'client-form should define syncApprovalSignatory'
  )

  // 2. Wired in Superior Name SearchableSelect
  assert.ok(
    content.includes("syncApprovalSignatory('superior', m.name, m)"),
    'Superior Name dropdown should call syncApprovalSignatory on change'
  )

  // 3. Wired in Leader Name SearchableSelect
  assert.ok(
    content.includes("syncApprovalSignatory('leader', m.name, m)"),
    'Leader Name dropdown should call syncApprovalSignatory on change'
  )

  // 4. Wired in Next Superior Name SearchableSelect
  assert.ok(
    content.includes("syncApprovalSignatory('nextSuperior', m.name, m)"),
    'Next Superior Name dropdown should call syncApprovalSignatory on change'
  )

  // 5. Wired in HR Recipient SearchableSelect
  assert.ok(
    content.includes("syncApprovalSignatory('hr', m.name, m)"),
    'HR Recipient dropdown should call syncApprovalSignatory on change'
  )

  // 6. Responsive useEffect syncs initialData / form changes
  assert.ok(
    content.includes('form.superiorName.trim().toLowerCase() !== (name || \'\').trim().toLowerCase()'),
    'useEffect should keep approvalsList in sync with form signatories'
  )
})
