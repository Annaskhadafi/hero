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

test('workflow studio builder supports manual customization for APD, Material, and Tools', () => {
  const studioSource = read('components/workflow-studio-overview.tsx')
  const engineSource = read('lib/approval-engine.ts')

  assert.ok(
    studioSource.includes('isMaterialOrToolsMenu'),
    'Workflow Studio must identify Material and Tools menus'
  )
  assert.ok(
    !studioSource.includes("readOnly={isMaterialOrToolsMenu() && step.label === 'Head Section'}"),
    'Workflow Studio must allow manual editing of step labels for Material and Tools'
  )
  assert.ok(
    !engineSource.includes("context.transactionType === 'apd-request-material' ||\n    context.transactionType === 'apd-request-tools'\n  ) {\n    return resolveApdApprovalRoute(context)"),
    'Approval engine must not short-circuit Material and Tools before database matrix lookup'
  )
})

