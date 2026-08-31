import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

test('SOP & WIN Approval Workbench - Schema, Actions & UI Contract Parity', () => {
  // 1. Verify DB Schema includes sopWinApprovals
  const schemaPath = join(projectRoot, 'db', 'schema', 'hero.ts');
  assert.ok(existsSync(schemaPath), 'db/schema/hero.ts must exist');
  const schemaContent = readFileSync(schemaPath, 'utf8');

  assert.match(
    schemaContent,
    /export const sopWinApprovals = pgTable\(/,
    'hero.ts must export sopWinApprovals table definition'
  );
  assert.match(
    schemaContent,
    /'hero_sop_win_approvals'/,
    'sopWinApprovals must target hero_sop_win_approvals table'
  );

  // 2. Verify Server Actions
  const actionsPath = join(projectRoot, 'app', 'dashboard', 'sop-win', 'actions.ts');
  assert.ok(existsSync(actionsPath), 'app/dashboard/sop-win/actions.ts must exist');
  const actionsContent = readFileSync(actionsPath, 'utf8');

  assert.match(actionsContent, /export async function getSopWinApprovalsAction/, 'Must export getSopWinApprovalsAction');
  assert.match(actionsContent, /export async function approveSopWinDocumentAction/, 'Must export approveSopWinDocumentAction');
  assert.match(actionsContent, /export async function revertSopWinDocumentAction/, 'Must export revertSopWinDocumentAction');
  assert.match(actionsContent, /export async function rejectSopWinDocumentAction/, 'Must export rejectSopWinDocumentAction');
  assert.match(actionsContent, /export async function sendSopWinReminderAction/, 'Must export sendSopWinReminderAction');
  assert.match(actionsContent, /export async function batchApproveSopWinDocumentsAction/, 'Must export batchApproveSopWinDocumentsAction');

  // 3. Verify Component
  const workspacePath = join(projectRoot, 'components', 'sop-win', 'sop-win-approval-workspace.tsx');
  assert.ok(existsSync(workspacePath), 'components/sop-win/sop-win-approval-workspace.tsx must exist');
  const workspaceContent = readFileSync(workspacePath, 'utf8');

  assert.match(workspaceContent, /export function SopWinApprovalWorkspace/, 'Must export SopWinApprovalWorkspace component');
  assert.match(workspaceContent, /Tinjau & Approve|Tinjau dan Approve/, 'Must include Tinjau & Approve interactive review workbench button');
  assert.match(workspaceContent, /Catatan Approval \(Opsional\)/, 'Must include Remarks input');
  assert.match(workspaceContent, /DEPARTEMEN/, 'Must include Department Folder Filter Sidebar');
  assert.match(workspaceContent, /APPROVE/, 'Must include APPROVE button');
  assert.match(workspaceContent, /EXCEL/, 'Must include Excel action button');
  assert.match(workspaceContent, /ZIP/, 'Must include ZIP action button');

  // 4. Verify Page Navbar Tab
  const pagePath = join(projectRoot, 'app', 'dashboard', 'sop-win', 'page.tsx');
  assert.ok(existsSync(pagePath), 'app/dashboard/sop-win/page.tsx must exist');
  const pageContent = readFileSync(pagePath, 'utf8');

  assert.match(pageContent, /value="approval"/, 'page.tsx must include value="approval" tab');
  assert.match(pageContent, /Approval Dokumen SOP & WIN/, 'page.tsx navbar tab label must be Approval Dokumen SOP & WIN');
  assert.match(pageContent, /<SopWinApprovalWorkspace/, 'page.tsx must render SopWinApprovalWorkspace');
});
