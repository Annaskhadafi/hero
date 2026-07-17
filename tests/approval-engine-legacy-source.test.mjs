import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('approval schema now supports submission-based requests', () => {
  const heroSchema = read('db/schema/hero.ts')
  const timesheetSchema = read('db/schema/timesheet.ts')

  assert.match(heroSchema, /submissionId: integer\('submission_id'\)/)
  assert.match(heroSchema, /approvalSubmissionId: integer\('approval_submission_id'\)/)
  assert.match(timesheetSchema, /approvalSubmissionId: integer\("approval_submission_id"\)/)
})

test('legacy approval engine helper exists for non-activity workflows', () => {
  const source = read('lib/legacy-approval-engine.ts')

  assert.match(source, /createLegacyApprovalRequest/)
  assert.match(source, /createNextLegacyApprovalStep/)
  assert.match(source, /requestId: requestNumber/)
  assert.match(source, /requestNumber: formSubmissions\.requestNumber/)
  assert.match(source, /templateKey: ['"]attendance-permission['"]/)
  assert.match(source, /templateKey: ['"]leave-permission['"]/)
  assert.match(source, /templateKey: ['"]offboarding-request['"]/)
})

test('legacy workflows now bind into centralized approval engine', () => {
  const attendanceSource = read('app/actions/attendance.ts')
  const leaveSource = read('app/actions/leave.ts')
  const offboardingSource = read('app/actions/offboarding.ts')
  const adminActionsSource = read('app/dashboard/admin-actions.ts')
  const workspaceSource = read('lib/approval-workspace.ts')

  assert.match(attendanceSource, /createLegacyApprovalRequest/)
  assert.match(attendanceSource, /templateKey: 'attendance-permission'/)
  assert.match(leaveSource, /createLegacyApprovalRequest/)
  assert.match(leaveSource, /templateKey: "leave-permission"/)
  assert.match(offboardingSource, /createLegacyApprovalRequest/)
  assert.match(offboardingSource, /templateKey: "offboarding-request"/)
  assert.match(adminActionsSource, /applyLegacySubmissionDecision/)
  assert.match(adminActionsSource, /createNextLegacyApprovalStep/)
  assert.match(workspaceSource, /submissionId: approvals\.submissionId/)
  assert.match(
    workspaceSource,
    /leftJoin\(formSubmissions, eq\(approvals\.submissionId, formSubmissions\.id\)\)/
  )
})

test('approval decision query joins APD before reading its site', () => {
  const source = read('app/dashboard/admin-actions.ts')

  assert.match(source, /apdSiteId: apdRequests\.siteId/)
  assert.match(source, /leftJoin\(apdRequests, eq\(approvals\.apdRequestId, apdRequests\.id\)\)/)
})
