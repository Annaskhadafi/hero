import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('app/dashboard/quality/5r/actions.ts deleteFiveRReportAction deletes findings, approval logs, approvals and reports', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/quality/5r/actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert.ok(content.includes('export async function deleteFiveRReportAction'), 'Must export deleteFiveRReportAction');
  assert.ok(content.includes('await db.delete(fiveRFindings).where(eq(fiveRFindings.reportId, reportId))'), 'Must delete fiveRFindings');
  assert.ok(content.includes('await db.delete(fiveRApprovalLogs).where(eq(fiveRApprovalLogs.reportId, reportId))'), 'Must delete fiveRApprovalLogs');
  assert.ok(content.includes('await db.delete(approvals).where(eq(approvals.fiveRReportId, reportId))'), 'Must delete approvals');
  assert.ok(content.includes('await db.delete(fiveRReports).where(eq(fiveRReports.id, reportId))'), 'Must delete fiveRReports');
});

test('components/five-r/five-r-list.tsx renders Delete button in table rows and connects to deleteFiveRReportAction', () => {
  const listPath = path.join(process.cwd(), 'components/five-r/five-r-list.tsx');
  const content = fs.readFileSync(listPath, 'utf8');

  assert.ok(content.includes('deleteFiveRReportAction'), 'Must import deleteFiveRReportAction');
  assert.ok(content.includes('handleDeleteReport'), 'Must define handleDeleteReport');
  assert.ok(content.includes('title="Hapus Laporan 5R"'), 'Must render Delete button with tooltip');
  assert.ok(content.includes('<Trash2'), 'Must render Trash2 icon');
});

test('components/five-r/five-r-detail-dialog.tsx renders Delete button and connects to deleteFiveRReportAction', () => {
  const dialogPath = path.join(process.cwd(), 'components/five-r/five-r-detail-dialog.tsx');
  const content = fs.readFileSync(dialogPath, 'utf8');

  assert.ok(content.includes('deleteFiveRReportAction'), 'Must import deleteFiveRReportAction');
  assert.ok(content.includes('handleDeleteReport'), 'Must define handleDeleteReport');
  assert.ok(content.includes('Hapus Laporan'), 'Must render Hapus Laporan button');
});

test('components/mobile/mobile-five-r-client.tsx renders Delete button on report cards and connects to deleteFiveRReportAction', () => {
  const mobilePath = path.join(process.cwd(), 'components/mobile/mobile-five-r-client.tsx');
  const content = fs.readFileSync(mobilePath, 'utf8');

  assert.ok(content.includes('deleteFiveRReportAction'), 'Must import deleteFiveRReportAction');
  assert.ok(content.includes('handleDelete(r.id'), 'Must invoke handleDelete on click');
  assert.ok(content.includes('title="Hapus Laporan"'), 'Must render Delete button on mobile cards');
});