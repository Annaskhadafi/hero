import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('app/dashboard/summary/actions.ts exports getAvailableEmployeesForSummaryAction querying hero_employees', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/summary/actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert.ok(
    content.includes('export async function getAvailableEmployeesForSummaryAction'),
    'Must export getAvailableEmployeesForSummaryAction'
  );
  assert.ok(
    content.includes('from(employees)') && content.includes('employeeAssets'),
    'Must query from employees (hero_employees) and employeeAssets for safety shoes size'
  );
});

test('lib/summary-engine.ts generateSummary supports manualEntries and creates apdRequests with status proses_order', () => {
  const enginePath = path.join(process.cwd(), 'lib/summary-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf8');

  assert.ok(
    content.includes('manualEntries?: ManualSummaryEntry[]'),
    'GenerateSummaryOptions must accept manualEntries'
  );
  assert.ok(
    content.includes("status: 'proses_order'") && content.includes('insert(apdRequests)'),
    'generateSummary must insert apdRequests with status proses_order for manual entries'
  );
  assert.ok(
    content.includes('insert(apdRequestItems)'),
    'generateSummary must insert apdRequestItems for manual entries'
  );
  assert.ok(
    content.includes('insert(apdSummaryItems)'),
    'generateSummary must insert apdSummaryItems for manual entries'
  );
});

test('components/summary/summary-generator-modal.tsx includes UI to add manual employees', () => {
  const modalPath = path.join(process.cwd(), 'components/summary/summary-generator-modal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');

  assert.ok(
    content.includes('Tambah Karyawan Manual'),
    'Must have Tambah Karyawan Manual button'
  );
  assert.ok(
    content.includes('getAvailableEmployeesForSummaryAction'),
    'Must load available employees for manual addition'
  );
  assert.ok(
    content.includes('MANUAL'),
    'Must display MANUAL badge on manual rows'
  );
  assert.ok(
    content.includes('manualEntriesPayload'),
    'Must pass manualEntriesPayload to generateSummaryAction'
  );
});
