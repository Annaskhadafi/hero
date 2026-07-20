import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('service 360 quotation line items support drag sorting', () => {
  const formSource = read('app/dashboard/360-service/quotations/create/quotation-form.tsx')
  const actionSource = read('app/actions/service360.ts')

  assert.match(formSource, /DndContext/)
  assert.match(formSource, /SortableContext/)
  assert.match(formSource, /useSortable/)
  assert.match(formSource, /arrayMove\(formItems, oldIndex, newIndex\)/)
  assert.match(
    formSource,
    /setValue\("items", arrayMove\(formItems, oldIndex, newIndex\), \{ shouldDirty: true \}\)/
  )
  assert.match(formSource, /GripVertical/)
  assert.match(formSource, /restrictToVerticalAxis/)
  assert.match(actionSource, /orderBy\(asc\(service360QuotationItems\.id\)\)/)
})

test('service 360 quotation reload keeps backup labour prorate eligible', () => {
  const formSource = read('app/dashboard/360-service/quotations/create/quotation-form.tsx')

  assert.match(
    formSource,
    /if \(desc\.includes\("labour cost"\) \|\| i\.quotationItem\.isBackup\) inferredCategory = "Labour Cost"/
  )
  assert.match(
    formSource,
    /const PRORATE_CATEGORIES = \["Labour Cost", "Rental & Tools", "Rental", "Tools"\]/
  )
  assert.match(formSource, /getBackupProrate\(selItem\)/)
})

test('service 360 quotation edit reloads project name and PO period fields', () => {
  const formSource = read('app/dashboard/360-service/quotations/create/quotation-form.tsx')

  assert.match(formSource, /const parsePoPeriod = \(periodStr\?: string \| null\)/)
  assert.match(formSource, /const parsedPoPeriod = parsePoPeriod\(initialData\?\.poPeriod\)/)
  assert.match(formSource, /const initialProjectSiteId =/)
  assert.match(
    formSource,
    /siteList\?\.find\(\(site\) => site\.name === initialData\?\.projectName\)\?\.id\?\.toString\(\)/
  )
  assert.match(formSource, /selectedProjectSite: initialProjectSiteId/)
  assert.match(formSource, /poPeriodStart: parsedPoPeriod\.start/)
  assert.match(formSource, /poPeriodEnd: parsedPoPeriod\.end/)
  assert.match(formSource, /value=\{poPeriodStart \|\| ""\}/)
  assert.match(formSource, /value=\{poPeriodEnd \|\| ""\}/)
})

test('service 360 quotation list supports PO column and selected PDF summary', () => {
  const pageSource = read('app/dashboard/360-service/quotations/page.tsx')
  const tableSource = read('app/dashboard/360-service/quotations/quotations-summary-table.tsx')

  assert.match(pageSource, /poNumber: quotation\.poNumber \?\? ['"]{2}/)
  assert.match(pageSource, /site: quotation\.projectName \?\? ['"]{2}/)
  assert.match(pageSource, /period: quotation\.poPeriod \?\? ['"]{2}/)
  assert.match(tableSource, /PO Customer/)
  assert.match(tableSource, /PDF Summary/)
  assert.match(tableSource, /selectedRows/)
  assert.match(tableSource, /QuotationStatusSelect/)
  assert.match(tableSource, /['"]No Quotation['"]/)
  assert.match(tableSource, /['"]Customer['"]/)
  assert.match(tableSource, /['"]Total Amount['"]/)
  assert.match(tableSource, /['"]Periode['"]/)
})

test('service 360 quotation only auto-downloads from the download button', () => {
  const formSource = read('app/dashboard/360-service/quotations/create/quotation-form.tsx')
  const previewSource = read('app/dashboard/360-service/quotations/quotation-preview-dialog.tsx')
  const tableSource = read('app/dashboard/360-service/quotations/quotations-summary-table.tsx')

  assert.match(formSource, /router\.push\(`\/dashboard\/360-service\/quotations\/\$\{res\.id\}`\)/)
  assert.doesNotMatch(formSource, /download=true/)
  assert.doesNotMatch(previewSource, /download=true/)
  assert.match(tableSource, /quotations\/\$\{row\.id\}\?download=true/)
})

test('service 360 BAST keeps closing and signatures on-page through 10 rows', () => {
  const pageSource = read('app/dashboard/360-service/quotations/[id]/page.tsx')

  assert.match(pageSource, /const BAST_MAX_ROWS_WITH_SIGNATURE = 10/)
  assert.match(pageSource, /rentalItems\.length <= BAST_MAX_ROWS_WITH_SIGNATURE && bastClosing/)
  assert.match(pageSource, /rentalItems\.length > BAST_MAX_ROWS_WITH_SIGNATURE && \(/)
})

test('service 360 quotation syncs Labour Cost after period and labour rows exist', () => {
  const formSource = read('app/dashboard/360-service/quotations/create/quotation-form.tsx')
  const actionSource = read('app/actions/service360.ts')

  assert.match(formSource, /const canSyncAttendance = Boolean/)
  assert.match(formSource, /canSyncAttendance &&/)
  assert.match(formSource, /Sync Attendance/)
  assert.match(formSource, /FB dipisah, OFF tetap dihitung/)
  assert.match(formSource, /syncQuotationLabourAttendance/)
  assert.match(formSource, /return \[\{ \.\.\.item, startDate: "", endDate: "", extraDateRanges: \[\] \}\]/)
  assert.match(formSource, /if \(synced\.remove\)/)
  assert.match(formSource, /item\.category\.toLowerCase\(\)\.trim\(\) === "labour cost" && !hasPeriod/)
  assert.match(formSource, /i\.siteId === Number\(selectedProjectSite\)/)
  assert.match(actionSource, /eq\(employees\.isActive, true\)/)
  assert.match(actionSource, /remove: true/)
  assert.match(actionSource, /timesheetSchedulingPlansV2/)
  assert.match(actionSource, /timesheetFieldBreakPlans/)
  assert.match(actionSource, /timesheetAttendanceRealOverrides/)
  assert.match(actionSource, /attendanceRecords/)
  assert.match(actionSource, /normalizedCode === "FB"/)
  assert.match(actionSource, /normalizedCode === "OFF"/)
  assert.match(actionSource, /timesheetSchedulingConfigs\.fieldBreakConfig/)
  assert.match(actionSource, /isQuotationAttendanceStatusBillable/)
  assert.match(actionSource, /quotationBillingConfig\.countEmpty/)

  const setupSource = read('components/scheduling-timesheet-workspace.tsx')
  assert.match(setupSource, /Aturan Tagihan Quotation/)
  assert.match(setupSource, /\['countEmpty', 'Kosong'\]/)
  assert.match(setupSource, /\['countSick', 'Sakit'\]/)
  assert.match(setupSource, /\['countLeave', 'Izin'\]/)
  assert.match(setupSource, /\['countAbsent', 'Alfa'\]/)
  assert.match(setupSource, /Hitung \{label\}/)
})
