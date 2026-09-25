import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Daily Activity Monitoring Enhancement: Server Layer Parity', () => {
  const root = process.cwd()
  const dashboardLibPath = path.join(root, 'lib/daily-activity-dashboard.ts')
  const pagePath = path.join(root, 'app/dashboard/daily-activity/page.tsx')

  assert.ok(fs.existsSync(dashboardLibPath), 'lib/daily-activity-dashboard.ts must exist')
  assert.ok(fs.existsSync(pagePath), 'app/dashboard/daily-activity/page.tsx must exist')

  const libSource = fs.readFileSync(dashboardLibPath, 'utf8')

  // 1. Interfaces & Types
  assert.ok(libSource.includes('startDate?: string'), 'DailyActivityFilterParams must support startDate')
  assert.ok(libSource.includes('endDate?: string'), 'DailyActivityFilterParams must support endDate')
  assert.ok(libSource.includes('employeeName?: string'), 'DailyActivityFilterParams must support employeeName')
  assert.ok(libSource.includes('interface UnsubmittedEmployeeRow'), 'Must export UnsubmittedEmployeeRow')
  assert.ok(libSource.includes('unsubmittedEmployees: UnsubmittedEmployeeRow[]'), 'DailyActivityDashboardData must include unsubmittedEmployees')

  // 2. Roster and timesheet schema imports
  assert.ok(libSource.includes('timesheetSchedulingPlansV2'), 'Must import timesheetSchedulingPlansV2')
  assert.ok(libSource.includes('timesheetSchedulingPlans'), 'Must import timesheetSchedulingPlans')
  assert.ok(libSource.includes('timesheetFieldBreakPlans'), 'Must import timesheetFieldBreakPlans')

  // 3. Roster OFF filtering logic ("tidak munculkan yagn rosternya off, ya")
  assert.ok(
    libSource.includes("rawCode === 'OFF'") && libSource.includes("rawCode === 'LIBUR'"),
    'Must filter out employees with OFF or LIBUR roster code'
  )
  assert.ok(libSource.includes('fbByEmployee'), 'Must check field break plans')

  // 4. Page controller wiring
  const pageSource = fs.readFileSync(pagePath, 'utf8')
  assert.ok(pageSource.includes('startDate?: string'), 'page.tsx must accept startDate in searchParams')
  assert.ok(pageSource.includes('endDate?: string'), 'page.tsx must accept endDate in searchParams')
  assert.ok(pageSource.includes('employeeName?: string'), 'page.tsx must accept employeeName in searchParams')
  assert.ok(pageSource.includes('startDate: resolvedParams.startDate'), 'page.tsx must pass startDate to getDailyActivityDashboardData')
  assert.ok(pageSource.includes('endDate: resolvedParams.endDate'), 'page.tsx must pass endDate to getDailyActivityDashboardData')
})

test('Daily Activity Monitoring Enhancement: Client UI & Tab Features', () => {
  const root = process.cwd()
  const clientPath = path.join(root, 'app/dashboard/daily-activity/client-dashboard.tsx')

  assert.ok(fs.existsSync(clientPath), 'client-dashboard.tsx must exist')
  const clientSource = fs.readFileSync(clientPath, 'utf8')

  // 1. Date range filter
  assert.ok(clientSource.includes('Dari Tanggal'), 'Must have Dari Tanggal label')
  assert.ok(clientSource.includes('Sampai Tanggal'), 'Must have Sampai Tanggal label')
  assert.ok(clientSource.includes('startDate'), 'Must manage startDate state')
  assert.ok(clientSource.includes('endDate'), 'Must manage endDate state')

  // 2. Search by Nama Karyawan
  assert.ok(clientSource.includes('Nama Karyawan'), 'Must have Nama Karyawan filter label')
  assert.ok(clientSource.includes('Cari nama karyawan...'), 'Must have placeholder Cari nama karyawan...')
  assert.ok(clientSource.includes('employeeNameFilter'), 'Must manage employeeNameFilter state')

  // 3. Tabs: Sudah Mengisi vs Belum Mengisi
  assert.ok(clientSource.includes('Sudah Mengisi Aktivitas'), 'Must have Sudah Mengisi Aktivitas tab')
  assert.ok(clientSource.includes('Belum Mengisi Aktivitas'), 'Must have Belum Mengisi Aktivitas tab')
  assert.ok(clientSource.includes('activeTab'), 'Must manage activeTab state')
  assert.ok(clientSource.includes('filteredUnsubmittedEmployees'), 'Must calculate filteredUnsubmittedEmployees')
  assert.ok(clientSource.includes('paginatedUnsubmittedEmployees'), 'Must calculate paginatedUnsubmittedEmployees')

  // 4. Tab 2 columns & badges
  assert.ok(clientSource.includes('Shift Roster'), 'Unsubmitted table must display Shift Roster')
  assert.ok(clientSource.includes('Status Kehadiran'), 'Unsubmitted table must display Status Kehadiran')
  assert.ok(clientSource.includes('Status Daily Activity'), 'Unsubmitted table must display Status Daily Activity')
  assert.ok(clientSource.includes('Belum Mengisi'), 'Unsubmitted table must display Belum Mengisi badge')

  // 5. CSV Export handles active tab
  assert.ok(clientSource.includes("activeTab === 'unsubmitted'"), 'handleExportCsv must handle unsubmitted export')
})
