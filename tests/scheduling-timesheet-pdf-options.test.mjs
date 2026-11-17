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
  assert.match(content, /pdfExternalSignatureCount/, 'Should have pdfExternalSignatureCount state')
  assert.match(content, /toggle-external-pdf-bulk/, 'Should render bulk Eksternal toggle')
  assert.match(content, /getSummaryPdfSignatures/, 'Should have getSummaryPdfSignatures resolver')
  assert.match(content, /useExternalOnly:\s*true/, 'Should set useExternalOnly: true when Eksternal is checked')
  assert.match(content, /externalSignatureCount:\s*pdfExternalSignatureCount/, 'Should pass externalSignatureCount to signatures')
  assert.match(content, /omitExternal:\s*true/, 'Should set omitExternal: true when Eksternal is not checked')
})

test('PDF Signatures Module Source Contract Verification', () => {
  const pdfSigPath = path.resolve(process.cwd(), 'lib/timesheet/pdf-signatures.ts')
  assert.ok(fs.existsSync(pdfSigPath), 'pdf-signatures.ts must exist')

  const content = fs.readFileSync(pdfSigPath, 'utf-8')

  // Verify type has useExternalOnly, externalSignatureCount, and omitExternal
  assert.match(content, /useExternalOnly\?: boolean/, 'Should define useExternalOnly in PdfSignatureNames')
  assert.match(content, /externalSignatureCount\?:/, 'Should define externalSignatureCount in PdfSignatureNames')
  assert.match(content, /omitExternal\?: boolean/, 'Should define omitExternal in PdfSignatureNames')

  // Verify 2 signatures logic when useExternalOnly is active
  assert.match(content, /if\s*\(names\.useExternalOnly\)/, 'Should branch on useExternalOnly')
  assert.match(content, /isTwoSigners/, 'Should handle 2 signers positioning')
})

test('Overtime Record Signatures Module Contract Verification', () => {
  const genPdfPath = path.resolve(process.cwd(), 'lib/timesheet/generate-attendance-pdf.ts')
  assert.ok(fs.existsSync(genPdfPath), 'generate-attendance-pdf.ts must exist')

  const content = fs.readFileSync(genPdfPath, 'utf-8')
  assert.match(content, /names\.externalSignatureCount/, 'Should respect externalSignatureCount in Overtime Record')
  assert.match(content, /isTwoSigners/, 'Should calculate isTwoSigners in drawOvertimeRecordSignatures')
})

test('Site Attendance PDF Preview & Download Stability & Feedback Contract', () => {
  const filePath = path.resolve(process.cwd(), 'components/scheduling-timesheet-workspace.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  // 1. Loading indicators & states
  assert.match(content, /const \[isPreviewingSitePdf, setIsPreviewingSitePdf\] = useState\(false\)/, 'Should define isPreviewingSitePdf state')
  assert.match(content, /const \[isDownloadingSitePdf, setIsDownloadingSitePdf\] = useState\(false\)/, 'Should define isDownloadingSitePdf state')
  assert.match(content, /isPreviewingSitePdf\s*\?\s*['"]Menyiapkan\.\.\.['"]/, 'Should show Menyiapkan... text on button during preview generation')
  assert.match(content, /isDownloadingSitePdf\s*\?\s*['"]Mengunduh\.\.\.['"]/, 'Should show Mengunduh... text on button during bulk download')

  // 2. Progressive feedback toasts & yields
  assert.match(content, /const toastId = 'preview-site-pdf'/, 'Should use stable toastId for preview')
  assert.match(content, /toast\.loading\('Menyiapkan Preview PDF\.\.\. Mohon tunggu'/, 'Should notify user immediately on preview click')
  assert.match(content, /toast\.loading\('Menyiapkan download PDF\.\.\. Mohon tunggu'/, 'Should notify user immediately on download click')

  // 3. Robust PDF preview modal with fallback & Open in New Tab
  assert.match(content, /<object\s+data=\{pdfPreview\.url\}/, 'Should render <object> tag for PDF preview')
  assert.match(content, /<ExternalLink className="mr-1\.5 size-3\.5 text-slate-600" \/>\s*Buka di Tab Baru/, 'Should render Buka di Tab Baru button in dialog header')
  assert.match(content, /window\.open\(pdfPreview\.url,\s*['_"]_blank['_"]\)/, 'Should support opening PDF blob in new window/tab')
  assert.match(content, /setTimeout\(\(\) => \{[\s\S]*?URL\.revokeObjectURL/, 'Should safely delay revoking blob URL so external tabs remain readable')
})
