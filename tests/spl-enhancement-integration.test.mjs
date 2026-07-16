import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('mobile SPL exposes submit, approval, active, and history tabs', async () => {
  const source = await read('app/mobile/overtime/page.tsx')
  for (const label of ['Ajukan', 'Perlu Approval', 'SPL Aktif', 'Riwayat']) {
    assert.match(source, new RegExp(label))
  }
  assert.match(source, /MobileSplHistory/)
  assert.match(source, /MobileApprovalCenter/)
  assert.doesNotMatch(source, /Perintahkan lembur kepada bawahan/)
})

test('mobile dashboard exposes Pengajuan SPL shortcut', async () => {
  const source = await read('components/mobile/mobile-dashboard-services.tsx')
  assert.match(source, /title: "Pengajuan SPL"/)
  assert.match(source, /href: "\/mobile\/overtime\?tab=apply"/)
  assert.match(source, /resource: "overtime_requests"/)
})

test('mobile employee request uses a simple three-step flow without subordinate picker', async () => {
  const source = await read('components/mobile/mobile-overtime-request-form.tsx')
  for (const label of ['1 · Waktu', '2 · Aktivitas', '3 · Kirim']) assert.match(source, new RegExp(label))
  assert.match(source, /origin" value="employee_request"/)
  assert.doesNotMatch(source, /Pilih Bawahan|Bawahan terpilih/)
  assert.doesNotMatch(source, /<button key=\{activity\.id\}[\s\S]*?<Checkbox/)
})

test('approved SPL exposes the existing activity photo evidence flow', async () => {
  const history = await read('components/mobile/mobile-spl-history.tsx')
  const activity = await read('components/mobile/mobile-daily-activity-form.tsx')
  assert.match(history, /Update di Daily Activity/)
  assert.match(history, /\["submitted", "approved"\]/)
  assert.match(history, /\/mobile\/activity\/input/)
  assert.match(activity, /type="file"/)
  assert.match(activity, /accept="image\/\*"/)
})

test('SPL writes participant snapshots and gates close on evidence', async () => {
  const action = await read('app/dashboard/activity-hub/actions.ts')
  assert.match(action, /buildSplParticipantSnapshots/)
  assert.match(action, /assertNoSplOverlap/)
  assert.match(action, /clock-in dan clock-out Attendance Real/)
  assert.match(action, /minimal satu foto/)
  assert.match(action, /evidenceStatus: 'complete'/)
})

test('SPL email presets and H+1 H+2 reminder are wired centrally', async () => {
  const presets = await read('lib/email-template-presets.ts')
  const automation = await read('lib/approval-blueprint.ts')
  const reminder = await read('lib/spl-reminders.ts')
  for (const code of ['spl_submitted', 'spl_assigned', 'spl_decision', 'spl_extension_submitted', 'spl_evidence_reminder']) {
    assert.match(presets, new RegExp(code))
  }
  assert.match(automation, /runSplEvidenceReminderTick/)
  assert.match(reminder, /age !== 1 && age !== 2/)
  assert.match(reminder, /sendWorkflowEmail/)
})

test('monthly summary provides shared table plus Excel and PDF actions', async () => {
  const summary = await read('components/spl-monthly-summary.tsx')
  assert.match(summary, /MinimalTableShell/)
  assert.match(summary, /exportRowsToFile/)
  assert.match(summary, /window\.print/)
  assert.match(summary, /payrollPeriod/)
})
