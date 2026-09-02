import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8")
}

test("schema hero.ts contains formWoNotificationConfig table with tier 1, 2, 3 and threshold columns", () => {
  const source = read("db/schema/hero.ts")

  assert.match(source, /export const formWoNotificationConfig = pgTable\('hero_form_wo_notification_config'/)
  assert.match(source, /tier1ApproverEmails: text\('tier1_approver_emails'\)/)
  assert.match(source, /tier2ApproverEmails: text\('tier2_approver_emails'\)/)
  assert.match(source, /tier3ApproverEmails: text\('tier3_approver_emails'\)/)
  assert.match(source, /tier3ThresholdAmount: text\('tier3_threshold_amount'\)/)
})

test("hero-admin.ts exports getFormWoNotificationConfigData getter", () => {
  const source = read("lib/hero-admin.ts")

  assert.match(source, /export async function getFormWoNotificationConfigData/)
  assert.match(source, /from\(formWoNotificationConfig\)/)
})

test("email settings actions expose saveFormWoNotificationConfigAction", () => {
  const source = read("app/dashboard/settings/email/actions.ts")

  assert.match(source, /export async function saveFormWoNotificationConfigAction/)
  assert.match(source, /tier1ApproverEmails: parsed\.data\.tier1ApproverEmails/)
  assert.match(source, /tier2ApproverEmails: parsed\.data\.tier2ApproverEmails/)
  assert.match(source, /tier3ApproverEmails: parsed\.data\.tier3ApproverEmails/)
  assert.match(source, /tier3ThresholdAmount: parsed\.data\.tier3ThresholdAmount/)
})

test("FormWoNotificationSettingsPanel component is mounted in Settings Email page", () => {
  const panelSource = read("components/form-wo-notification-settings-panel.tsx")
  assert.match(panelSource, /export function FormWoNotificationSettingsPanel/)
  assert.match(panelSource, /Form WO Approval Berjenjang/)
  assert.match(panelSource, /Tier 1 Approver/)
  assert.match(panelSource, /Tier 2 Approver/)
  assert.match(panelSource, /Tier 3 Approver/)

  const pageSource = read("app/dashboard/settings/email/page.tsx")
  assert.match(pageSource, /FormWoNotificationSettingsPanel/)
  assert.match(pageSource, /getFormWoNotificationConfigData/)
  assert.match(pageSource, /value="form-wo"/)
})

test("form-wo email helper supports dynamic multi-tier approval routing", () => {
  const source = read("lib/form-wo-email.ts")

  assert.match(source, /getFormWoNotificationConfigData/)
  assert.match(source, /tier1ApproverEmails/)
  assert.match(source, /tier2ApproverEmails/)
  assert.match(source, /tier3ApproverEmails/)
})

test("approval-engine.ts resolves Service WO with company check (TRAKINDO/CK/CKB -> Apriyanto, else -> Junaidi)", () => {
  const source = read("lib/approval-engine.ts")

  assert.match(source, /resolveFormWoServiceApprovalRoute/)
  assert.match(source, /TRAKINDO/)
  assert.match(source, /CK/)
  assert.match(source, /CKB/)
  assert.match(source, /Apriyanto/)
  assert.match(source, /Junaidi/)
  assert.match(source, /Andika Ferdiansyah/)
  assert.match(source, /Ali Rahman/)
})

test("approval-engine.ts resolves Repair/Retread WO with 4-stage approver matrix", () => {
  const source = read("lib/approval-engine.ts")

  assert.match(source, /resolveFormWoRepairRetreadApprovalRoute/)
  assert.match(source, /QC \/ Leader/)
  assert.match(source, /Ary Maulana/)
  assert.match(source, /Andika Ferdiansyah/)
  assert.match(source, /Ali Rahman/)
})

test("form-wo.ts enforces submitter digital signature upon creation", () => {
  const source = read("app/actions/form-wo.ts")

  assert.match(source, /!parsed\.submitterSignatureUrl/)
  assert.match(source, /Tanda tangan digital pemohon wajib dibubuhkan/)
})

test("form-wo.ts distinguishes transactionType for service vs repair_retread", () => {
  const source = read("app/actions/form-wo.ts")

  assert.match(source, /const transactionType = isService/)
  assert.match(source, /form_wo_service_mvc/)
  assert.match(source, /form_wo_service_other/)
  assert.match(source, /form_wo_repair_retread/)
})

test("form-wo PDF generator and preview dialog use matching 4-stage and 5-stage headers", () => {
  const pdfSource = read("lib/form-wo-pdf.ts")
  assert.match(pdfSource, /isService/)
  assert.match(pdfSource, /DIAJUKAN OLEH/)
  assert.match(pdfSource, /DIKETAHUI OLEH/)
  assert.match(pdfSource, /DISETUJUI OLEH/)
  assert.match(pdfSource, /DIPERIKSA OLEH/)

  const previewSource = read("components/form-wo-document-preview-dialog.tsx")
  assert.match(previewSource, /isService/)
  assert.match(previewSource, /DIAJUKAN OLEH/)
  assert.match(previewSource, /DIKETAHUI OLEH/)
  assert.match(previewSource, /DISETUJUI OLEH/)
  assert.match(previewSource, /DIPERIKSA OLEH/)
})

