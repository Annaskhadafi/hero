import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(path, 'utf8')

test('workflow studio exposes hardcode approval inventory', () => {
  const source = read('lib/approval-blueprint.ts')
  for (const key of [
    'apd-request',
    'central-service-pjo',
    'legacy-manager-fallback',
    'overtime-command-letter',
    'timesheet-period-review',
  ]) {
    assert.match(source, new RegExp(key))
  }
})

test('workflow builder handles active matrix scope', () => {
  const source = read('app/dashboard/workflow-studio/actions.ts')
  assert.match(source, /matrixId/)
  assert.match(source, /approvalMatrices/)
  assert.match(source, /transactionType/)
})

test('approval resolver checks matrix or specialized resolvers', () => {
  const source = read('lib/approval-engine.ts')
  assert.match(source, /matrixCandidates/)
  assert.match(source, /resolveApdApprovalRoute/)
})

test('workflow studio UI includes monitoring, email, reminder, and audit actions', () => {
  const source = read('components/workflow-studio-overview.tsx')
  for (const label of [
    'Monitoring Approval',
    'Template Email',
    'Reminder Jobs',
    'Audit',
    'Buat Approval',
    'Edit',
    'Resend',
    'Investigated',
  ]) {
    assert.match(source, new RegExp(label))
  }
})
