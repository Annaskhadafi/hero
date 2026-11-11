import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('lib/summary-constants.ts defines SAFETY_SHOES_MASA_PAKAI_COL and presets', () => {
  const content = fs.readFileSync(path.resolve('lib/summary-constants.ts'), 'utf8');
  assert.match(content, /SAFETY_SHOES_MASA_PAKAI_COL\s*=\s*'Safety Shoes Masa Pakai'/);
  assert.match(content, /SAFETY_SHOES_MASA_PAKAI_PRESETS/);
  assert.match(content, /'1 Tahun 2 Bulan'/);
  assert.match(content, /safetyShoesMasaPakai\?: string/);
});

test('lib/summary-engine.ts handles Safety Shoes Masa Pakai and exports updateSummaryShoeUsagePeriod', () => {
  const content = fs.readFileSync(path.resolve('lib/summary-engine.ts'), 'utf8');
  assert.match(content, /safetyShoesMasaPakai\?: string/);
  assert.match(content, /itemName:\s*'Safety Shoes Masa Pakai'/);
  assert.match(content, /export async function updateSummaryShoeUsagePeriod/);
});

test('app/dashboard/summary/actions.ts exports updateSummaryShoeUsagePeriodAction', () => {
  const content = fs.readFileSync(path.resolve('app/dashboard/summary/actions.ts'), 'utf8');
  assert.match(content, /export async function updateSummaryShoeUsagePeriodAction/);
  assert.match(content, /updateSummaryShoeUsagePeriod/);
});

test('components/summary/summary-preview.tsx renders colSpan=3 and Masa Pakai column with inline editing', () => {
  const content = fs.readFileSync(path.resolve('components/summary/summary-preview.tsx'), 'utf8');
  assert.match(content, /colSpan=\{3\}>\{SAFETY_SHOES_COL\}/);
  assert.match(content, /<th[^>]*>Masa Pakai<\/th>/);
  assert.match(content, /handleMasaPakaiChange/);
  assert.match(content, /Safety Shoes Masa Pakai/);
  assert.match(content, /masa-pakai-presets-preview/);
});

test('app/print/summary/[id]/page.tsx renders colSpan=3 and Masa Pakai subcolumn for print/PDF', () => {
  const content = fs.readFileSync(path.resolve('app/print/summary/[id]/page.tsx'), 'utf8');
  assert.match(content, /colSpan=\{3\}>\{SAFETY_SHOES_COL\}/);
  assert.match(content, /<th[^>]*>Masa Pakai<\/th>/);
  assert.match(content, /Safety Shoes Masa Pakai/);
});

test('components/summary/summary-generator-modal.tsx includes Masa Pakai column and datalist presets', () => {
  const content = fs.readFileSync(path.resolve('components/summary/summary-generator-modal.tsx'), 'utf8');
  assert.match(content, /shoeMasaPakaiMap/);
  assert.match(content, /manualShoeMasaPakai/);
  assert.match(content, /<th[^>]*>Masa Pakai<\/th>/);
  assert.match(content, /SAFETY_SHOES_MASA_PAKAI_PRESETS/);
  assert.match(content, /id="masa-pakai-presets"/);
});
