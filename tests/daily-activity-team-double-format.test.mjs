import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'

test('normalizeDateToYmdString properly normalizes UTC and local dates without day-shifting', async () => {
  const dashboardModule = await import('../lib/daily-activity-dashboard.ts')
  const { normalizeDateToYmdString } = dashboardModule

  assert.equal(typeof normalizeDateToYmdString, 'function', 'normalizeDateToYmdString must be exported')

  // Clean string YYYY-MM-DD
  assert.equal(normalizeDateToYmdString('2026-10-14'), '2026-10-14')

  // Date object from UTC midnight (e.g. createDailyActivitySessionAction)
  const utcDate = new Date('2026-10-14T00:00:00.000Z')
  assert.equal(normalizeDateToYmdString(utcDate), '2026-10-14')

  // Date object from WITA local midnight (2026-10-14 00:00:00 WITA = 2026-10-13 16:00:00 UTC)
  const witaMidnightInUtc = new Date('2026-10-13T16:00:00.000Z')
  assert.equal(normalizeDateToYmdString(witaMidnightInUtc), '2026-10-14')

  // Date object during working hours (2026-10-14 08:30:00 WITA = 2026-10-14 00:30:00 UTC)
  const workHoursDate = new Date('2026-10-14T00:30:00.000Z')
  assert.equal(normalizeDateToYmdString(workHoursDate), '2026-10-14')

  // Null or undefined
  assert.equal(normalizeDateToYmdString(null), 'nodate')
  assert.equal(normalizeDateToYmdString(undefined), 'nodate')
})

test('checkTeamMembersExistingDailyActivityAction is defined and exported in activity-hub/actions.ts', async () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/activity-hub/actions.ts')
  const content = await fs.readFile(actionsPath, 'utf8')

  assert.ok(
    content.includes('export async function checkTeamMembersExistingDailyActivityAction'),
    'Must export checkTeamMembersExistingDailyActivityAction'
  )
  assert.ok(
    content.includes('dailyActivitySessionTeamMembers'),
    'Must query dailyActivitySessionTeamMembers'
  )
})

test('create modal integrates pre-check conflict warning and conflict dialog', async () => {
  const modalPath = path.join(process.cwd(), 'components/daily-activity-create-modal.tsx')
  const content = await fs.readFile(modalPath, 'utf8')

  assert.ok(
    content.includes('checkTeamMembersExistingDailyActivityAction'),
    'Must import and call checkTeamMembersExistingDailyActivityAction'
  )
  assert.ok(
    content.includes('conflictWarningOpen'),
    'Must declare and use conflictWarningOpen state'
  )
  assert.ok(
    content.includes('Peringatan: Anggota Tim Sudah Memiliki Aktivitas'),
    'Must render conflict dialog title'
  )
  assert.ok(
    content.includes('Keluarkan Anggota Tersebut'),
    'Must provide button to exclude conflicting members'
  )
  assert.ok(
    content.includes('Tetap Lanjutkan'),
    'Must provide button to proceed with merge'
  )
})

test('client dashboard renders multi-session badge when isMultiSession is true', async () => {
  const clientPath = path.join(process.cwd(), 'app/dashboard/daily-activity/client-dashboard.tsx')
  const content = await fs.readFile(clientPath, 'utf8')

  assert.ok(
    content.includes('emp.isMultiSession'),
    'Must check emp.isMultiSession in table row'
  )
  assert.ok(
    content.includes('emp.multiSessionLabel'),
    'Must render emp.multiSessionLabel'
  )
})
