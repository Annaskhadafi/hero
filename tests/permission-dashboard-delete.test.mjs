import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Attendance permission deletion source integrity', () => {
  const actionSource = fs.readFileSync('app/actions/attendance.ts', 'utf8')
  const dashboardSource = fs.readFileSync('lib/attendance-permission-dashboard.ts', 'utf8')
  const tabsSource = fs.readFileSync('components/izin-dashboard/izin-dashboard-tabs.tsx', 'utf8')
  const bulkSource = fs.readFileSync('components/izin-dashboard/izin-bulk-actions.tsx', 'utf8')

  // 1. Action accepts string | number IDs and processes req- and ovr- prefixes
  assert.match(actionSource, /bulkDeleteAttendancePermissionRequests\s*\(\s*ids:\s*\(\s*string\s*\|\s*number\s*\)\[\]\s*\)/)
  assert.match(actionSource, /rawId\.startsWith\('req-'\)/)
  assert.match(actionSource, /rawId\.startsWith\('ovr-'\)/)
  assert.match(actionSource, /timesheetAttendanceRealOverrides/)

  // 2. Dashboard helper sets distinct string IDs and source props
  assert.match(dashboardSource, /id:\s*`ovr-\$\{row\.id\}`/)
  assert.match(dashboardSource, /id:\s*`req-\$\{row\.id\}`/)
  assert.match(dashboardSource, /overrideId:\s*row\.id/)
  assert.match(dashboardSource, /employeeId:\s*row\.employeeId/)

  // 3. UI tabs render SingleDeleteButton and support bulk delete with string[] selectedIds
  assert.match(tabsSource, /function SingleDeleteButton/)
  assert.match(tabsSource, /useState<string\[\]>\(\[\]\)/)
  assert.match(tabsSource, /bulkDeleteAttendancePermissionRequests\(\[id\]\)/)
  assert.match(bulkSource, /selectedIds:\s*string\[\]/)
})
