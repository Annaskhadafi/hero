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

test('mobile employee request uses one simple form with half-hour time steps', async () => {
  const source = await read('components/mobile/mobile-overtime-request-form.tsx')
  for (const label of ['Judul', 'Tanggal', 'Mulai', 'Selesai', 'Deskripsi Pekerjaan'])
    assert.match(source, new RegExp(label))
  assert.match(source, /TIME_OPTIONS/)
  assert.match(source, /Total Lembur/)
  assert.match(source, /totalHours.*toLocaleString\("id-ID"/)
  assert.match(source, /1_440 - startMinutes \+ endMinutes/)
  assert.match(source, /Pilih dari Daily Activity/)
  assert.match(source, /Sudah Diajukan/)
  assert.match(source, /Buat Pengajuan Baru/)
  assert.match(source, /useActionState/)
  assert.match(source, /origin" value="employee_request"/)
  assert.doesNotMatch(source, /Langkah 2|2 · Aktivitas|Pilih Bawahan|Bawahan terpilih/)
})

test('approved SPL exposes the existing activity photo evidence flow', async () => {
  const history = await read('components/mobile/mobile-spl-history.tsx')
  const activity = await read('components/mobile/mobile-daily-activity-form.tsx')
  const syncRoute = await read('app/api/mobile/sync/activity/route.ts')
  const action = await read('app/dashboard/activity-hub/actions.ts')
  const approval = await read('lib/approval-workspace.ts')
  const uploadProxy = await read('app/api/uploads/[...path]/route.ts')
  const uploadTicket = await read('app/api/uploads/activity-presign/route.ts')
  const storage = await read('lib/s3-storage.ts')
  assert.match(history, /Update di Daily Activity/)
  assert.match(history, /\[['"]submitted['"], ['"]approved['"]\]/)
  assert.match(history, /\/mobile\/activity\/input/)
  assert.match(activity, /type="file"/)
  assert.match(activity, /accept="image\/\*"/)
  assert.match(activity, /multiple/)
  assert.match(activity, /photoUrls: checklistEvidence\.urls/)
  assert.match(activity, /\/api\/uploads\/activity-presign/)
  assert.match(activity, /body: file/)
  assert.doesNotMatch(activity, /readAsDataURL/)
  assert.match(uploadTicket, /createDirectS3UploadUrl/)
  assert.match(uploadTicket, /'activity-photos'/)
  assert.match(syncRoute, /queuedPhotos\.length/)
  assert.match(syncRoute, /photoUrlsJson/)
  assert.match(syncRoute, /formData\.append\(['"]photoFiles['"], file\)/)
  assert.match(action, /getAll\('photoFiles'\)/)
  assert.match(action, /uploadedPhotoUrls\.map/)
  assert.match(approval, /resolveUploadUrl\(photo\.fileUrl\)/)
  assert.match(uploadProxy, /['"]activity-photos['"]/)
  assert.match(storage, /cleanPath\.startsWith\(["']activity-photos\/["']\)/)
  assert.match(storage, /activity-photos\|attendance-photos\|profile-photos\|upload/)
})

test('SPL checklist submits without activity library or GPS and uses time-only inputs', async () => {
  const activity = await read('components/mobile/mobile-daily-activity-form.tsx')
  const action = await read('app/dashboard/activity-hub/actions.ts')
  assert.match(
    activity,
    /selectedLibraries\.length === 0 && checklistContext && hasCheckedChecklist/
  )
  assert.doesNotMatch(activity, /if \(!geo\.latitude && !manualLocation\.trim\(\)\)/)
  assert.match(activity, /Lokasi Manual \(Opsional\)/)
  assert.match(activity, /type="time"/)
  assert.match(action, /!library && !isChecklistOnlySubmission/)
  assert.match(action, /'SPL-CHECKLIST'/)
})

test('Daily Activity shows a persistent success notice after submit redirect', async () => {
  const activity = await read('components/mobile/mobile-daily-activity-form.tsx')
  const page = await read('app/mobile/activity/page.tsx')
  assert.match(activity, /\/mobile\/activity\?submitted=1/)
  assert.match(page, /Daily Activity berhasil disubmit/)
  assert.match(page, /Data pekerjaan dan evidence sudah tersimpan/)
})

test('SPL checklist reuses the SPL approval instead of creating a Daily Activity approval', async () => {
  const activityAction = await read('app/dashboard/activity-hub/actions.ts')
  const approvalAction = await read('app/dashboard/admin-actions.ts')
  const mobileApproval = await read('components/mobile/mobile-approval-center.tsx')
  assert.match(activityAction, /const isSplEvidenceSubmission = payload\.overtimeCommandLetterId != null/)
  assert.match(activityAction, /const needsApproval =\s*!isSplEvidenceSubmission/)
  assert.match(activityAction, /isSplEvidenceSubmission\s*\? 'Submitted'/)
  assert.match(activityAction, /if \(isSplEvidenceSubmission\) \{[\s\S]*Approval SPL owns the decision/)
  assert.match(
    approvalAction,
    /dailyActivitySessions\.overtimeCommandLetterId, legacyRecordId/
  )
  assert.match(approvalAction, /linkedActivityStatus/)
  assert.match(approvalAction, /linkedSessionStatus/)
  assert.match(mobileApproval, /async function submitReview/)
  assert.match(mobileApproval, /toast\.error/)
  assert.match(mobileApproval, /disabled=\{Boolean\(submittingKey\)\}/)
})

test('mobile SPL card shows business type and pending approver', async () => {
  const history = await read('components/mobile/mobile-spl-history.tsx')
  const page = await read('app/mobile/overtime/page.tsx')
  const data = await read('lib/daily-activity.ts')
  assert.match(history, />Jenis</)
  assert.match(history, /employee_request[\s\S]*Pengajuan[\s\S]*Perintah/)
  assert.doesNotMatch(history, /row\.requestKind/)
  assert.match(history, /Pending approval:[\s\S]*row\.pendingApproverName/)
  assert.match(page, /pendingApproverName: document\.pendingApproverName/)
  assert.match(data, /pendingApproverName: approvals\.approverName/)
  assert.match(data, /eq\(approvals\.submissionId, overtimeCommandLetters\.requestSubmissionId\)/)
})

test('SPL writes participant snapshots and gates close on evidence', async () => {
  const action = await read('app/dashboard/activity-hub/actions.ts')
  assert.match(action, /submitMobileOvertimeRequestAction/)
  assert.match(action, /SPL sudah diajukan/)
  assert.match(action, /buildSplParticipantSnapshots/)
  assert.match(action, /assertNoSplOverlap/)
  assert.match(action, /interval 30 menit/)
  assert.match(action, /clock-in dan clock-out Attendance Real/)
  assert.match(action, /minimal satu foto/)
  assert.match(action, /evidenceStatus: 'complete'/)
})

test('mobile SPL submission is idempotent across repeated and concurrent clicks', async () => {
  const action = await read('app/dashboard/activity-hub/actions.ts')
  const schema = await read('db/schema/hero.ts')
  assert.match(
    action,
    /function buildSplNumber\([\s\S]*plannedStartAt: Date[\s\S]*plannedEndAt: Date/
  )
  assert.doesNotMatch(action, /const entropy = `\$\{Date\.now\(\)\}`/)
  assert.match(action, /findIdenticalMobileSpl/)
  assert.match(
    action,
    /const existing = await findIdenticalMobileSpl\(currentEmployee\.id, formData\)/
  )
  assert.match(
    action,
    /catch \(error\)[\s\S]*findIdenticalMobileSpl\(currentEmployee\.id, formData\)/
  )
  assert.match(schema, /splNumber: text\('spl_number'\)\.notNull\(\)\.unique\(\)/)
})

test('SPL email presets and H+1 H+2 reminder are wired centrally', async () => {
  const presets = await read('lib/email-template-presets.ts')
  const automation = await read('lib/approval-blueprint.ts')
  const reminder = await read('lib/spl-reminders.ts')
  for (const code of [
    'spl_submitted',
    'spl_assigned',
    'spl_decision',
    'spl_extension_submitted',
    'spl_evidence_reminder',
  ]) {
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
