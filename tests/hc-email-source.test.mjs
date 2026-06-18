import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("human capital notification config exists in schema and admin getter", () => {
  const schemaSource = read("db/schema/hero.ts");
  const adminSource = read("lib/hero-admin.ts");
  const helperSource = read("lib/human-capital-email.ts");

  assert.match(schemaSource, /hero_hc_notification_config/);
  assert.match(adminSource, /getHumanCapitalNotificationConfigData/);
  assert.match(helperSource, /sendHumanCapitalEmail/);
  assert.match(helperSource, /getHumanCapitalConfiguredRecipients/);
});

test("email settings page exposes Human Capital recipients panel", () => {
  const pageSource = read("app/dashboard/settings/email/page.tsx");
  const panelSource = read("components/human-capital-notification-settings-panel.tsx");
  const actionSource = read("app/dashboard/settings/email/actions.ts");

  assert.match(pageSource, /HumanCapitalNotificationSettingsPanel/);
  assert.match(pageSource, /TabsTrigger value="hc"/);
  assert.match(panelSource, /Human Capital Recipients/);
  assert.match(panelSource, /Simpan Pengaturan Human Capital/);
  assert.match(actionSource, /saveHumanCapitalNotificationConfigAction/);
});

test("human capital workflows are wired to email notifications", () => {
  const employeeSource = read("app/actions/employee.ts");
  const disciplinarySource = read("app/actions/disciplinary.ts");
  const performanceSource = read("app/actions/performance.ts");

  assert.match(employeeSource, /templateCode: "hc_employee_created"/);
  assert.match(employeeSource, /templateCode: "hc_employee_updated"/);
  assert.match(disciplinarySource, /templateCode: "hc_disciplinary_created"/);
  assert.match(disciplinarySource, /templateCode: "hc_disciplinary_status_update"/);
  assert.match(performanceSource, /templateCode: "hc_performance_review_created"/);
  assert.match(performanceSource, /templateCode: "hc_performance_review_submitted"/);
  assert.match(performanceSource, /templateCode: "hc_performance_review_acknowledged"/);
});

test("existing HC email flows now inherit global HC recipient policy", () => {
  const helperSource = read("lib/human-capital-email.ts");
  const recruitmentSource = read("app/actions/recruitment.ts");
  const mcuSource = read("app/actions/mcu.ts");
  const contractReviewSource = read("app/actions/contract-review.ts");

  assert.match(helperSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(recruitmentSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(recruitmentSource, /cc: hcPolicyCc/);
  assert.match(mcuSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(mcuSource, /cc: hcPolicyCc/);
  assert.match(contractReviewSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(contractReviewSource, /cc: hcPolicyCc/);
});

test("human capital templates are included in seed and preset registries", () => {
  const seedSource = read("lib/hero-admin.ts");
  const presetSource = read("lib/email-template-presets.ts");

  for (const code of [
    "hc_employee_created",
    "hc_employee_updated",
    "hc_disciplinary_created",
    "hc_disciplinary_status_update",
    "hc_performance_review_created",
    "hc_performance_review_submitted",
    "hc_performance_review_acknowledged",
  ]) {
    assert.match(seedSource, new RegExp(`templateCode: '${code}'`));
    assert.match(presetSource, new RegExp(`templateCode: '${code}'`));
  }
});
