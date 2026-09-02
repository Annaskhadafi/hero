import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Scheduling Timesheet PDF Multi-Select Options Contract Verification', () => {
  const filePath = path.resolve(process.cwd(), 'components/scheduling-timesheet-workspace.tsx')
  assert.ok(fs.existsSync(filePath), 'scheduling-timesheet-workspace.tsx must exist')

  const content = fs.readFileSync(filePath, 'utf-8')

  // 1. Verify 6 PDF options definitions exist
  assert.match(content, /overtime_summary/, 'Should define overtime_summary')
  assert.match(content, /msa_summary/, 'Should define msa_summary')
  assert.match(content, /mls_summary/, 'Should define mls_summary')
  assert.match(content, /tu_summary/, 'Should define tu_summary')
  assert.match(content, /overtime_record/, 'Should define overtime_record')
  assert.match(content, /payable_site_allowance/, 'Should define payable_site_allowance')

  // 2. Verify Multi-select dropdown Popover and Checkbox UI exist
  assert.match(content, /selectedPdfDocTypes/, 'Should have selectedPdfDocTypes state')
  assert.match(content, /ATTENDANCE_PDF_OPTIONS/, 'Should have ATTENDANCE_PDF_OPTIONS list')
  assert.match(content, /Pilih PDF/, 'Should render Pilih PDF dropdown button')

  // 3. Verify bulkDownloadOvertimePdf and previewAllSiteOvertimePdf handle the selected document types
  assert.match(content, /selectedPdfDocTypes\.includes\('overtime_summary'\)/, 'Should check overtime_summary in bulk download')
  assert.match(content, /selectedPdfDocTypes\.includes\('msa_summary'\)/, 'Should check msa_summary in bulk download')
  assert.match(content, /selectedPdfDocTypes\.includes\('mls_summary'\)/, 'Should check mls_summary in bulk download')
  assert.match(content, /selectedPdfDocTypes\.includes\('tu_summary'\)/, 'Should check tu_summary in bulk download')
  assert.match(content, /selectedPdfDocTypes\.includes\('overtime_record'\)/, 'Should check overtime_record in bulk download')
  assert.match(content, /selectedPdfDocTypes\.includes\('payable_site_allowance'\)/, 'Should check payable_site_allowance in bulk download')
})
