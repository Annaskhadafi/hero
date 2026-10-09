import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('Marital status request schema initialization & inbox metrics integration in approval-workspace', async () => {
  const workspace = await read('lib/approval-workspace.ts')
  assert.match(workspace, /ensureMaritalStatusRequestSchema/)
  assert.match(workspace, /maritalStatusCount/)
  assert.match(workspace, /maritalStatusRequestId/)
  assert.match(workspace, /Perubahan Status Pernikahan/)
  assert.match(workspace, /dueState: ApprovalQueueItem\['dueState'\] = 'closed'/)
})

test('Approval Inbox Page fallback safeData includes maritalStatusCount', async () => {
  const page = await read('app/dashboard/approval/page.tsx')
  assert.match(page, /maritalStatusCount: 0/)
})

test('ApprovalWorkbench maps MARITAL_STATUS category and dialog correctly', async () => {
  const workbench = await read('components/approval-workbench.tsx')
  assert.match(workbench, /category === 'MARITAL_STATUS'/)
  assert.match(workbench, /MaritalStatusApprovalDialog/)
  assert.match(workbench, /Perubahan Status Pernikahan/)
  assert.match(workbench, /MARITAL_STATUS/)
  assert.match(workbench, /dueState: g\.overdueCount > 0 \? 'overdue'/)
})

test('Marital status action advances next level step to pending upon approval and supports revert', async () => {
  const actions = await read('app/dashboard/central-service/marital-status/actions.ts')
  assert.match(actions, /nextWaitingStep\.status === 'waiting'/)
  assert.match(actions, /status: 'pending'/)
  assert.match(actions, /revertMaritalStatusStepAction/)
  assert.match(actions, /revalidateMaritalStatusPaths/)
})

test('MaritalStatusApprovalDialog displays Step Persetujuan label and HERO design system action buttons (APPROVE, REVERT, REJECT, TUTUP REVIEWER)', async () => {
  const dialog = await read('components/admin/marital-status-approval-dialog.tsx')
  assert.match(dialog, /Step Persetujuan:/)
  assert.match(dialog, /APPROVE/)
  assert.match(dialog, /REVERT/)
  assert.match(dialog, /REJECT/)
  assert.match(dialog, /TUTUP REVIEWER/)
})

test('AdminStatusBadge supports no_sla (Non SLA)', async () => {
  const badge = await read('components/admin-status-badge.tsx')
  assert.match(badge, /no_sla: "bg-slate-100 text-slate-800"/)
  assert.match(badge, /no_sla: "Non SLA"/)
})

test('Approval Engine defines Step 1 (PJO / HSE / Leader), Step 2 (Section Head), and Step 3 (Human Resources) for Marital Status', async () => {
  const engine = await read('lib/approval-engine.ts')
  assert.match(engine, /Step 1: PJO \/ HSE \/ Leader/)
  assert.match(engine, /Step 2: Section Head/)
  assert.match(engine, /Step 3: Human Resources/)
})
