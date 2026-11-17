import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('lib/summary-constants.ts exports formatApdItemColHeader with clean abbreviation rules', async () => {
  const constantsFile = fs.readFileSync(path.resolve('lib/summary-constants.ts'), 'utf8');
  assert.ok(constantsFile.includes('export function formatApdItemColHeader'), 'Must export formatApdItemColHeader');

  const { formatApdItemColHeader } = await import('../lib/summary-constants.ts');
  assert.equal(formatApdItemColHeader('Sarung Tangan Kleenguard G40 (Vale)'), 'S. Tangan Kleenguard');
  assert.equal(formatApdItemColHeader('Cotton Filter Respirator Honeywell'), 'Cotton Filter Resp.');
  assert.equal(formatApdItemColHeader('Sarung Tangan Kulit (Vale)'), 'S. Tangan Kulit');
  assert.equal(formatApdItemColHeader('Sarung Tangan Ansel'), 'S. Tangan Ansell');
  assert.equal(formatApdItemColHeader('Helmet Kuning'), 'Helmet Kuning');
});

test('app/print/summary/[id]/page.tsx enforces A4 landscape without clipping overflow and with high readability', () => {
  const printFile = fs.readFileSync(path.resolve('app/print/summary/[id]/page.tsx'), 'utf8');
  
  // Must enforce A4 landscape and safe margins
  assert.ok(printFile.includes('size: A4 landscape;'), 'Must specify exact A4 landscape size');
  assert.ok(printFile.includes('margin: 5mm 7mm;'), 'Must specify safe printable margins');

  // Must not have destructive overflow clipping
  assert.ok(!printFile.includes('max-height: 198mm !important'), 'Must remove artificial max-height clipping');

  // Must use <colgroup> for mathematical width distribution
  assert.ok(printFile.includes('<colgroup>'), 'Must define <colgroup> for table layout');
  assert.ok(printFile.includes('formatApdItemColHeader'), 'Must use formatApdItemColHeader for clean headers');

  // Must have clear font size scaling
  assert.ok(printFile.includes('qtyFontSize'), 'Must define qtyFontSize for bold readable quantities');
  assert.ok(printFile.includes('itemHeaderFontSize'), 'Must define itemHeaderFontSize');
});

test('lib/summary-print.ts configures calibrated iframe dimensions, single-print guard, and cleanup', () => {
  const printHelper = fs.readFileSync(path.resolve('lib/summary-print.ts'), 'utf8');
  assert.ok(printHelper.includes("iframe.style.width = '297mm'"), 'Iframe width must be 297mm');
  assert.ok(printHelper.includes("iframe.style.height = '210mm'"), 'Iframe height must be 210mm');
  assert.ok(printHelper.includes('hasPrinted'), 'Must guard against duplicate print() calls');
  assert.ok(printHelper.includes('afterprint'), 'Must clean up iframe after printing');
  assert.ok(printHelper.includes('?printOnly=1'), 'Must pass ?printOnly=1 so Dokumen column is omitted cleanly from print DOM');
});

test('components/summary/summary-preview.tsx provides non-fixed print styling, unique printable ID, and shared iframe print', () => {
  const previewFile = fs.readFileSync(path.resolve('components/summary/summary-preview.tsx'), 'utf8');

  // Must include A4 landscape @page rule
  assert.ok(previewFile.includes('size: A4 landscape;'), 'Must specify exact A4 landscape size');
  assert.ok(previewFile.includes('summary-document-printable'), 'Must assign printable document id');
  assert.ok(previewFile.includes('summary-document-printable-zoom'), 'Zoom modal copy must use a separate ID to avoid duplicate print DOM nodes');

  // Must NOT trap printable sheet in position: fixed during print (which repeats & clips across pages)
  assert.ok(!previewFile.includes('position: fixed !important'), 'Must not apply position: fixed !important to printable document');
  assert.ok(!previewFile.includes('body > *:not(#summary-print-iframe)'), 'Must not keep #summary-print-iframe visible during @media print');

  // Must use shared printSummaryInPlace helper
  assert.ok(previewFile.includes('printSummaryInPlace'), 'Must use shared printSummaryInPlace helper');

  // Must include new tab external link
  assert.ok(previewFile.includes('ExternalLink'), 'Must render ExternalLink icon for new tab');
  assert.ok(previewFile.includes('/print/summary/${data.id}'), 'Must link to print page');
});

test('components/summary/summary-list.tsx and mobile-summary-client.tsx share printSummaryInPlace', () => {
  const listFile = fs.readFileSync(path.resolve('components/summary/summary-list.tsx'), 'utf8');
  const mobileFile = fs.readFileSync(path.resolve('components/mobile/mobile-summary-client.tsx'), 'utf8');
  assert.ok(listFile.includes('printSummaryInPlace'), 'SummaryList must delegate printing to printSummaryInPlace');
  assert.ok(mobileFile.includes('printSummaryInPlace'), 'MobileSummaryClient must delegate printing to printSummaryInPlace');
});
