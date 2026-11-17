import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

test('dateRangeDays in attendance actions uses UTC calendar iteration without local-midnight shift', () => {
  const attendanceSource = read('app/actions/attendance.ts')
  assert.ok(attendanceSource.includes('parseStrictCalendarDateParts'))
  assert.ok(attendanceSource.includes('Date.UTC('))
  assert.ok(attendanceSource.includes('cursor.setUTCDate(cursor.getUTCDate() + 1)'))
  assert.equal(attendanceSource.includes('cursor.toISOString().slice(0, 10)'), false)
  assert.ok(attendanceSource.includes("timeZone: 'UTC'"))
})

test('approval-workspace isolates SPL lookup strictly to overtime-command-letter and resolves attendance-permission cleanly', () => {
  const workspaceSource = read('lib/approval-workspace.ts')
  assert.ok(workspaceSource.includes('export function isOvertimeCommandLetterSubmission'))
  assert.ok(workspaceSource.includes("templateKey === 'overtime-command-letter'"))
  assert.ok(workspaceSource.includes('snapshotSplId(item.row as any, item.payload)'))
  assert.ok(workspaceSource.includes('snapshotAttendancePermissionId'))
  assert.ok(workspaceSource.includes('attendancePermissionRequests'))
  assert.ok(workspaceSource.includes("effectiveActivityType"))
  assert.ok(workspaceSource.includes("'Pengajuan Izin'"))
  assert.ok(workspaceSource.includes('parseCalendarDateSafe'))
  assert.ok(workspaceSource.includes("timeZone: 'Asia/Makassar'"))
})

test('legacy approval engine and attendance permission dashboard use Indonesia timezone date helpers', () => {
  const legacyEngineSource = read('lib/legacy-approval-engine.ts')
  const dashboardSource = read('lib/attendance-permission-dashboard.ts')
  assert.ok(legacyEngineSource.includes('getTimezoneDateParts'))
  assert.ok(dashboardSource.includes('getTodayDateString().slice(0, 7)'))
  assert.ok(dashboardSource.includes("timeZone: 'UTC'"))
})

test('approval-workbench recognizes ATTENDANCE_PERMISSION and excludes it from SPL and PTW matching', () => {
  const workbenchSource = read('components/approval-workbench.tsx')
  assert.ok(workbenchSource.includes("'ATTENDANCE_PERMISSION'"))
  assert.ok(workbenchSource.includes('FORM PENGAJUAN IZIN ATTENDANCE'))
  assert.ok(workbenchSource.includes('const isAttPermission ='))
  assert.ok(workbenchSource.includes('!isAttPermission &&'))
})

test('calendar date range expansion and safe Date noon-UTC mapping preserve exact YYYY-MM-DD', () => {
  const parseStrictCalendarDateParts = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
    if (!match) return null
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const utc = new Date(Date.UTC(year, month - 1, day))
    if (
      utc.getUTCFullYear() !== year ||
      utc.getUTCMonth() !== month - 1 ||
      utc.getUTCDate() !== day
    ) {
      return null
    }
    return { year, month, day, utc }
  }

  const expandRange = (startDate, endDate) => {
    const startParts = parseStrictCalendarDateParts(startDate)
    const endParts = parseStrictCalendarDateParts(endDate)
    const days = []
    for (
      const cursor = new Date(startParts.utc.getTime());
      cursor <= endParts.utc;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      days.push(
        `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`
      )
    }
    return days
  }

  const expanded = expandRange('2026-11-12', '2026-11-14')
  assert.deepEqual(expanded, ['2026-11-12', '2026-11-13', '2026-11-14'])

  // 04:00 UTC preserves 2026-11-12 in UTC (+0), WIB (+7), WITA (+8), and WIT (+9)
  const noonWita = new Date(Date.UTC(2026, 10, 12, 4, 0, 0))
  for (const tz of ['UTC', 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']) {
    const formatted = noonWita.toLocaleDateString('en-CA', { timeZone: tz })
    assert.equal(formatted, '2026-11-12')
  }
})
