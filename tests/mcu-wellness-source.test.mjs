import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("MCU wellness schema tables defined", () => {
  const schemaSource = read("db/schema/hero.ts");
  assert.match(schemaSource, /hero_employee_mcu/);
  assert.match(schemaSource, /hero_employee_mcu_metrics/);
  assert.match(schemaSource, /employeeMcu = pgTable\('hero_employee_mcu'/);
  assert.match(schemaSource, /employeeMcuMetrics = pgTable\('hero_employee_mcu_metrics'/);
  assert.match(schemaSource, /aiKesimpulan/);
  assert.match(schemaSource, /aiSaran/);
  assert.match(schemaSource, /aiKategori/);
  assert.match(schemaSource, /nextMcuDue/);
});

test("migration SQL file exists with tables and indexes", () => {
  const migrationSql = read("drizzle/0047_mcu_wellness_advance.sql");
  assert.match(migrationSql, /CREATE TABLE IF NOT EXISTS hero_employee_mcu/);
  assert.match(migrationSql, /CREATE TABLE IF NOT EXISTS hero_employee_mcu_metrics/);
  assert.match(migrationSql, /idx_employee_mcu_employee_date/);
  assert.match(migrationSql, /idx_employee_mcu_metrics_mcu_cat_key/);
});

test("MCU wellness server actions export required functions", () => {
  const actionsSource = read("app/actions/mcu-wellness.ts");
  assert.match(actionsSource, /export async function getMcuWellnessList/);
  assert.match(actionsSource, /export async function getMcuDetail/);
  assert.match(actionsSource, /export async function getMcuReminders/);
  assert.match(actionsSource, /export async function scheduleEmployeeMcu/);
  assert.match(actionsSource, /export async function uploadMcuResultFile/);
  assert.match(actionsSource, /export async function saveMcuAiResult/);
  assert.match(actionsSource, /export async function saveAiResultForEmployee/);
  assert.match(actionsSource, /export async function setMcuStatus/);
  assert.match(actionsSource, /export async function sendMcuReminderNow/);
  assert.match(actionsSource, /export async function sendBulkMcuReminders/);
  assert.match(actionsSource, /export async function createManualMcu/);
  assert.match(actionsSource, /export async function getHealthDashboardData/);
});

test("AI extraction helper exists with prompt and metric structure", () => {
  const aiSource = read("lib/mcu-wellness-ai.ts");
  assert.match(aiSource, /MCU_AI_PROMPT_SYSTEM/);
  assert.match(aiSource, /callMcuAiExtraction/);
  assert.match(aiSource, /flattenMcuMetrics/);
  assert.match(aiSource, /MCU_METRIC_CATEGORIES/);
  assert.match(aiSource, /hipertensi/);
  assert.match(aiSource, /kolesterol/);
  assert.match(aiSource, /asam_urat/);
  assert.match(aiSource, /jantung/);
  assert.match(aiSource, /diabetes/);
  assert.match(aiSource, /liver/);
  assert.match(aiSource, /tensi_sistolik/);
  assert.match(aiSource, /glukosa_puasa/);
  assert.match(aiSource, /hba1c/);
  assert.match(aiSource, /gamma_gt/);
  assert.match(aiSource, /usg_abdomen/);
});

test("AI analyze API route exists", () => {
  const routeSource = read("app/api/mcu-wellness/analyze/route.ts");
  assert.match(routeSource, /export async function POST/);
  assert.match(routeSource, /callMcuAiExtraction/);
  assert.match(routeSource, /fileBase64/);
});

test("MCU page and client page with 4 tabs exist", () => {
  const pageSource = read("app/dashboard/hc/mcu-wellness/page.tsx");
  const clientSource = read("app/dashboard/hc/mcu-wellness/client-page.tsx");
  assert.match(pageSource, /getMcuWellnessList/);
  assert.match(pageSource, /getMcuReminders/);
  assert.match(pageSource, /getHealthDashboardData/);
  assert.match(clientSource, /McuKaryawanTab/);
  assert.match(clientSource, /McuReminderTab/);
  assert.match(clientSource, /McuAiTab/);
  assert.match(clientSource, /HealthDashboardTab/);
  assert.match(clientSource, /TabsContent value="karyawan"/);
  assert.match(clientSource, /TabsContent value="reminder"/);
  assert.match(clientSource, /TabsContent value="ai"/);
  assert.match(clientSource, /TabsContent value="dashboard"/);
});

test("email template presets registered for MCU wellness", () => {
  const presetsSource = read("lib/email-template-presets.ts");
  assert.match(presetsSource, /templateCode: 'mcu_annual_reminder'/);
  assert.match(presetsSource, /templateCode: 'mcu_result_fit'/);
  assert.match(presetsSource, /templateCode: 'mcu_result_unfit'/);
  assert.match(presetsSource, /employeeName/);
  assert.match(presetsSource, /dueDate/);
  assert.match(presetsSource, /kesimpulan/);
  assert.match(presetsSource, /saran/);
});

test("MCU wellness email helper wired with HC policy CC and bell", () => {
  const emailSource = read("lib/mcu-wellness-email.ts");
  assert.match(emailSource, /sendMcuAnnualReminderEmail/);
  assert.match(emailSource, /sendMcuResultEmail/);
  assert.match(emailSource, /resolveWorkflowTemplateContent/);
  assert.match(emailSource, /getHumanCapitalPolicyCcRecipients/);
  assert.match(emailSource, /sendEmailViaSmtp/);
  assert.match(emailSource, /createNotificationEventForEmployee/);
  assert.match(emailSource, /mcu_reminder_due/);
  assert.match(emailSource, /mcu_status_fit/);
  assert.match(emailSource, /mcu_status_unfit/);
});

test("server actions wired to send email + bell on result save and status change", () => {
  const actionsSource = read("app/actions/mcu-wellness.ts");
  assert.match(actionsSource, /sendMcuResultEmail/);
  assert.match(actionsSource, /sendMcuAnnualReminderEmail/);
  assert.match(actionsSource, /mcu-wellness-email/);
});

test("sidebar menu seed includes MCU Wellness entry", () => {
  const adminSource = read("lib/hero-admin.ts");
  assert.match(adminSource, /\/dashboard\/hc\/mcu-wellness/);
  assert.match(adminSource, /hc_mcu_wellness/);
  assert.match(adminSource, /MCU Wellness/);
});

test("mobile wellness page extended with MCU annual data", () => {
  const mobileSource = read("app/mobile/wellness/page.tsx");
  const mobileData = read("lib/mobile-data.ts");
  assert.match(mobileData, /employeeMcu/);
  assert.match(mobileData, /employeeMcuMetrics/);
  assert.match(mobileData, /mcuHistory/);
  assert.match(mobileSource, /mcuHistory/);
  assert.match(mobileSource, /MCU_CATEGORY_LABELS/);
});

test("employee profile integrates annual MCU history", () => {
  const profileActions = read("app/actions/employee-profile.ts");
  const profileClient = read("app/dashboard/hc/employee/[id]/client-page.tsx");
  assert.match(profileActions, /employeeMcu/);
  assert.match(profileActions, /annualMcu/);
  assert.match(profileClient, /annualMcu/);
  assert.match(profileClient, /Riwayat MCU Tahunan/);
});
