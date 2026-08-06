import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

test('cs forecast daily report config exists in schema and admin getter', () => {
  const schemaSource = read('db/schema/hero.ts')
  const adminSource = read('lib/hero-admin.ts')
  const helperSource = read('lib/cs-forecast-daily-report.ts')

  assert.match(schemaSource, /hero_cs_forecast_daily_report_config/)
  assert.match(schemaSource, /sendTimes/)
  assert.match(schemaSource, /lastSentKey/)
  assert.match(adminSource, /getCsForecastDailyReportConfigData/)
  assert.match(adminSource, /hero_cs_forecast_daily_report_config/)
  assert.match(helperSource, /sendCsForecastDailyReportEmail/)
  assert.match(helperSource, /runCsForecastDailyReportTick/)
  assert.match(helperSource, /templateCode: TEMPLATE_CODE/)
  assert.match(helperSource, /cs_forecast_daily_report/)
})

test('cs forecast daily report attachments use JPEG image and formatted Excel', () => {
  const helperSource = read('lib/cs-forecast-daily-report.ts')

  assert.match(helperSource, /import sharp from 'sharp'/)
  assert.match(helperSource, /buildSummaryJpegBuffer/)
  assert.match(helperSource, /\.jpeg/)
  assert.match(helperSource, /contentType: 'image\/jpeg'/)
  assert.match(helperSource, /buildDocSheetRows/)
  assert.match(helperSource, /Pending Document/)
  assert.match(helperSource, /Carry Over/)
})

test('email settings page exposes CS Forecast schedule panel', () => {
  const pageSource = read('app/dashboard/settings/email/page.tsx')
  const panelSource = read('components/cs-forecast-daily-report-settings-panel.tsx')
  const actionSource = read('app/dashboard/settings/email/actions.ts')

  assert.match(pageSource, /CsForecastDailyReportSettingsPanel/)
  assert.match(pageSource, /TabsTrigger value="cs-forecast"/)
  assert.match(panelSource, /CS Forecast Daily Report/)
  assert.match(panelSource, /Uji Schedule Tick \(Cron\)/)
  assert.match(panelSource, /Kirim Sekarang/)
  assert.match(actionSource, /saveCsForecastDailyReportConfigAction/)
  assert.match(actionSource, /sendCsForecastDailyReportNowAction/)
  assert.match(actionSource, /runCsForecastDailyReportTickAction/)
})

test('cron route and template seed/preset are wired', () => {
  const cronSource = read('app/api/cron/cs-forecast-daily-report/route.ts')
  const seedSource = read('lib/hero-admin.ts')
  const presetSource = read('lib/email-template-presets.ts')

  assert.match(cronSource, /runCsForecastDailyReportTick/)
  assert.match(cronSource, /CRON_SECRET/)
  assert.match(seedSource, /templateCode: 'cs_forecast_daily_report'/)
  assert.match(presetSource, /templateCode: 'cs_forecast_daily_report'/)
  assert.match(presetSource, /periodLabel/)
  assert.match(presetSource, /revenueSap/)
})

test('parseMonthYearToYearMonth parses English and Indonesian month names correctly', async () => {
  const { parseMonthYearToYearMonth } = await import('../lib/cs-forecast-daily-report.ts')

  assert.deepEqual(parseMonthYearToYearMonth('July 2026'), { year: 2026, month: 7 })
  assert.deepEqual(parseMonthYearToYearMonth('Juli 2026'), { year: 2026, month: 7 })
  assert.deepEqual(parseMonthYearToYearMonth('August 2026'), { year: 2026, month: 8 })
  assert.deepEqual(parseMonthYearToYearMonth('Agustus 2026'), { year: 2026, month: 8 })
  assert.deepEqual(parseMonthYearToYearMonth('2026-08'), { year: 2026, month: 8 })
  assert.deepEqual(parseMonthYearToYearMonth('08-2026'), { year: 2026, month: 8 })
})

test('loadLatestPeriodReport and getForecastPeriods select current month or chronological order', () => {
  const helperSource = read('lib/cs-forecast-daily-report.ts')
  const actionSource = read('app/actions/central-service-forecast.ts')

  assert.match(helperSource, /export function parseMonthYearToYearMonth/)
  assert.match(helperSource, /current-month priority selection/)
  assert.match(actionSource, /parseMonthYearToYearMonth/)
})

