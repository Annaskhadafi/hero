import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Daily Activity Approval files and routes exist with 100% Contract Review parity', () => {
  const root = process.cwd()

  const publicPageRoute = path.join(root, 'app/review/daily-activity/[token]/page.tsx')
  const publicApprovalComponent = path.join(root, 'app/review/daily-activity/[token]/public-approval.tsx')
  const formApprovalComponent = path.join(root, 'components/daily-activity-approval-form.tsx')
  const dashboardPageRoute = path.join(root, 'app/dashboard/activity-hub/document/[sessionId]/approval/page.tsx')
  const actionsFile = path.join(root, 'app/dashboard/activity-hub/actions.ts')

  assert.ok(fs.existsSync(publicPageRoute), 'Public route page must exist')
  assert.ok(fs.existsSync(publicApprovalComponent), 'Public approval component must exist')
  assert.ok(fs.existsSync(formApprovalComponent), 'Form approval component must exist')
  assert.ok(fs.existsSync(dashboardPageRoute), 'Dashboard approval page must exist')
  assert.ok(fs.existsSync(actionsFile), 'Activity Hub actions file must exist')

  const publicApprovalContent = fs.readFileSync(publicApprovalComponent, 'utf8')
  assert.ok(publicApprovalContent.includes('ChitraParatama_Stationery_Letterhead_jkt.jpg'), 'Must use official letterhead stationery')
  assert.ok(publicApprovalContent.includes('SignatureCanvas'), 'Must include digital signature canvas')
  assert.ok(publicApprovalContent.includes('Preview Surat'), 'Must include Preview Surat view')
  assert.ok(publicApprovalContent.includes('Download PDF'), 'Must include Download PDF functionality')

  const formApprovalContent = fs.readFileSync(formApprovalComponent, 'utf8')
  assert.ok(formApprovalContent.includes('ChitraParatama_Stationery_Letterhead_jkt.jpg'), 'Form preview must use official letterhead stationery')
  assert.ok(formApprovalContent.includes('Unduh PDF') || formApprovalContent.includes('Print / Save PDF'), 'Must include Unduh/Print action button')
  assert.ok(formApprovalContent.includes('Simpan'), 'Must include Save action button')
  assert.ok(formApprovalContent.includes('Kembali'), 'Must include Kembali action button')
  assert.ok(formApprovalContent.includes('A. Daily Activity Items'), 'Must include inline editable daily activity items')
  assert.ok(formApprovalContent.includes('Status Approval'), 'Must include Status Approval step list')
  assert.ok(formApprovalContent.includes('Signatories'), 'Must include Signatories section')
  assert.ok(formApprovalContent.includes('Leader Title'), 'Must include Leader Title field')
  assert.ok(formApprovalContent.includes('Superior Title'), 'Must include Superior Title field')
  assert.ok(formApprovalContent.includes('canUserSignActiveStep'), 'Must check if current user is authorized signatory')

  const actionsContent = fs.readFileSync(actionsFile, 'utf8')
  assert.ok(actionsContent.includes('export async function getDailyActivityApprovalByToken'), 'Must export getDailyActivityApprovalByToken')
  assert.ok(actionsContent.includes('export async function approveDailyActivityStepByToken'), 'Must export approveDailyActivityStepByToken')
  assert.ok(actionsContent.includes('export async function rejectDailyActivityStepByToken'), 'Must export rejectDailyActivityStepByToken')
  assert.ok(actionsContent.includes('export async function saveDailyActivityApprovalForm'), 'Must export saveDailyActivityApprovalForm')
  assert.ok(actionsContent.includes('export async function generateTestDailyActivityApproval'), 'Must export generateTestDailyActivityApproval')
  assert.ok(actionsContent.includes('export async function sendDueDailyActivityReminders'), 'Must export sendDueDailyActivityReminders')
  assert.ok(actionsContent.includes('leaderEmployeeId'), 'Must support leaderEmployeeId persistence')
  assert.ok(actionsContent.includes('superiorEmployeeId'), 'Must support superiorEmployeeId persistence')
  assert.ok(actionsContent.includes('managerEmployeeId'), 'Must support managerEmployeeId persistence')
  assert.ok(actionsContent.includes('export async function deleteDailyActivitySessionAction'), 'Must export deleteDailyActivitySessionAction')

  const listingClientFile = path.join(root, 'app/dashboard/activity-hub/approval/client.tsx')
  assert.ok(fs.existsSync(listingClientFile), 'Approval listing client file must exist')
  const listingContent = fs.readFileSync(listingClientFile, 'utf8')
  assert.ok(listingContent.includes('MinimalTableShell'), 'Listing page must use MinimalTableShell')
  assert.ok(listingContent.includes('HcWorkspaceBanner'), 'Listing page must use HcWorkspaceBanner')
  assert.ok(listingContent.includes('EnterpriseActionButtons'), 'Listing page must use EnterpriseActionButtons')
  assert.ok(listingContent.includes('Test Approval'), 'Listing page must include Test Approval button')
  assert.ok(listingContent.includes('Send Reminders'), 'Listing page must include Send Reminders button')
  assert.ok(listingContent.includes('Settings'), 'Listing page must include Settings button')
  assert.ok(listingContent.includes('Import'), 'Listing page must include Import button')
})

test('Overtime Requests and HSE PTW Approvals have 100% Contract Review parity', () => {
  const root = process.cwd()

  // 1. Check Overtime files
  const otActionsPath = path.join(root, 'app', 'dashboard', 'overtime-requests', 'actions.ts')
  const otApprovalPagePath = path.join(root, 'app', 'dashboard', 'overtime-requests', '[documentId]', 'approval', 'page.tsx')
  const otFormPath = path.join(root, 'components', 'overtime-request-approval-form.tsx')
  const otReviewPagePath = path.join(root, 'app', 'review', 'overtime', '[token]', 'page.tsx')
  const otReviewCompPath = path.join(root, 'app', 'review', 'overtime', '[token]', 'public-approval.tsx')
  const otListingClientPath = path.join(root, 'app', 'dashboard', 'overtime-requests', 'client.tsx')
  const otListingPagePath = path.join(root, 'app', 'dashboard', 'overtime-requests', 'page.tsx')

  assert.ok(fs.existsSync(otActionsPath), 'Overtime actions.ts must exist')
  assert.ok(fs.existsSync(otApprovalPagePath), 'Overtime approval page.tsx must exist')
  assert.ok(fs.existsSync(otFormPath), 'Overtime approval form component must exist')
  assert.ok(fs.existsSync(otReviewPagePath), 'Overtime public review page must exist')
  assert.ok(fs.existsSync(otReviewCompPath), 'Overtime public review component must exist')
  assert.ok(fs.existsSync(otListingClientPath), 'Overtime listing client must exist')
  assert.ok(fs.existsSync(otListingPagePath), 'Overtime listing page must exist')

  const otClientSource = fs.readFileSync(otListingClientPath, 'utf8')
  assert.match(otClientSource, /MinimalTableShell/)
  assert.match(otClientSource, /HcWorkspaceBanner/)
  assert.match(otClientSource, /EnterpriseActionButtons/)
  assert.match(otClientSource, /TEST APPROVAL/)
  assert.match(otClientSource, /SEND REMINDERS/)
  assert.match(otClientSource, /SETTINGS/)
  assert.match(otClientSource, /TAMBAH SPL/)

  const otActionsSource = fs.readFileSync(otActionsPath, 'utf8')
  assert.match(otActionsSource, /export async function deleteOvertimeCommandLetterAction/)
  assert.match(otActionsSource, /export async function generateTestOvertimeApproval/)
  assert.match(otActionsSource, /export async function sendDueOvertimeReminders/)
  assert.match(otActionsSource, /export async function getOvertimeApprovalByToken/)
  assert.match(otActionsSource, /export async function approveOvertimeStepByToken/)
  assert.match(otActionsSource, /export async function rejectOvertimeStepByToken/)

  const otFormSource = fs.readFileSync(otFormPath, 'utf8')
  assert.match(otFormSource, /grid-cols-2|xl:grid-cols-2/)
  assert.match(otFormSource, /DISETUJUI/)
  assert.match(otFormSource, /TAMBAHKAN KE PDF/)
  assert.match(otFormSource, /Signatories/)

  // 2. Check PTW files
  const ptwActionsPath = path.join(root, 'app', 'dashboard', 'hse', 'izin-kerja-ptw', 'actions.ts')
  const ptwApprovalPagePath = path.join(root, 'app', 'dashboard', 'hse', 'izin-kerja-ptw', '[permitId]', 'approval', 'page.tsx')
  const ptwFormPath = path.join(root, 'components', 'ptw-approval-form.tsx')
  const ptwReviewPagePath = path.join(root, 'app', 'review', 'ptw', '[token]', 'page.tsx')
  const ptwReviewCompPath = path.join(root, 'app', 'review', 'ptw', '[token]', 'public-approval.tsx')
  const ptwListingClientPath = path.join(root, 'app', 'dashboard', 'hse', 'izin-kerja-ptw', 'client.tsx')
  const ptwListingPagePath = path.join(root, 'app', 'dashboard', 'hse', 'izin-kerja-ptw', 'page.tsx')

  assert.ok(fs.existsSync(ptwActionsPath), 'PTW actions.ts must exist')
  assert.ok(fs.existsSync(ptwApprovalPagePath), 'PTW approval page.tsx must exist')
  assert.ok(fs.existsSync(ptwFormPath), 'PTW approval form component must exist')
  assert.ok(fs.existsSync(ptwReviewPagePath), 'PTW public review page must exist')
  assert.ok(fs.existsSync(ptwReviewCompPath), 'PTW public review component must exist')
  assert.ok(fs.existsSync(ptwListingClientPath), 'PTW listing client must exist')
  assert.ok(fs.existsSync(ptwListingPagePath), 'PTW listing page must exist')

  const ptwClientSource = fs.readFileSync(ptwListingClientPath, 'utf8')
  assert.match(ptwClientSource, /MinimalTableShell/)
  assert.match(ptwClientSource, /HcWorkspaceBanner/)
  assert.match(ptwClientSource, /TEST APPROVAL/)
  assert.match(ptwClientSource, /SEND REMINDERS/)
  assert.match(ptwClientSource, /SETTINGS/)
  assert.match(ptwClientSource, /showImport=\{false\}/)
  assert.match(ptwClientSource, /showExport=\{false\}/)
  assert.match(ptwClientSource, /TAMBAH PTW/)

  const ptwActionsSource = fs.readFileSync(ptwActionsPath, 'utf8')
  assert.match(ptwActionsSource, /export async function deletePtwPermitAction/)
  assert.match(ptwActionsSource, /export async function generateTestPtwApproval/)
  assert.match(ptwActionsSource, /export async function sendDuePtwReminders/)
  assert.match(ptwActionsSource, /export async function getPtwApprovalByToken/)
  assert.match(ptwActionsSource, /export async function approvePtwStepByToken/)
  assert.match(ptwActionsSource, /export async function rejectPtwStepByToken/)
  assert.match(ptwActionsSource, /export async function batchApprovePtwPermitsAction/)
  assert.match(ptwActionsSource, /export async function singleApprovePtwPermitAction/)

  const ptwFormSource = fs.readFileSync(ptwFormPath, 'utf8')
  assert.match(ptwFormSource, /grid-cols-2|xl:grid-cols-2/)
  assert.match(ptwFormSource, /DISETUJUI/)
  assert.match(ptwFormSource, /getUserSignatureAction/)
  assert.match(ptwFormSource, /SignatureFloatingWidget/)
  assert.match(ptwFormSource, /Signatories/)
})

test('Send Reminders in Daily Activity, Overtime SPL, and HSE PTW sends workflow emails and bell notifications', () => {
  const root = process.cwd()

  const dailyActions = fs.readFileSync(path.join(root, 'app/dashboard/activity-hub/actions.ts'), 'utf8')
  const otActions = fs.readFileSync(path.join(root, 'app/dashboard/overtime-requests/actions.ts'), 'utf8')
  const ptwActions = fs.readFileSync(path.join(root, 'app/dashboard/hse/izin-kerja-ptw/actions.ts'), 'utf8')

  // 1. Daily Activity reminder & approval bell notification verification
  assert.ok(dailyActions.includes('sendDueDailyActivityReminders'), 'Must have sendDueDailyActivityReminders')
  assert.ok(dailyActions.includes('daily_activity_approval_reminder'), 'Must use daily_activity_approval_reminder template')
  assert.ok(dailyActions.includes('sendWorkflowEmail'), 'Must call sendWorkflowEmail in daily activity')
  assert.ok(dailyActions.includes('notifyWorkflowBellRecipients'), 'Must call notifyWorkflowBellRecipients in daily activity')
  assert.ok(dailyActions.includes('daily_activity_pending_approval'), 'Must notify bell on daily activity pending approval submission')
  assert.ok(dailyActions.includes('daily_activity_approval_needed'), 'Must notify bell on daily activity step approval needed')

  // 2. Overtime SPL reminder verification
  assert.ok(otActions.includes('sendDueOvertimeReminders'), 'Must have sendDueOvertimeReminders')
  assert.ok(otActions.includes('overtime_approval_reminder'), 'Must use overtime_approval_reminder template')
  assert.ok(otActions.includes('sendWorkflowEmail'), 'Must call sendWorkflowEmail in overtime')
  assert.ok(otActions.includes('notifyWorkflowBellRecipients'), 'Must call notifyWorkflowBellRecipients in overtime')

  // 3. HSE PTW reminder verification
  assert.ok(ptwActions.includes('sendDuePtwReminders'), 'Must have sendDuePtwReminders')
  assert.ok(ptwActions.includes('hse_ptw_approval_reminder'), 'Must use hse_ptw_approval_reminder template')
  assert.ok(ptwActions.includes('sendWorkflowEmail'), 'Must call sendWorkflowEmail in PTW')
  assert.ok(ptwActions.includes('notifyWorkflowBellRecipients'), 'Must call notifyWorkflowBellRecipients in PTW')
})

test('Batch action bar in Daily Activity, Overtime SPL, and HSE PTW uses UNDUH, EXCEL, and ZIP packaging', () => {
  const root = process.cwd()

  const dailyClient = fs.readFileSync(path.join(root, 'app/dashboard/activity-hub/approval/client.tsx'), 'utf8')
  const otClient = fs.readFileSync(path.join(root, 'app/dashboard/overtime-requests/client.tsx'), 'utf8')
  const ptwClient = fs.readFileSync(path.join(root, 'app/dashboard/hse/izin-kerja-ptw/client.tsx'), 'utf8')

  // Daily Activity
  assert.ok(dailyClient.includes('UNDUH'), 'Daily Activity must have UNDUH button')
  assert.ok(dailyClient.includes('EXCEL'), 'Daily Activity must have EXCEL button')
  assert.ok(dailyClient.includes('downloadFilesAsZip'), 'Daily Activity must use downloadFilesAsZip')

  // Overtime SPL
  assert.ok(otClient.includes('UNDUH'), 'Overtime SPL must have UNDUH button')
  assert.ok(otClient.includes('EXCEL'), 'Overtime SPL must have EXCEL button')
  assert.ok(otClient.includes('downloadFilesAsZip'), 'Overtime SPL must use downloadFilesAsZip')

  // HSE PTW
  assert.ok(ptwClient.includes('UNDUH'), 'HSE PTW must have UNDUH button')
  assert.ok(ptwClient.includes('EXCEL'), 'HSE PTW must have EXCEL button')
  assert.ok(ptwClient.includes('downloadFilesAsZip'), 'HSE PTW must use downloadFilesAsZip')
})


