import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('lib/summary-engine.ts implements revision, rejection, item removal, and tracks revisi status', () => {
  const enginePath = path.join(process.cwd(), 'lib/summary-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf8');

  assert.ok(
    content.includes('export async function returnSummaryForRevision'),
    'Must export returnSummaryForRevision'
  );
  assert.ok(
    content.includes('export async function rejectSummary'),
    'Must export rejectSummary'
  );
  assert.ok(
    content.includes('export async function removeItemFromSummary'),
    'Must export removeItemFromSummary'
  );
  assert.ok(
    content.includes("status: 'revisi'") && content.includes("status: 'needs_correction'"),
    'returnSummaryForRevision must set apdSummaries status to revisi and approvals to needs_correction'
  );
  assert.ok(
    content.includes("['draft', 'pending', 'approved', 'revisi']"),
    'Must track active summaries including revisi to prevent duplicate unassigned requests'
  );
});

test('app/dashboard/admin-actions.ts delegates needs_correction for Summary APD to returnSummaryForRevision', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/admin-actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert.ok(
    content.includes('returnSummaryForRevision') && content.includes("params.decision === 'needs_correction'"),
    'Must call returnSummaryForRevision when decision is needs_correction'
  );
  assert.ok(
    content.includes('rejectSummary') && content.includes('approval.apdSummaryId != null'),
    'Must call rejectSummary when decision is rejected for summary APD'
  );
});

test('app/dashboard/summary/actions.ts exports revise, reject, and removeItem actions with revalidation', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/summary/actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert.ok(
    content.includes('export async function reviseSummaryAction'),
    'Must export reviseSummaryAction'
  );
  assert.ok(
    content.includes('export async function rejectSummaryAction'),
    'Must export rejectSummaryAction'
  );
  assert.ok(
    content.includes('export async function removeItemFromSummaryAction'),
    'Must export removeItemFromSummaryAction'
  );
});

test('components/summary/summary-preview.tsx displays revision banner, re-submit button, and row removal', () => {
  const previewPath = path.join(process.cwd(), 'components/summary/summary-preview.tsx');
  const content = fs.readFileSync(previewPath, 'utf8');

  assert.ok(
    content.includes("data.status === 'revisi'") && content.includes('Dokumen Summary Memerlukan Revisi'),
    'Must show revision notice banner when status is revisi'
  );
  assert.ok(
    content.includes('Catatan Revisi dari Approver'),
    'Must display the approver revision note prominently'
  );
  assert.ok(
    content.includes('Tanda Tangan & Submit Ulang'),
    'Must provide Tanda Tangan & Submit Ulang button when status is revisi'
  );
  assert.ok(
    content.includes('removeItemFromSummaryAction') || content.includes('handleRemoveItem'),
    'Must provide row removal when status is draft or revisi'
  );
});

test('components/summary/summary-list.tsx includes revisi and rejected badges and filter options', () => {
  const listPath = path.join(process.cwd(), 'components/summary/summary-list.tsx');
  const content = fs.readFileSync(listPath, 'utf8');

  assert.ok(
    content.includes("case 'revisi':") && content.includes('Perlu Revisi'),
    'Must include Perlu Revisi badge'
  );
  assert.ok(
    content.includes('<option value="revisi">Perlu Revisi</option>'),
    'Must include Perlu Revisi option in filter'
  );
  assert.ok(
    content.includes('<option value="rejected">Ditolak</option>'),
    'Must include Ditolak option in filter'
  );
});

test('lib/summary-email.ts exports sendSummaryReturnedEmail', () => {
  const emailPath = path.join(process.cwd(), 'lib/summary-email.ts');
  const content = fs.readFileSync(emailPath, 'utf8');

  assert.ok(
    content.includes('export async function sendSummaryReturnedEmail'),
    'Must export sendSummaryReturnedEmail'
  );
});
