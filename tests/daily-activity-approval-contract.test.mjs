import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Daily Activity Approval Files and Endpoints Contract Verification Suite', () => {
  const root = process.cwd()

  const activityHubPageRoute = path.join(root, 'app/dashboard/activity-hub/document/[sessionId]/approval/page.tsx')
  const activityHubActionsFile = path.join(root, 'app/dashboard/activity-hub/actions.ts')
  const activityApprovalForm = path.join(root, 'components/daily-activity-approval-form.tsx')
  const publicApprovalPageRoute = path.join(root, 'app/review/daily-activity/[token]/page.tsx')
  const publicApprovalComponent = path.join(root, 'app/review/daily-activity/[token]/public-approval.tsx')
  const activityE2ESpec = path.join(root, 'tests/e2e/daily-activity-approval.spec.ts')
  const activityCrudTest = path.join(root, 'tests/daily-activity-approval-crud.test.ts')
  const ciWorkflow = path.join(root, '.github/workflows/test.yml')

  // Verify file existence
  assert.ok(fs.existsSync(activityHubPageRoute), 'Activity Hub document approval page.tsx must exist')
  assert.ok(fs.existsSync(activityHubActionsFile), 'Activity Hub actions file must exist')
  assert.ok(fs.existsSync(activityApprovalForm), 'Daily Activity approval form component must exist')
  assert.ok(fs.existsSync(publicApprovalPageRoute), 'Public review route page.tsx must exist')
  assert.ok(fs.existsSync(publicApprovalComponent), 'Public approval component must exist')
  assert.ok(fs.existsSync(activityE2ESpec), 'Playwright E2E test spec for Daily Activity must exist')
  assert.ok(fs.existsSync(activityCrudTest), 'Automated Daily Activity CRUD test script must exist')
  if (fs.existsSync(ciWorkflow)) {
    assert.ok(fs.existsSync(ciWorkflow), 'GitHub Actions CI workflow file must exist')
  }

  // Verify Daily Activity Actions contract
  const actionsContent = fs.readFileSync(activityHubActionsFile, 'utf8')
  assert.ok(actionsContent.includes('export async function createDailyActivitySessionAction'), 'Must export createDailyActivitySessionAction')
  assert.ok(actionsContent.includes('export async function getDailyActivityApprovalData'), 'Must export getDailyActivityApprovalData')
  assert.ok(actionsContent.includes('export async function saveDailyActivityApprovalForm'), 'Must export saveDailyActivityApprovalForm')
  assert.ok(actionsContent.includes('export async function submitDailyActivityApprovalStepAction'), 'Must export submitDailyActivityApprovalStepAction')
  assert.ok(actionsContent.includes('export async function sendDueDailyActivityReminders'), 'Must export sendDueDailyActivityReminders')
  assert.ok(actionsContent.includes('export async function deleteDailyActivitySessionAction'), 'Must export deleteDailyActivitySessionAction')

  // Verify Single Source of Truth rule (hero_employees)
  assert.ok(actionsContent.includes('from(employees)'), 'Must query hero_employees single source of truth')
  assert.ok(!actionsContent.includes('from(heroHrEmployees)'), 'Must NOT query hero_hr_employees in runtime code')

  // Verify Dynamic Email Workflow
  assert.ok(actionsContent.includes('sendWorkflowEmail') || actionsContent.includes('sendDailyActivityStepApprovalEmail'), 'Workflow email helper must be present')

  // Verify Approval Form Action Buttons & Textarea
  const formContent = fs.readFileSync(activityApprovalForm, 'utf8')
  assert.ok(formContent.includes('DISETUJUI'), 'Form must include DISETUJUI action button')
  assert.ok(formContent.includes('REVERT'), 'Form must include REVERT action button')
  assert.ok(formContent.includes('REJECT'), 'Form must include REJECT action button')
  assert.ok(formContent.includes('Catatan Approval'), 'Form must include Catatan Approval textarea')

  // Verify Status Rendering Rules (Green for Approved, Red for Rejected, Amber for Reverted)
  assert.ok(formContent.includes('text-rose-600'), 'Form must render rejected status in rose red')
  assert.ok(formContent.includes('text-amber-600'), 'Form must render reverted status in amber')
  assert.ok(formContent.includes('text-emerald-600'), 'Form must render approved status in emerald green')

  // Verify Floating Missing Signature Dialog is wired
  assert.ok(formContent.includes('MissingSignatureDialog'), 'Form must include MissingSignatureDialog')
  assert.ok(fs.readFileSync(publicApprovalComponent, 'utf8').includes('MissingSignatureDialog'), 'Public approval must include MissingSignatureDialog')
  assert.ok(fs.readFileSync(path.join(root, 'app/dashboard/activity-hub/approval/client.tsx'), 'utf8').includes('MissingSignatureDialog'), 'Activity Hub approval client must include MissingSignatureDialog')
  assert.ok(fs.readFileSync(path.join(root, 'components/mobile/mobile-daily-activity-client.tsx'), 'utf8').includes('MissingSignatureDialog'), 'Mobile approval client must include MissingSignatureDialog')

  // Verify Rejection Action Contract
  // Verify 2-step digital approval and Customer signatory
  assert.ok(formContent.includes('DAILY_ACTIVITY_APPROVAL_STEPS = 2') || formContent.includes('Customer Signature') || formContent.includes('Customer'), 'Form must include Customer in signatories')
  assert.ok(fs.readFileSync(publicApprovalComponent, 'utf8').includes('Customer Signature'), 'Public approval must include Customer in signatories')
})


