import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('SOP / WIN / POL Document Approval & MATRIX Files and Endpoints Contract Verification Suite', () => {
  const root = process.cwd()

  const sopWinPageRoute = path.join(root, 'app/dashboard/sop-win/page.tsx')
  const sopWinActionsFile = path.join(root, 'app/dashboard/sop-win/actions.ts')
  const sopWinApprovalWorkspace = path.join(root, 'components/sop-win/sop-win-approval-workspace.tsx')
  const sopWinMatrixPanel = path.join(root, 'components/sop-win/sop-win-approval-matrix-panel.tsx')
  const sopWinE2ESpec = path.join(root, 'tests/e2e/sop-win-approval.spec.ts')
  const sopWinCrudTest = path.join(root, 'tests/sop-win-approval-crud.test.ts')
  const ciWorkflow = path.join(root, '.github/workflows/test.yml')

  // Verify file existence
  assert.ok(fs.existsSync(sopWinPageRoute), 'SOP/WIN dashboard page.tsx must exist')
  assert.ok(fs.existsSync(sopWinActionsFile), 'SOP/WIN actions file must exist')
  assert.ok(fs.existsSync(sopWinApprovalWorkspace), 'SOP/WIN approval workspace component must exist')
  assert.ok(fs.existsSync(sopWinMatrixPanel), 'SOP/WIN approval matrix panel component must exist')
  assert.ok(fs.existsSync(sopWinE2ESpec), 'Playwright E2E test spec for SOP/WIN must exist')
  assert.ok(fs.existsSync(sopWinCrudTest), 'Automated SOP/WIN CRUD test script must exist')
  assert.ok(fs.existsSync(ciWorkflow), 'GitHub Actions CI workflow file must exist')

  // Verify SOP/WIN Actions contract
  const actionsContent = fs.readFileSync(sopWinActionsFile, 'utf8')
  assert.ok(actionsContent.includes('export async function submitSopWinDocumentRequestAction'), 'Must export submitSopWinDocumentRequestAction')
  assert.ok(actionsContent.includes('export async function getSopWinDocumentRequestsAction'), 'Must export getSopWinDocumentRequestsAction')
  assert.ok(actionsContent.includes('export async function updateSopWinAccessSettingsAction'), 'Must export updateSopWinAccessSettingsAction')
  assert.ok(actionsContent.includes('export async function getSopWinDepartmentWorkflowsAction'), 'Must export getSopWinDepartmentWorkflowsAction')
  assert.ok(actionsContent.includes('export async function upsertSopWinDepartmentWorkflowAction'), 'Must export upsertSopWinDepartmentWorkflowAction')

  // Verify Single Source of Truth rule (hero_employees)
  assert.ok(actionsContent.includes('from(employees)'), 'Must query hero_employees single source of truth')
  assert.ok(!actionsContent.includes('from(heroHrEmployees)'), 'Must NOT query hero_hr_employees in runtime code')

  // Verify Gear Icon Settings Modal in Approval Workspace
  const workspaceContent = fs.readFileSync(sopWinApprovalWorkspace, 'utf8')
  assert.ok(workspaceContent.includes('SopWinAccessSettingsModal'), 'Approval workspace must include SopWinAccessSettingsModal for gear settings')
  assert.ok(workspaceContent.includes('Settings'), 'Approval workspace must render gear settings icon')

  // Verify Status Rendering Rules
  assert.ok(workspaceContent.includes('APPROVED') || workspaceContent.includes('Disetujui'), 'Must display Approved status')
  assert.ok(workspaceContent.includes('REJECTED') || workspaceContent.includes('Ditolak'), 'Must display Rejected status')
  assert.ok(workspaceContent.includes('REVERTED') || workspaceContent.includes('Dikembalikan'), 'Must display Reverted status')
})
