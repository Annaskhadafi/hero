import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("email template preset registry covers stage 3 workflow templates", () => {
  const source = read("lib/email-template-presets.ts");

  assert.match(source, /templateCode: 'user_invitation'/);
  assert.match(source, /templateCode: 'onboarding_link'/);
  assert.match(source, /templateCode: 'leave_request_submitted'/);
  assert.match(source, /templateCode: 'leave_request_decision'/);
  assert.match(source, /templateCode: 'attendance_permission_decision'/);
  assert.match(source, /templateCode: 'overtime_assignment'/);
  assert.match(source, /templateCode: 'daily_activity_pending_approval'/);
  assert.match(source, /templateCode: 'offboarding_update'/);
  assert.match(source, /EMAIL_TEMPLATE_PRESET_MAP/);
});

test("email template settings panel exposes template table, feature column, test action and live preview", () => {
  const source = read("components/email-template-settings-panel.tsx");

  assert.match(source, /Email Template/);
  assert.match(source, /Fitur/);
  assert.match(source, /getTemplateFeature/);
  assert.match(source, /handleSendTest/);
  assert.match(source, /sendTemplateTestAction/);
  assert.match(source, /handleRestorePreset/);
  assert.match(source, /Reset ke Default/);
  assert.match(source, /Restore Default/);
  assert.match(source, /Sync Preset/);
  assert.match(source, /Live Preview/);
  assert.match(source, /renderTemplatePreview/);
  assert.match(source, /data-filter-origin/);
  assert.match(source, /data-filter-feature/);
  assert.match(source, /TableMultiFilter/);
});

test("email settings actions expose restore and sync preset operations", () => {
  const source = read("app/dashboard/settings/email/actions.ts");

  assert.match(source, /upsertEmailTemplateFromPreset/);
  assert.match(source, /restoreEmailTemplatePresetAction/);
  assert.match(source, /syncEmailTemplatePresetsAction/);
  assert.match(source, /Default preset .* berhasil dipulihkan/);
  assert.match(source, /Sync preset selesai/);
});

test("email settings page still mounts the template panel", () => {
  const source = read("app/dashboard/settings/email/page.tsx");

  assert.match(source, /<EmailTemplateSettingsPanel templates=\{templates\} \/>/);
});
