import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('SPL approval inbox reads schedule, site, Daily Activity, and evidence from live data', async () => {
  const workspace = await read('lib/approval-workspace.ts')
  assert.match(workspace, /overtimeCommandLetters\.plannedStartAt/)
  assert.match(workspace, /overtimeCommandLetters\.plannedEndAt/)
  assert.match(workspace, /dailyActivitySessionItems\.isChecked/)
  assert.match(workspace, /activityPhotos\.fileUrl/)
  assert.match(workspace, /inArray\(activityPhotos\.activityId, activityIds\)/)
  assert.match(workspace, /photo\.activityId === row\.approvalActivityId/)
  assert.doesNotMatch(workspace, /leftJoin\(activityPhotos/)
  assert.match(workspace, /where\(inArray\(apdRequests\.id, apdIds\)\)/)
  assert.doesNotMatch(workspace, /leftJoin\(apdRequests/)
  assert.match(workspace, /evidenceProgressPercent/)
  assert.match(workspace, /requestKindLabel/)
})

test('mobile and desktop approval reuse the same complete review details', async () => {
  const details = await read('components/approval-request-details.tsx')
  const mobile = await read('components/mobile/mobile-approval-center.tsx')
  const desktop = await read('components/approval-review-drawer-form.tsx')

  for (const label of [
    'Site',
    'Total lembur',
    'Tanggal',
    'Mulai',
    'Selesai',
    'Deskripsi pekerjaan',
    'Daily Activity',
    'Evidence',
    'Belum ada evidence',
  ]) {
    assert.match(details, new RegExp(label))
  }
  assert.match(mobile, /<ApprovalRequestDetails item=\{item\}/)
  assert.match(mobile, /required\s+minLength=\{3\}/)
  assert.match(mobile, /value="approved"\s+formNoValidate/)
  assert.match(desktop, /<ApprovalRequestDetails item=\{item\}/)
  assert.match(desktop, /length\s*<\s*3|minLength=\{3\}/)
  assert.doesNotMatch(mobile, /Approve Group/)
})
