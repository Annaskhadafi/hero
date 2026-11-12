import fs from 'fs';
import path from 'path';

describe('Summary APD Revisi -> Edit -> Submit Ulang flow (tanpa hapus summary)', () => {
  test('regenerateSummaryItems preserves revisi status instead of downgrading to draft', () => {
    const engineSource = fs.readFileSync(path.join(process.cwd(), 'lib/summary-engine.ts'), 'utf8');
    expect(engineSource).toContain("const preservedStatus = summary.status === 'revisi' ? 'revisi' : 'draft';");
    expect(engineSource).toContain('status: preservedStatus,');
  });

  test('getPendingRequestsForSection and collectSummaryItems include existing edited summary requests regardless of section/site/date changes', () => {
    const engineSource = fs.readFileSync(path.join(process.cwd(), 'lib/summary-engine.ts'), 'utf8');
    expect(engineSource).toContain('or(baseFilter, inArray(apdRequests.id, existingIds))');
    expect(engineSource).toContain('or(baseCollectWhere, inArray(apdRequests.id, explicitSelectedIds))');
  });

  test('SummaryPreview exposes Edit button and SummaryGeneratorModal for draft and revisi summaries', () => {
    const previewSource = fs.readFileSync(
      path.join(process.cwd(), 'components/summary/summary-preview.tsx'),
      'utf8'
    );
    expect(previewSource).toContain('SummaryGeneratorModal');
    expect(previewSource).toContain('showEditModal');
    expect(previewSource).toContain("data.status === 'draft' || data.status === 'revisi'");
    expect(previewSource).toContain('<span>Edit</span>');
    expect(previewSource).toContain("Tanda Tangan & Submit Ulang");
  });

  test('SummaryList and MobileSummaryClient both expose Edit button for revisi and draft summaries', () => {
    const desktopList = fs.readFileSync(
      path.join(process.cwd(), 'components/summary/summary-list.tsx'),
      'utf8'
    );
    const mobileList = fs.readFileSync(
      path.join(process.cwd(), 'components/mobile/mobile-summary-client.tsx'),
      'utf8'
    );
    expect(desktopList).toContain("section.summaryStatus === 'revisi' || section.summaryStatus === 'draft'");
    expect(mobileList).toContain("section.summaryStatus === 'revisi' || section.summaryStatus === 'draft'");
    expect(mobileList).toContain("key: 'revisi', label: 'Perlu Revisi'");
  });
});

