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

test('components/summary/summary-preview.tsx provides direct print styling and calibrated iframe dimensions', () => {
  const previewFile = fs.readFileSync(path.resolve('components/summary/summary-preview.tsx'), 'utf8');

  // Must include A4 landscape @page rule
  assert.ok(previewFile.includes('size: A4 landscape;'), 'Must specify exact A4 landscape size');
  assert.ok(previewFile.includes('#summary-document-printable'), 'Must assign printable document id');

  // Must configure iframe with real A4 landscape dimensions
  assert.ok(previewFile.includes("iframe.style.width = '297mm'"), 'Iframe width must be 297mm');
  assert.ok(previewFile.includes("iframe.style.height = '210mm'"), 'Iframe height must be 210mm');

  // Must include new tab external link
  assert.ok(previewFile.includes('ExternalLink'), 'Must render ExternalLink icon for new tab');
  assert.ok(previewFile.includes('/print/summary/${data.id}'), 'Must link to print page');
});

test('components/summary/summary-list.tsx uses calibrated iframe print viewport', () => {
  const listFile = fs.readFileSync(path.resolve('components/summary/summary-list.tsx'), 'utf8');
  assert.ok(listFile.includes("iframe.style.width = '297mm'"), 'Iframe width in list must be 297mm');
  assert.ok(listFile.includes("iframe.style.height = '210mm'"), 'Iframe height in list must be 210mm');
});
