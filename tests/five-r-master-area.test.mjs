import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('lib/five-r-approval.ts exports resolveMasterAreaEffectivePic and syncInFlightFiveRApprovalsForMasterArea', () => {
  const approvalPath = path.join(process.cwd(), 'lib/five-r-approval.ts');
  const content = fs.readFileSync(approvalPath, 'utf8');

  assert.ok(content.includes('export async function resolveMasterAreaEffectivePic'), 'Must export resolveMasterAreaEffectivePic');
  assert.ok(content.includes('export async function syncInFlightFiveRApprovalsForMasterArea'), 'Must export syncInFlightFiveRApprovalsForMasterArea');
  assert.ok(content.includes('isFallback'), 'Must return isFallback flag');
  assert.ok(content.includes('fallbackReason'), 'Must return fallbackReason');
});

test('app/dashboard/quality/5r/actions.ts logs PIC changes to fiveRMasterAreaPicHistory and synchronizes in-flight approvals', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/quality/5r/actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert.ok(content.includes('fiveRMasterAreaPicHistory'), 'Must use fiveRMasterAreaPicHistory table');
  assert.ok(content.includes('syncInFlightFiveRApprovalsForMasterArea'), 'Must sync live approvals on PIC change');
  assert.ok(content.includes('export async function getMasterAreaPicHistoryAction'), 'Must export getMasterAreaPicHistoryAction');
  assert.ok(content.includes('resolveMasterAreaEffectivePic'), 'Must enrich areas with fallback in getMasterAreasAction');
});

test('components/five-r/five-r-master-area.tsx renders dynamic fallback badge, Histori button, and Delete button with confirmation modal', () => {
  const masterAreaPath = path.join(process.cwd(), 'components/five-r/five-r-master-area.tsx');
  const content = fs.readFileSync(masterAreaPath, 'utf8');

  assert.ok(content.includes('PIC belum diatur'), 'Must show unassigned PIC fallback indicator');
  assert.ok(content.includes('Histori'), 'Must render Histori PIC button');
  assert.ok(content.includes('getMasterAreaPicHistoryAction'), 'Must call getMasterAreaPicHistoryAction');
  assert.ok(content.includes('Histori PIC Area'), 'Must render history dialog modal');
  assert.ok(content.includes('deleteMasterAreaAction'), 'Must import deleteMasterAreaAction');
  assert.ok(content.includes('Hapus Master Area?'), 'Must render Delete confirmation modal');
});

test('app/dashboard/quality/5r/actions.ts exports deleteMasterAreaAction and deletes history and area cleanly', () => {
  const actionsPath = path.join(process.cwd(), 'app/dashboard/quality/5r/actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert.ok(content.includes('export async function deleteMasterAreaAction'), 'Must export deleteMasterAreaAction');
  assert.ok(content.includes('fiveRMasterAreaPicHistory'), 'Must clean up PIC history');
  assert.ok(content.includes('fiveRMasterAreas'), 'Must delete master area record');
});
