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

test("email template settings panel exposes workflow registry and live preview", () => {
  const source = read("components/email-template-settings-panel.tsx");

  assert.match(source, /Workflow Template Registry/);
  assert.match(source, /EMAIL_TEMPLATE_PRESETS\.map/);
  assert.match(source, /handleOpenFromRegistry/);
  assert.match(source, /Reset ke Default/);
  assert.match(source, /Live Preview/);
  assert.match(source, /renderTemplatePreview/);
  assert.match(source, /data-filter-origin/);
  assert.match(source, /TableMultiFilter/);
});

test("email settings page still mounts the template panel", () => {
  const source = read("app/dashboard/settings/email/page.tsx");

  assert.match(source, /<EmailTemplateSettingsPanel templates=\{templates\} \/>/);
});
