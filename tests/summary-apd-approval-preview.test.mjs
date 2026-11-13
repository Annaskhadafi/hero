import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('app/print/summary/[id]/page.tsx applies enlarged preview and generous table-signature separation in approval mode', () => {
  const printFile = fs.readFileSync(path.resolve('app/print/summary/[id]/page.tsx'), 'utf8');

  // Must detect approval mode
  assert.ok(printFile.includes("resolvedSearchParams?.from === 'approval'"), 'Must detect from=approval parameter');
  assert.ok(printFile.includes('const isApproval ='), 'Must define isApproval flag');

  // Must use enlarged sizing for approval mode
  assert.ok(printFile.includes("const thFontSize = isApproval ? '7.5pt' :"), 'Must enlarge header font size in approval');
  assert.ok(printFile.includes("const itemHeaderFontSize = isApproval ? '6.5pt' :"), 'Must enlarge item header font size in approval');
  assert.ok(printFile.includes("const qtyFontSize = isApproval ? '8pt' :"), 'Must enlarge quantity font size in approval');
  assert.ok(printFile.includes("const textFontSize = isApproval ? '7.8pt' :"), 'Must enlarge text font size in approval');
  assert.ok(printFile.includes("const rowHeight = isApproval ? '22px' :"), 'Must enlarge row height in approval');

  // Must enforce generous spacing between table and signatures
  assert.ok(printFile.includes("marginBottom: isApproval ? '28px' :"), 'Table must have generous 28px bottom margin in approval');
  assert.ok(printFile.includes("marginTop: isApproval ? '20px' :"), 'Signatures must have generous 20px top margin in approval');
  assert.ok(printFile.includes("borderTop: isApproval ? '1px dashed #cbd5e1' : undefined"), 'Must have separation border in approval');

  // Must wrap signatures in resolveUploadUrl
  assert.ok(printFile.includes("resolveUploadUrl(data.submitterSignatureUrl)"), 'Must resolve submitter signature URL');
  assert.ok(printFile.includes("resolveUploadUrl(appr.signatureUrl)"), 'Must resolve Level 1 signature URL');
  assert.ok(printFile.includes("resolveUploadUrl(deptHead.signatureUrl)"), 'Must resolve Dept Head signature URL');
});

test('components/approval-workbench.tsx enlarges Summary APD preview scale and separates dimensions', () => {
  const workbenchFile = fs.readFileSync(path.resolve('components/approval-workbench.tsx'), 'utf8');

  // Must enlarge Summary APD preview scale
  assert.ok(workbenchFile.includes("isSummaryDoc ? (viewMode === 'mobile' ? 0.65 : 0.92)"), 'Must enlarge summary scale to 0.92 on desktop');
  assert.ok(workbenchFile.includes("isSummaryDoc ? 285 : 210"), 'Must use 285mm height for summary sheet');

  // Must pass from=approval parameter to printUrl
  assert.ok(workbenchFile.includes("`/print/summary/${apdItem.activityId}?embed=1&from=approval`"), 'Must pass from=approval in batch review iframe');
  assert.ok(workbenchFile.includes("`/print/summary/${rawId}?embed=1&from=approval`"), 'Must pass from=approval in history link viewUrl');

  // Must properly detect summary item in click handlers
  assert.ok(workbenchFile.includes("isSummaryItem"), 'Must recognize SUMMARY category and apdSummaryId');
});

test('components/summary/apd-request-detail-modal.tsx passes from=approval and provides wide dialog', () => {
  const modalFile = fs.readFileSync(path.resolve('components/summary/apd-request-detail-modal.tsx'), 'utf8');

  assert.ok(modalFile.includes("`/print/summary/${requestId}?embed=1&from=approval`"), 'Modal must pass from=approval to summary print URL');
  assert.ok(modalFile.includes('max-w-7xl'), 'Modal must use max-w-7xl for wide comfortable reading');
  assert.ok(modalFile.includes('Dokumen Resmi Summary Permintaan APD (Gabungan Site)'), 'Modal must have distinct title for summary');
});
