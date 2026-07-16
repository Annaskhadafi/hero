import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(path, 'utf8')

test('approval decisions enforce assigned approver or scoped admin access', () => {
  const source = read('app/dashboard/admin-actions.ts')

  assert.match(source, /approval\.approverEmployeeId === actor\.employeeId/)
  assert.match(source, /getCurrentMenuPermission\('approval_inbox'\)/)
  assert.match(source, /Anda bukan approver yang ditugaskan/)
})

test('employee and HR signoff boundaries are separated', () => {
  const action = read('app/dashboard/activity-hub/actions.ts')
  const panel = read('components/daily-activity-session-document-panel.tsx')

  assert.match(action, /signoffSection: z\.enum\(\['employee', 'hr'\]\)/)
  assert.match(action, /payload\.signoffSection === 'hr' && !canReviewHr/)
  assert.match(panel, /name="signoffSection"/)
  assert.match(panel, /disabled=\{!data\.permissions\.canReviewHr/)
})

test('submitted SPL can be worked urgently while editing remains restricted', () => {
  const action = read('app/dashboard/activity-hub/actions.ts')
  const data = read('lib/daily-activity.ts')
  const composer = read('components/overtime-command-letter-composer.tsx')

  assert.match(action, /status: z\.enum\(\['draft', 'returned'\]\)/)
  assert.match(action, /SPL hanya dapat diedit saat draft atau returned/)
  assert.match(data, /inArray\(overtimeCommandLetters\.status, \['submitted', 'approved'\]\)/)
  assert.match(action, /\['submitted', 'approved'\]\.includes\(spl\.status\.toLowerCase\(\)\)/)
  assert.doesNotMatch(composer, /option value="approved"/)
})

test('SPL submission uses centralized approval and validates assigned lines', () => {
  const action = read('app/dashboard/activity-hub/actions.ts')
  const engine = read('lib/legacy-approval-engine.ts')

  assert.match(action, /templateKey: 'overtime-command-letter'/)
  assert.match(action, /Checklist SPL tidak sesuai dengan penugasan karyawan login/)
  assert.match(engine, /['"]overtime-command-letter['"]: \{/)
  assert.match(engine, /Approval route belum tersedia untuk pengajuan ini/)
})

test('Daily Activity session is linked and written in the activity transaction', () => {
  const action = read('app/dashboard/activity-hub/actions.ts')
  const schema = read('db/schema/hero.ts')

  assert.match(
    action,
    /syncDailyRouteSessionForActivity\(\{\s*tx,\s*activityId: createdActivity\.id,/s
  )
  assert.match(action, /await params\.tx\s*\.delete\(dailyActivitySessionItems\)/)
  assert.match(schema, /activityId: integer\('activity_id'\).*activities\.id/s)
})

test('activity approval does not write hardcoded overtime payroll amounts', () => {
  const source = read('app/dashboard/admin-actions.ts')

  assert.doesNotMatch(source, /const overtimeRate = 70000/)
  assert.match(source, /update\(dailyActivitySessions\)[\s\S]*status: 'approved'/)
})
