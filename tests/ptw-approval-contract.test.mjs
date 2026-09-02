import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('PTW Approval Files and Endpoints Contract Verification Suite', () => {
  const root = process.cwd()

  const ptwListingPageRoute = path.join(root, 'app/dashboard/hse/izin-kerja-ptw/page.tsx')
  const ptwListingClient = path.join(root, 'app/dashboard/hse/izin-kerja-ptw/client.tsx')
  const ptwSingleApprovalRoute = path.join(root, 'app/dashboard/hse/izin-kerja-ptw/[permitId]/approval/page.tsx')
  const ptwApprovalForm = path.join(root, 'components/ptw-approval-form.tsx')
  const ptwActionsFile = path.join(root, 'app/dashboard/hse/izin-kerja-ptw/actions.ts')
  const ptwE2ESpec = path.join(root, 'tests/e2e/ptw-approval.spec.ts')
  const ptwCrudTest = path.join(root, 'tests/ptw-approval-crud.test.ts')
  const ciWorkflow = path.join(root, '.github/workflows/test.yml')

  // Verify file existence
  assert.ok(fs.existsSync(ptwListingPageRoute), 'PTW listing page.tsx must exist')
  assert.ok(fs.existsSync(ptwListingClient), 'PTW listing client.tsx must exist')
  assert.ok(fs.existsSync(ptwSingleApprovalRoute), 'PTW single approval page.tsx must exist')
  assert.ok(fs.existsSync(ptwApprovalForm), 'PTW approval form component must exist')
  assert.ok(fs.existsSync(ptwActionsFile), 'PTW actions file must exist')
  assert.ok(fs.existsSync(ptwE2ESpec), 'Playwright E2E test spec must exist')
  assert.ok(fs.existsSync(ptwCrudTest), 'Automated CRUD test script must exist')
  assert.ok(fs.existsSync(ciWorkflow), 'GitHub Actions CI workflow file must exist')

  // Verify PTW Actions contract
  const actionsContent = fs.readFileSync(ptwActionsFile, 'utf8')
  assert.ok(actionsContent.includes('export async function createPtwPermitAction'), 'Must export createPtwPermitAction')
  assert.ok(actionsContent.includes('export async function getPtwApprovalData'), 'Must export getPtwApprovalData')
  assert.ok(actionsContent.includes('export async function savePtwApprovalForm'), 'Must export savePtwApprovalForm')
  assert.ok(actionsContent.includes('export async function submitPtwApprovalStepAction'), 'Must export submitPtwApprovalStepAction')
  assert.ok(actionsContent.includes('export async function deletePtwPermitAction'), 'Must export deletePtwPermitAction')

  // Verify Single Source of Truth rule (hero_employees)
  assert.ok(actionsContent.includes('from(employees)'), 'Must query hero_employees single source of truth')
  assert.ok(!actionsContent.includes('from(heroHrEmployees)'), 'Must NOT query hero_hr_employees in runtime code')

  // Verify PTW Approval Form UI & Action Buttons
  const formContent = fs.readFileSync(ptwApprovalForm, 'utf8')
  assert.ok(formContent.includes('DISETUJUI'), 'Form must include DISETUJUI action button')
  assert.ok(formContent.includes('REVERT'), 'Form must include REVERT action button')
  assert.ok(formContent.includes('REJECT'), 'Form must include REJECT action button')
  assert.ok(formContent.includes('Catatan Approval'), 'Form must include Catatan Approval textarea')
  assert.ok(formContent.includes('checkedEquipment'), 'Form must support checkedEquipment state persistence')

  // Verify Status Rendering Rules (Green for Approved, Red for Rejected, Amber for Reverted)
  assert.ok(formContent.includes('text-rose-600'), 'Form must render rejected status in rose red')
  assert.ok(formContent.includes('text-amber-600'), 'Form must render reverted status in amber')
  assert.ok(formContent.includes('text-emerald-600'), 'Form must render approved status in emerald green')
})
