import fs from 'fs';
import path from 'path';
import { filterSelectedRequestItems } from '@/lib/summary-constants';

describe('Summary APD per-item selection (Admin pilih APD yang di-ACC)', () => {
  test('filterSelectedRequestItems preserves all items when selectedItemIds is undefined', () => {
    const items = [
      { id: 1, canonicalName: 'Apron' },
      { id: 2, canonicalName: 'Safety Shoes' },
    ];
    expect(filterSelectedRequestItems(items, undefined)).toEqual(items);
  });

  test('filterSelectedRequestItems filters strictly to selectedItemIds when provided', () => {
    const items = [
      { id: 10, canonicalName: 'Apron' },
      { id: 20, canonicalName: 'Safety Shoes' },
      { id: 30, canonicalName: 'Masker' },
    ];
    expect(filterSelectedRequestItems(items, [10, 30])).toEqual([
      { id: 10, canonicalName: 'Apron' },
      { id: 30, canonicalName: 'Masker' },
    ]);
    expect(filterSelectedRequestItems(items, [])).toEqual([]);
  });

  test('lib/summary-engine.ts shares collectSummaryItems across generateSummary and regenerateSummaryItems with selectedItemIds filtering', () => {
    const engineSource = fs.readFileSync(path.join(process.cwd(), 'lib/summary-engine.ts'), 'utf8');
    expect(engineSource).toContain('async function collectSummaryItems(');
    expect(engineSource).toContain('filterSelectedRequestItems(rawItems, customOpt?.selectedItemIds)');
    expect(engineSource).toContain('excludeSummaryId?: number');
    expect(engineSource).toContain('preselectedItemIds');
    expect(engineSource).toContain('isIncludedInEditedSummary');
  });

  test('SummaryGeneratorModal supports per-item APD checkboxes, live totals, edit preselection, and selectedItemIds payload', () => {
    const modalSource = fs.readFileSync(
      path.join(process.cwd(), 'components/summary/summary-generator-modal.tsx'),
      'utf8'
    );
    expect(modalSource).toContain('selectedItemIdsMap');
    expect(modalSource).toContain('toggleRequestItem');
    expect(modalSource).toContain('selectedItemIds: selectedItemIdsArray');
    expect(modalSource).toContain('apd-item-chip-');
    expect(modalSource).toContain('item di-ACC');
  });

  test('summary-list.tsx exposes Edit button for both draft and revisi summaries', () => {
    const listSource = fs.readFileSync(
      path.join(process.cwd(), 'components/summary/summary-list.tsx'),
      'utf8'
    );
    expect(listSource).toContain("section.summaryStatus === 'revisi' || section.summaryStatus === 'draft'");
  });
});

