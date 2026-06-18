import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("hse safety notification config exists in schema and admin getter", () => {
  const schemaSource = read("db/schema/hero.ts");
  const adminSource = read("lib/hero-admin.ts");
  const helperSource = read("lib/hse-safety-email.ts");

  assert.match(schemaSource, /hero_hse_safety_notification_config/);
  assert.match(schemaSource, /recipientEmails/);
  assert.match(adminSource, /getHseSafetyNotificationConfigData/);
  assert.match(helperSource, /sendHseSafetyEmail/);
  assert.match(helperSource, /resolveHseSafetyRecipients/);
});

test("email settings page exposes HSE Safety recipients panel", () => {
  const pageSource = read("app/dashboard/settings/email/page.tsx");
  const panelSource = read("components/hse-safety-notification-settings-panel.tsx");
  const actionSource = read("app/dashboard/settings/email/actions.ts");

  assert.match(pageSource, /HseSafetyNotificationSettingsPanel/);
  assert.match(pageSource, /TabsTrigger value="hse"/);
  assert.match(panelSource, /HSE Safety Recipients/);
  assert.match(panelSource, /Simpan Pengaturan HSE Safety/);
  assert.match(actionSource, /saveHseSafetyNotificationConfigAction/);
});

test("stage 5 wires HSE workflows to email notifications", () => {
  const observationSource = read("app/actions/hse.ts");
  const inspectionSource = read("app/actions/safety-inspections.ts");
  const inductionSource = read("app/actions/safety-induction.ts");
  const inventorySource = read("app/actions/hse-inventaris.ts");
  const adminOpsSource = read("app/dashboard/admin-actions.ts");
  const incidentReportSource = read("app/dashboard/hse/incident-report/actions.ts");

  assert.match(observationSource, /templateCode: "hse_observation_alert"/);
  assert.match(observationSource, /templateCode: "hse_incident_alert"/);
  assert.match(observationSource, /cc: configured\.cc/);
  assert.match(inspectionSource, /templateCode: "hse_safety_inspection_created"/);
  assert.match(inspectionSource, /templateCode: "hse_safety_inspection_status_update"/);
  assert.match(inductionSource, /templateCode: 'hse_safety_induction_submitted'/);
  assert.match(inventorySource, /templateCode: "hse_inventory_reminder"/);
  assert.match(adminOpsSource, /templateCode: 'hse_observation_alert'/);
  assert.match(adminOpsSource, /templateCode: 'hse_incident_status_update'/);
  assert.match(incidentReportSource, /templateCode: 'hse_incident_record_created'/);
  assert.match(incidentReportSource, /templateCode: 'hse_incident_record_status_update'/);
});

test("hse templates are included in seed and preset registries", () => {
  const seedSource = read("lib/hero-admin.ts");
  const presetSource = read("lib/email-template-presets.ts");

  for (const code of [
    "hse_observation_alert",
    "hse_observation_status_update",
    "hse_incident_alert",
    "hse_incident_status_update",
    "hse_incident_record_created",
    "hse_incident_record_status_update",
    "hse_safety_inspection_created",
    "hse_safety_inspection_status_update",
    "hse_safety_induction_submitted",
    "hse_inventory_reminder",
  ]) {
    assert.match(seedSource, new RegExp(`templateCode: '${code}'`));
    assert.match(presetSource, new RegExp(`templateCode: '${code}'`));
  }
});
