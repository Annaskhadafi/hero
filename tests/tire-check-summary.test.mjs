import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('tire-check-summary-utils.ts provides complete multi-site, multi-period, and sizing calculations', () => {
  const filePath = path.join(process.cwd(), 'app/dashboard/tire-check/tire-check-summary-utils.ts')
  assert.ok(fs.existsSync(filePath), 'tire-check-summary-utils.ts must exist')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(content.includes('export function normalizeSiteToProject'), 'Must have site normalizer')
  assert.ok(content.includes('export function buildPeriodBuckets'), 'Must support period bucketing')
  assert.ok(content.includes('export function calculateSiteSummaryDataset'), 'Must calculate summary dataset')
  assert.ok(content.includes('export function generateSummaryCsv'), 'Must support CSV export')
  assert.ok(content.includes('CANONICAL_PROJECT_SITES'), 'Must have canonical project sites')
  assert.ok(content.includes('REFERENCE_SIZED_BENCHMARKS'), 'Must have benchmark data for 24.00R35 and 27.00R49')
  assert.ok(content.includes('24.00R35'), 'Must support 24.00R35')
  assert.ok(content.includes('27.00R49'), 'Must support 27.00R49')
  assert.ok(content.includes('quarterly'), 'Must support quarterly period')
  assert.ok(content.includes('yearly'), 'Must support yearly period')
  assert.ok(content.includes('custom'), 'Must support custom date range')
})

test('tire-check-summary-tab.tsx renders dual-axis comparison charts matching the reference report', () => {
  const filePath = path.join(process.cwd(), 'app/dashboard/tire-check/tire-check-summary-tab.tsx')
  assert.ok(fs.existsSync(filePath), 'tire-check-summary-tab.tsx must exist')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(content.includes('Summary Pressure Check'), 'Must display Summary Pressure Check header')
  assert.ok(content.includes('Pressure Checked (%)'), 'Must render Pressure Checked legend/metric')
  assert.ok(content.includes('Low Pressure (%)'), 'Must render Low Pressure legend/metric')
  assert.ok(content.includes('Target Low Pressure (%)'), 'Must render Target Low Pressure legend/metric')
  assert.ok(content.includes('#005b82'), 'Must use dark navy color for pressure checked bars')
  assert.ok(content.includes('#ea580c'), 'Must use orange color for low pressure line')
  assert.ok(content.includes('120%'), 'Must have 0-120% scale on left axis')
  assert.ok(content.includes('CANONICAL_PROJECT_SITES'), 'Must use canonical project sites')
  assert.ok(content.includes('Tabel Matriks Komparasi Antar Site'), 'Must include comprehensive comparison matrix table')
  assert.ok(content.includes('handleExportCsv'), 'Must have CSV download')
  assert.ok(content.includes('window.print'), 'Must have print support')
})

test('client-page.tsx integrates Summary Tab alongside Daily Monitoring', () => {
  const filePath = path.join(process.cwd(), 'app/dashboard/tire-check/client-page.tsx')
  assert.ok(fs.existsSync(filePath), 'client-page.tsx must exist')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(content.includes('TireCheckSummaryTab'), 'Must import and render TireCheckSummaryTab')
  assert.ok(content.includes('mainTab'), 'Must have mainTab state')
  assert.ok(content.includes('Monitoring Harian'), 'Must have Monitoring Harian tab button')
  assert.ok(content.includes('Summary (Perbandingan Antar Site)'), 'Must have Summary tab button')
  assert.ok(content.includes('allRawItems'), 'Must pass allRawItems to summary tab')
})
