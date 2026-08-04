import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('getDailyForecastItems synthesizes unplanned SAP actual items', () => {
  const actionSource = read('app/actions/central-service-forecast.ts')

  assert.match(actionSource, /unplannedActuals\.push\(a\)/)
  assert.match(actionSource, /status: ['"]Unplanned SAP['"]/)
  assert.match(actionSource, /isUnplanned: true/)
})

test('DailyClientPage formats negative Sisa values with plus sign for surplus', () => {
  const dailySource = read('app/dashboard/central-service/forecast/daily/client-page.tsx')

  assert.match(dailySource, /const formatSisaCurrency =/)
  assert.match(dailySource, /return `\+\$\{formatted\}`/)
  assert.match(dailySource, /formatSisaCurrency\(totalRemaining\)/)
})

test('ReportClientPage syncs Revenue SAP scorecards using getSapInvoices', () => {
  const reportSource = read('app/dashboard/central-service/forecast/report/client-page.tsx')

  assert.match(reportSource, /import \{ getSapInvoices \} from ['"]@\/app\/actions\/central-service-forecast['"]/)
  assert.match(reportSource, /getSapInvoices\(period\.monthYear\)/)
  assert.match(reportSource, /actual: sapTotals\.totalIdr/)
  assert.match(reportSource, /actualUsd: sapTotals\.totalUsd/)
})

test('handleCarryOverPropagation automatically creates next period and item on Carry Over status', () => {
  const actionSource = read('app/actions/central-service-forecast.ts')

  assert.match(actionSource, /export (async )?function getNextMonthYear/)
  assert.match(actionSource, /handleCarryOverPropagation/)
  assert.match(actionSource, /Carry Over from \$\{period\.monthYear\}/)
  assert.match(actionSource, /if \(newStatus\.trim\(\)\.toLowerCase\(\) === 'carry over'\)/)
})
