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
  // 4. Verify Eksternal toggle and signatures contract
  assert.match(content, /pdfUseExternalSignatures/, 'Should have pdfUseExternalSignatures state')
  assert.match(content, /toggle-external-pdf-bulk/, 'Should render bulk Eksternal toggle')
  assert.match(content, /getSummaryPdfSignatures/, 'Should have getSummaryPdfSignatures resolver')
  assert.match(content, /useExternalOnly:\s*true/, 'Should set useExternalOnly: true when Eksternal is checked')
  assert.match(content, /omitExternal:\s*true/, 'Should set omitExternal: true when Eksternal is not checked')
})

test('PDF Signatures Module Source Contract Verification', () => {
  const pdfSigPath = path.resolve(process.cwd(), 'lib/timesheet/pdf-signatures.ts')
  assert.ok(fs.existsSync(pdfSigPath), 'pdf-signatures.ts must exist')

  const content = fs.readFileSync(pdfSigPath, 'utf-8')

  // Verify type has useExternalOnly and omitExternal
  assert.match(content, /useExternalOnly\?: boolean/, 'Should define useExternalOnly in PdfSignatureNames')
  assert.match(content, /omitExternal\?: boolean/, 'Should define omitExternal in PdfSignatureNames')

  // Verify 2 signatures logic when useExternalOnly is active
  assert.match(content, /if\s*\(names\.useExternalOnly\)/, 'Should branch on useExternalOnly')
  assert.match(content, /isTwoSigners/, 'Should handle 2 signers positioning')
})

