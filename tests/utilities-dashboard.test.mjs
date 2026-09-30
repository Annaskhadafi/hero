import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('Utilities Dashboard Architecture and Contracts', () => {
  // 1. Check file existence
  assert.ok(existsSync(path.join(projectRoot, 'lib/utilities-dashboard.ts')), 'lib/utilities-dashboard.ts must exist')
  assert.ok(existsSync(path.join(projectRoot, 'app/dashboard/utilities/page.tsx')), 'app/dashboard/utilities/page.tsx must exist')
  assert.ok(existsSync(path.join(projectRoot, 'app/dashboard/utilities/client.tsx')), 'app/dashboard/utilities/client.tsx must exist')
  assert.ok(existsSync(path.join(projectRoot, 'app/dashboard/utilities/export-excel.ts')), 'app/dashboard/utilities/export-excel.ts must exist')

  // 2. Data layer aggregation verification
  const libSource = read('lib/utilities-dashboard.ts')
  assert.match(libSource, /export async function getUtilitiesDashboardData/)
  assert.match(libSource, /parseItemQuantity/)
  assert.match(libSource, /tireCount/)
  assert.match(libSource, /totalDurationHours/)
  assert.match(libSource, /activityBars/)
  assert.match(libSource, /dailyTrends/)
  assert.match(libSource, /dateMatrix/)
  assert.match(libSource, /technicianMatrix/)
  assert.match(libSource, /unitMatrix/)

  // 3. Navigation & RBAC verification
  const adminSource = read('lib/hero-admin.ts')
  const accessSource = read('lib/hero-access.ts')
  assert.match(adminSource, /url:\s*['"]\/dashboard\/utilities['"]/)
  assert.match(adminSource, /resource:\s*['"]utilities['"]/)
  assert.match(accessSource, /resource === ['"]utilities['"]/)

  // 4. Excel & CSV Export verification
  const exportSource = read('app/dashboard/utilities/export-excel.ts')
  assert.match(exportSource, /export async function exportUtilitiesToExcel/)
  assert.match(exportSource, /Rekap per Tanggal/)
  assert.match(exportSource, /Rekap per Teknisi/)
  assert.match(exportSource, /Rekap per Unit/)
  assert.match(exportSource, /export function exportUtilitiesToCsv/)

  // 5. Client UI verification
  const clientSource = read('app/dashboard/utilities/client.tsx')
  assert.match(clientSource, /Dashboard Utilities Site/)
  assert.match(clientSource, /ResponsiveContainer/)
  assert.match(clientSource, /BarChart/)
  assert.match(clientSource, /AreaChart/)
  assert.match(clientSource, /TabsContent value="date"/)
  assert.match(clientSource, /SUM/)
})
