import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('lib/summary-engine.ts getSectionsWithApprovedRequests calculates latestActivityAt including newest approved requests and sorts descending', () => {
  const enginePath = path.join(process.cwd(), 'lib/summary-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf8');

  assert.ok(
    content.includes('latestReqAt: sql<Date | null>`MAX(COALESCE(${apdRequests.updatedAt}, ${apdRequests.createdAt}))`'),
    'getSectionsWithApprovedRequests must query latestReqAt from apdRequests'
  );

  assert.ok(
    content.includes('latestActivityAt = new Date(Math.max(new Date(summaryTime).getTime(), reqTime.getTime()))'),
    'getSectionsWithApprovedRequests must calculate latestActivityAt from the max of summary and request timestamps'
  );

  assert.ok(
    content.includes('const aNeedsGen = (!a.summaryStatus && a.approvedCount > 0) ? 1 : 0;') &&
    content.includes('if (bNeedsGen !== aNeedsGen) return bNeedsGen - aNeedsGen;'),
    'getSectionsWithApprovedRequests must prioritize sections with uncreated approved requests at the very top'
  );

  assert.ok(
    content.includes('if (bTime !== aTime) return bTime - aTime;'),
    'getSectionsWithApprovedRequests must sort sections descending by latestActivityAt'
  );
});

test('lib/summary-engine.ts getPendingRequestsForSection sorts eligible approved requests newest first (updatedAt DESC, id DESC)', () => {
  const enginePath = path.join(process.cwd(), 'lib/summary-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf8');

  assert.ok(
    content.includes('.orderBy(desc(apdRequests.updatedAt), desc(apdRequests.id))'),
    'getPendingRequestsForSection and generateSummary must order approved requests by updatedAt DESC, id DESC'
  );
});

test('components/summary/summary-generator-modal.tsx renders dynamic 1-based index (idx + 1) for sorted approved requests', () => {
  const modalPath = path.join(process.cwd(), 'components/summary/summary-generator-modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');

  assert.ok(
    content.includes('{idx + 1}'),
    'SummaryGeneratorModal must render {idx + 1} for dynamic row numbers'
  );
});

test('components/summary/summary-list.tsx renders dynamic 1-based index (idx + 1) for sorted summary list and Excel export', () => {
  const listPath = path.join(process.cwd(), 'components/summary/summary-list.tsx');
  const content = fs.readFileSync(listPath, 'utf8');

  assert.ok(
    content.includes('{idx + 1}'),
    'SummaryList must render {idx + 1} in table row number column'
  );

  assert.ok(
    content.includes('No: idx + 1'),
    'SummaryList Excel export must use dynamic idx + 1'
  );
});

test('lib/summary-engine.ts getSummaryDetails resolves sectionName to Service Operation for combined service summary', () => {
  const enginePath = path.join(process.cwd(), 'lib/summary-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf8');

  assert.ok(
    content.includes("const resolvedSectionName = isServiceCombined ? 'Service Operation' : summary.sectionName;"),
    'getSummaryDetails must resolve sectionName to Service Operation for combined service sections'
  );
});
