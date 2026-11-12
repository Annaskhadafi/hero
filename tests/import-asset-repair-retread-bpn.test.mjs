import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadWorkbookAssets,
  parseExcelAssetDate,
} from '../scripts/import-asset-repair-retread-bpn.ts';

test('parseExcelAssetDate parses D-MMM-YY strings cleanly and returns null for dash/empty', () => {
  const oct2011 = parseExcelAssetDate('20-Oct-11');
  assert.ok(oct2011 instanceof Date);
  assert.equal(oct2011.toISOString().slice(0, 10), '2011-10-20');

  const jan2007 = parseExcelAssetDate('1-Jan-07');
  assert.ok(jan2007 instanceof Date);
  assert.equal(jan2007.toISOString().slice(0, 10), '2007-01-01');

  assert.equal(parseExcelAssetDate('-'), null);
  assert.equal(parseExcelAssetDate(''), null);
});

test('loadWorkbookAssets loads all 82 Repair / Retread Operation rows mapped to Balikpapan', () => {
  const items = loadWorkbookAssets();
  assert.equal(items.length, 82);
  assert.ok(items.every((item) => item.workSection === 'Repair / Retread Operation'));
  assert.ok(items.every((item) => item.location === 'Balikpapan'));
  assert.ok(items.every((item) => item.condition === 'ACTIVE'));

  const first = items[0];
  assert.equal(first.description, 'Workshop retread Kariangau');
  assert.equal(first.assetNumber, '10000003');
  assert.equal(first.purchaseDate?.toISOString().slice(0, 10), '2011-10-20');
});

