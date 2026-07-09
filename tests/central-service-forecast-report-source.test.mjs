import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('daily report shows remaining amount beside category status', () => {
  const reportSource = read('app/dashboard/central-service/forecast/report/client-page.tsx')

  assert.match(reportSource, /Sisa Amount/)
  assert.match(
    reportSource,
    /const getRemainingAmount = \(cat: CategoryRow\) => Math\.max\(0, cat\.forecastIdr - cat\.actualIdr\)/
  )
  assert.match(reportSource, /const getRemarkDaily = \(cat: CategoryRow\) =>/)
  assert.ok(
    reportSource.includes("[cat.sectionDaily, cat.remarkDaily].filter(Boolean).join(' / ')")
  )
  assert.match(reportSource, /label="Total"/)
  assert.match(reportSource, /forecast=\{totalScore\.forecast\}/)
  assert.match(reportSource, /actual=\{totalScore\.actual\}/)
  assert.match(reportSource, /Revenue SAP/)
  assert.match(reportSource, /Document Completed/)
  assert.match(reportSource, /border-t border-primary\/15/)
  assert.match(reportSource, /const normalizeStatusDoc =/)
  assert.match(reportSource, /const isCancelStatusDoc =/)
  assert.match(reportSource, /const resolveLatestNonCancelStatusDoc =/)
  assert.match(reportSource, /latestNonCancel \?\? latestAny/)
  assert.match(reportSource, /status === 'Complete'\) return 'Invoice'/)
  assert.match(reportSource, /status === 'Pending'\) return 'Waiting PO'/)
  assert.match(reportSource, /const formatStatusDoc =/)
  assert.match(reportSource, /poNumber: string/)
  assert.match(reportSource, /existing\.actualIdr \+= Number\(a\.amountIdr\)/)
  assert.match(reportSource, /existing\.sectionDaily = a\.jobCode \|\| existing\.sectionDaily/)
  assert.match(reportSource, /existing\.poNumber = latestStatus\.poNumber \|\| existing\.poNumber/)
  assert.match(reportSource, /formatStatusDoc\(cat\.status, cat\.poNumber\)/)
  assert.match(reportSource, /<td colSpan=\{14\}/)
  const picColumn = reportSource.indexOf('PIC <ArrowUpDown')
  const remarkMonthlyColumn = reportSource.indexOf('Remark Monthly')
  const forecastIdrColumn = reportSource.indexOf('Forecast IDR')
  const forecastUsdColumn = reportSource.indexOf('Forecast USD')
  const categoryColumn = reportSource.indexOf('Category', forecastUsdColumn)

  assert.ok(picColumn > -1)
  assert.ok(remarkMonthlyColumn > picColumn)
  assert.ok(forecastIdrColumn > remarkMonthlyColumn)
  assert.ok(forecastUsdColumn > forecastIdrColumn)
  assert.ok(categoryColumn > forecastUsdColumn)
  assert.match(reportSource, /colSpan=\{4\}/)
  assert.match(reportSource, /TOTAL/)
})
