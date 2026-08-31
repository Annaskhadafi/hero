import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('SPL Overtime Approval Files and Endpoints Contract Verification Suite', () => {
  const root = process.cwd()

  const splListingPageRoute = path.join(root, 'app/dashboard/overtime-requests/page.tsx')
  const splListingClient = path.join(root, 'app/dashboard/overtime-requests/client.tsx')
  const splActionsFile = path.join(root, 'app/dashboard/overtime-requests/actions.ts')
  const splApprovalForm = path.join(root, 'components/overtime-request-approval-form.tsx')
  const splE2ESpec = path.join(root, 'tests/e2e/spl-approval.spec.ts')
  const splCrudTest = path.join(root, 'tests/spl-approval-crud.test.ts')
  const ciWorkflow = path.join(root, '.github/workflows/test.yml')

  // Verify file existence
  assert.ok(fs.existsSync(splListingPageRoute), 'SPL listing page.tsx must exist')
  assert.ok(fs.existsSync(splListingClient), 'SPL listing client.tsx must exist')
  assert.ok(fs.existsSync(splActionsFile), 'SPL actions file must exist')
  assert.ok(fs.existsSync(splApprovalForm), 'Overtime approval form component must exist')
  assert.ok(fs.existsSync(splE2ESpec), 'Playwright E2E test spec for SPL must exist')
  assert.ok(fs.existsSync(splCrudTest), 'Automated SPL CRUD test script must exist')
  assert.ok(fs.existsSync(ciWorkflow), 'GitHub Actions CI workflow file must exist')

  // Verify SPL Actions contract
  const actionsContent = fs.readFileSync(splActionsFile, 'utf8')
  assert.ok(actionsContent.includes('export async function createOvertimeCommandLetterAction'), 'Must export createOvertimeCommandLetterAction')
  assert.ok(actionsContent.includes('export async function getOvertimeApprovalData'), 'Must export getOvertimeApprovalData')
  assert.ok(actionsContent.includes('export async function saveOvertimeApprovalForm'), 'Must export saveOvertimeApprovalForm')
  assert.ok(actionsContent.includes('export async function submitOvertimeApprovalStepAction'), 'Must export submitOvertimeApprovalStepAction')
  assert.ok(actionsContent.includes('export async function sendDueOvertimeReminders'), 'Must export sendDueOvertimeReminders')
  assert.ok(actionsContent.includes('export async function deleteOvertimeCommandLetterAction'), 'Must export deleteOvertimeCommandLetterAction')

  // Verify Single Source of Truth rule (hero_employees)
  assert.ok(actionsContent.includes('from(employees)'), 'Must query hero_employees single source of truth')
  assert.ok(!actionsContent.includes('from(heroHrEmployees)'), 'Must NOT query hero_hr_employees in runtime code')

  // Verify Dynamic Email Workflow
  assert.ok(actionsContent.includes('sendWorkflowEmail') || actionsContent.includes('sendOvertimeStepApprovalEmail'), 'Workflow email helper must be present')

  // Verify Approval Form Action Buttons & Textarea
  const formContent = fs.readFileSync(splApprovalForm, 'utf8')
  assert.ok(formContent.includes('DISETUJUI'), 'Form must include DISETUJUI action button')
  assert.ok(formContent.includes('REVERT'), 'Form must include REVERT action button')
  assert.ok(formContent.includes('REJECT'), 'Form must include REJECT action button')
  assert.ok(formContent.includes('Catatan Approval'), 'Form must include Catatan Approval textarea')

  // Verify Status Rendering Rules (Green for Approved, Red for Rejected, Amber for Reverted)
  assert.ok(formContent.includes('text-rose-600'), 'Form must render rejected status in rose red')
  assert.ok(formContent.includes('text-amber-600'), 'Form must render reverted status in amber')
  assert.ok(formContent.includes('text-emerald-600'), 'Form must render approved status in emerald green')
})
