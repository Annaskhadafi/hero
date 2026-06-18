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
  const interviewsSource = read("app/actions/interviews.ts");
  const testGroupSource = read("app/actions/test-group.ts");
  const recruitmentTestsSource = read("app/actions/recruitment-tests.ts");
  const recruitmentSource = read("app/actions/recruitment.ts");
  const onboardingSource = read("app/actions/onboarding.ts");
  const offeringSource = read("app/actions/offering.ts");

  assert.match(employeeSource, /templateCode: "hc_employee_created"/);
  assert.match(employeeSource, /templateCode: "hc_employee_updated"/);
  assert.match(disciplinarySource, /templateCode: "hc_disciplinary_created"/);
  assert.match(disciplinarySource, /templateCode: "hc_disciplinary_status_update"/);
  assert.match(performanceSource, /templateCode: "hc_performance_review_created"/);
  assert.match(performanceSource, /templateCode: "hc_performance_review_submitted"/);
  assert.match(performanceSource, /templateCode: "hc_performance_review_acknowledged"/);
  assert.match(interviewsSource, /templateCode: "interview_invitation"/);
  assert.match(testGroupSource, /templateCode: "test_assigned"/);
  assert.match(recruitmentTestsSource, /templateCode: "test_assigned"/);
  assert.match(recruitmentSource, /templateCode: "application_received"/);
  assert.match(onboardingSource, /templateCode: "onboarding_link"/);
  assert.match(offeringSource, /templateCode: "offering_letter"/);
});

test("existing HC email flows now inherit global HC recipient policy", () => {
  const helperSource = read("lib/human-capital-email.ts");
  const recruitmentSource = read("app/actions/recruitment.ts");
  const mcuSource = read("app/actions/mcu.ts");
  const contractReviewSource = read("app/actions/contract-review.ts");
  const interviewsSource = read("app/actions/interviews.ts");
  const testGroupSource = read("app/actions/test-group.ts");
  const recruitmentTestsSource = read("app/actions/recruitment-tests.ts");

  assert.match(helperSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(recruitmentSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(recruitmentSource, /cc: resolvedTemplate\.ccList/);
  assert.match(interviewsSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(interviewsSource, /cc: resolvedTemplate\.ccList/);
  assert.match(mcuSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(mcuSource, /cc: resolvedClinicTemplate\.ccList/);
  assert.match(mcuSource, /cc: resolvedCandidateTemplate\.ccList/);
  assert.match(testGroupSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(testGroupSource, /cc: resolvedTemplate\.ccList/);
  assert.match(recruitmentTestsSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(recruitmentTestsSource, /cc: resolvedTemplate\.ccList/);
  assert.match(contractReviewSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(contractReviewSource, /cc: resolvedTemplate\.ccList/);
  assert.match(contractReviewSource, /templateCode: 'contract_review_reminder'/);
});

test("legacy HC flows now support central workflow template overrides", () => {
  const recruitmentSource = read("app/actions/recruitment.ts");
  const mcuSource = read("app/actions/mcu.ts");
  const contractReviewSource = read("app/actions/contract-review.ts");
  const interviewsSource = read("app/actions/interviews.ts");
  const testGroupSource = read("app/actions/test-group.ts");
  const recruitmentTestsSource = read("app/actions/recruitment-tests.ts");
  const onboardingSource = read("app/actions/onboarding.ts");
  const offeringSource = read("app/actions/offering.ts");
  const workflowSource = read("lib/workflow-email.ts");

  assert.match(workflowSource, /export async function resolveWorkflowTemplateContent/);
  assert.match(recruitmentSource, /resolveWorkflowTemplateContent/);
  assert.match(recruitmentSource, /templateCode: "application_received"/);
  assert.match(recruitmentSource, /templateCode: "hired_email"/);
  assert.match(recruitmentSource, /templateCode: "start_date_email"/);
  assert.match(recruitmentSource, /templateCode: "custom_bulk"/);
  assert.match(interviewsSource, /resolveWorkflowTemplateContent/);
  assert.match(interviewsSource, /templateCode: "interview_invitation"/);
  assert.match(mcuSource, /resolveWorkflowTemplateContent/);
  assert.match(mcuSource, /templateCode: "mcu_pengantar"/);
  assert.match(mcuSource, /templateCode: "mcu_invitation"/);
  assert.match(testGroupSource, /resolveWorkflowTemplateContent/);
  assert.match(testGroupSource, /templateCode: "test_assigned"/);
  assert.match(recruitmentTestsSource, /resolveWorkflowTemplateContent/);
  assert.match(recruitmentTestsSource, /templateCode: "test_assigned"/);
  assert.match(onboardingSource, /resolveWorkflowTemplateContent/);
  assert.match(onboardingSource, /templateCode: "onboarding_link"/);
  assert.match(offeringSource, /resolveWorkflowTemplateContent/);
  assert.match(offeringSource, /templateCode: "offering_letter"/);
  assert.match(contractReviewSource, /resolveWorkflowTemplateContent/);
  assert.match(contractReviewSource, /templateCode: 'contract_review_reminder'/);
  assert.match(contractReviewSource, /templateCode: 'contract_review_approval_notification'/);
  assert.match(contractReviewSource, /templateCode: 'contract_review_test_notification'/);
});

test("human capital templates are included in seed and preset registries", () => {
  const seedSource = read("lib/hero-admin.ts");
  const presetSource = read("lib/email-template-presets.ts");
  const hcUtilsSource = read("lib/hc-email-utils.ts");
  const legacySettingsPage = read("app/dashboard/hc/settings/email-templates/page.tsx");

  for (const code of [
    "hc_employee_created",
    "hc_employee_updated",
    "hc_disciplinary_created",
    "hc_disciplinary_status_update",
    "hc_performance_review_created",
    "hc_performance_review_submitted",
    "hc_performance_review_acknowledged",
    "application_received",
    "interview_invitation",
    "test_assigned",
    "onboarding_link",
    "offering_letter",
    "hired_email",
    "start_date_email",
    "custom_bulk",
    "mcu_pengantar",
    "mcu_invitation",
    "contract_review_reminder",
    "contract_review_approval_notification",
    "contract_review_test_notification",
  ]) {
    assert.match(seedSource, new RegExp(`templateCode: '${code}'`));
    assert.match(presetSource, new RegExp(`templateCode: '${code}'`));
  }

  assert.match(hcUtilsSource, /"hired_email"/);
  assert.match(hcUtilsSource, /"start_date_email"/);
  assert.match(hcUtilsSource, /"custom_bulk"/);
  assert.match(hcUtilsSource, /"contract_review_reminder"/);
  assert.match(hcUtilsSource, /"contract_review_approval_notification"/);
  assert.match(hcUtilsSource, /"application_received"/);
  assert.match(hcUtilsSource, /"interview_invitation"/);
  assert.match(hcUtilsSource, /"test_assigned"/);
  assert.match(legacySettingsPage, /redirect\("\/dashboard\/settings\/email"\)/);
});

test("legacy HC workflow pages now emit bell notifications for old approval-style flows", () => {
  const helperSource = read("lib/workflow-notification-center.ts");
  const attendanceSource = read("app/actions/attendance.ts");
  const leaveSource = read("app/actions/leave.ts");
  const offboardingSource = read("app/actions/offboarding.ts");

  assert.match(helperSource, /notifyWorkflowBellRecipients/);
  assert.match(attendanceSource, /attendance_permission_submitted/);
  assert.match(attendanceSource, /attendance_permission_decision/);
  assert.match(leaveSource, /leave_request_submitted/);
  assert.match(leaveSource, /leave_request_decision/);
  assert.match(offboardingSource, /offboarding_request_submitted/);
  assert.match(offboardingSource, /offboarding_status_updated/);
  assert.match(offboardingSource, /offboarding_completed/);
});

test("contract review now supports manual due reminder dispatch", () => {
  const contractReviewSource = read("app/actions/contract-review.ts");
  const contractReviewPageSource = read("app/dashboard/hc/contract-review/client-page.tsx");

  assert.match(contractReviewSource, /sendDueContractReviewReminders/);
  assert.match(contractReviewSource, /hcContractReviewReminders/);
  assert.match(contractReviewSource, /contract_review_reminder/);
  assert.match(contractReviewSource, /notifyWorkflowBellRecipients/);
  assert.match(contractReviewPageSource, /sendDueContractReviewReminders/);
  assert.match(contractReviewPageSource, /Send Reminders/);
});

test("db push script prefers non-truncate flow and aborts unknown destructive prompts", () => {
  const dbPushSource = read("scripts/db-push.ts");

  assert.match(dbPushSource, /No, add the constraint without truncating the table/);
  assert.match(dbPushSource, /Dihentikan demi keamanan/);
  assert.match(dbPushSource, /p\.kill\("SIGTERM"\)/);
});
