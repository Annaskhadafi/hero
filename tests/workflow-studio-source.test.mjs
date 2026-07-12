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

test('workflow builder blocks duplicate active matrix scope', () => {
  const source = read('app/dashboard/workflow-studio/actions.ts')
  assert.match(source, /Workflow aktif sudah ada/)
  assert.match(source, /matrixId/)
  assert.match(source, /eq\(approvalMatrices\.isActive, true\)/)
  assert.match(source, /eq\(approvalMatrices\.transactionType, payload\.transactionType\)/)
  assert.match(source, /eq\(approvalMatrices\.siteId, payload\.siteId\)/)
})

test('approval resolver checks matrix before hardcode fallback', () => {
  const source = read('lib/approval-engine.ts')
  const matrixLookup = source.indexOf('const matrixCandidates = await db')
  const apdFallback = source.indexOf('if (context.transactionType === "apd-request")', matrixLookup)
  assert.ok(matrixLookup > 0)
  assert.ok(apdFallback > matrixLookup)
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
