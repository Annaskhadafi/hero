import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("contract review monitoring queries expiring and overdue contracts from single source of truth hero_employees", () => {
  const source = read("app/actions/contract-review.ts");

  assert.match(source, /getExpiringContractEmployees/);
  assert.match(source, /contractDurationEnd/);
  assert.match(source, /isNotNull\(employees\.contractDurationEnd\)/);
  assert.match(source, /sendSingleContractReminder/);
  assert.match(source, /sendBatchContractReminders/);
  assert.match(source, /sendDueContractReviewReminders/);
  assert.match(source, /resolveApproverForEmployee/);
});

test("contract review reminder resolves superior hierarchy: PJO/Lokasi Head from Master Sites, Direct Manager from Org Structure, and Section Head from Master Sections", () => {
  const source = read("app/actions/contract-review.ts");

  assert.match(source, /sites\.headEmployeeId/);
  assert.match(source, /directManagerId/);
  assert.match(source, /masterSections\.headEmployeeId/);
  assert.match(source, /masterDepartments\.headEmployeeId/);
  assert.match(source, /PJO \/ Lokasi Head/);
  assert.match(source, /Atasan Langsung/);
});

test("cron reminders route calls sendDueContractReviewReminders", () => {
  const cronSource = read("app/api/cron/reminders/route.ts");

  assert.match(cronSource, /sendDueContractReviewReminders/);
  assert.match(cronSource, /contractReview:\s*contractReviewResult/);
});

test("contract review page passes expiring contract employees to client page", () => {
  const pageSource = read("app/dashboard/hc/contract-review/page.tsx");

  assert.match(pageSource, /getExpiringContractEmployees/);
  assert.match(pageSource, /expiringEmployees=\{expiringEmployees/);
});

test("contract review client page provides Tabs and Monitoring Kontrak table with filters, multi-select, and actions", () => {
  const clientPageSource = read("app/dashboard/hc/contract-review/client-page.tsx");

  assert.match(clientPageSource, /Tabs/);
  assert.match(clientPageSource, /TabsList/);
  assert.match(clientPageSource, /TabsTrigger value="reviews"/);
  assert.match(clientPageSource, /TabsTrigger value="monitoring"/);
  assert.match(clientPageSource, /Monitoring Kontrak \(H-90 & Overdue\)/);
  assert.match(clientPageSource, /sendSingleContractReminder/);
  assert.match(clientPageSource, /sendBatchContractReminders/);
  assert.match(clientPageSource, /handleSendSingleReminder/);
  assert.match(clientPageSource, /handleSendBatchSelectedReminders/);
  assert.match(clientPageSource, /handleSendReminders/);
  assert.match(clientPageSource, /selectedEmployeeIds/);
  assert.match(clientPageSource, /toggleSelectEmployee/);
  assert.match(clientPageSource, /toggleSelectAll/);
  assert.match(clientPageSource, /urgencyFilter/);
  assert.match(clientPageSource, /reviewStatusFilter/);
  assert.match(clientPageSource, /Overdue/);
  assert.match(clientPageSource, /Buat Review/);
  assert.match(clientPageSource, /Lihat Review/);
});

test("contract review client form handles employeeId and employeeSn prefill from monitoring navigation", () => {
  const formSource = read("app/dashboard/hc/contract-review/form/client-form.tsx");

  assert.match(formSource, /employeeSnParam/);
  assert.match(formSource, /employeeIdParam/);
  assert.match(formSource, /autoPopulateSignatories/);
});

test("due contract review reminder links approvers to the token approval page", () => {
  const source = read("app/actions/contract-review.ts");
  const dueReminder = source.slice(source.indexOf("export async function sendDueContractReviewReminders()"));

  assert.match(dueReminder, /const approvalLink = `\$\{baseUrl\}\/review\/\$\{pendingApproval\.approvalToken\}`/);
  assert.match(dueReminder, /\.replace\(\/\{\{reviewLink\}\}\/g, approvalLink\)/);
  assert.match(dueReminder, /reviewLink: approvalLink/);

  const singleReminder = source.slice(source.indexOf("export async function sendSingleContractReminder"));
  assert.match(singleReminder, /const actionableLink = pendingApproval \? `\$\{baseUrl\}\/review\/\$\{pendingApproval\.approvalToken\}` : reviewLink/);
  assert.match(singleReminder, /\.replace\(\/\{\{reviewLink\}\}\/g, actionableLink\)/);
});

test("mobile contract review keeps the form URL instead of falling back to mobile dashboard", () => {
  const dashboardLayout = read("app/dashboard/layout.tsx");
  const mobilePage = read("app/mobile/hc/contract-review/[[...path]]/page.tsx");
  const formSource = read("app/dashboard/hc/contract-review/form/client-form.tsx");

  assert.match(dashboardLayout, /mobileContractReviewPath/);
  assert.match(dashboardLayout, /'\/mobile\/hc\/contract-review'/);
  assert.match(mobilePage, /path\[0\] !== 'form'/);
  assert.match(mobilePage, /ContractReviewClientForm/);
  assert.match(formSource, /pathname\.startsWith\('\/mobile\/'\)/);
  assert.match(formSource, /id="contract-review-preview"/);
  assert.match(formSource, /isMobileRoute && "block max-md:p-2"/);
});

test("new contract reviews notify the first pending approver", () => {
  const source = read("app/actions/contract-review.ts");
  const insertStart = source.indexOf("const [inserted]");
  const insertBranch = source.slice(insertStart, source.indexOf("revalidatePath('/dashboard/hc/contract-review')", insertStart));

  assert.match(source, /async function sendPendingContractReviewApprovalEmail/);
  assert.match(insertBranch, /await sendPendingContractReviewApprovalEmail\(saved\)/);
  assert.match(source, /templateCode: 'contract_review_approval_notification'/);
});

test("contract review approval email resend is permission-protected and logs pre-transport failures", () => {
  const source = read("app/actions/contract-review.ts");
  const formSource = read("app/dashboard/hc/contract-review/form/client-form.tsx");

  assert.match(source, /export async function resendContractReviewApprovalEmail/);
  assert.match(source, /getCurrentMenuPermission\('hc_contract_review'\)/);
  assert.match(source, /if \(!access\.canEdit\)/);
  assert.match(source, /logEmailDeliveryRecord/);
  assert.match(source, /SMTP belum dikonfigurasi atau tidak aktif/);
  assert.match(formSource, /resendContractReviewApprovalEmail/);
  assert.match(formSource, /Kirim Email Approval/);
});

test("contract review list exposes the current approval step", () => {
  const source = read("app/actions/contract-review.ts");
  const clientSource = read("app/dashboard/hc/contract-review/client-page.tsx");

  assert.match(source, /approvalStep: currentApproval\?\.stepOrder/);
  assert.match(source, /approvalTotalSteps: reviewApprovals\.length/);
  assert.match(clientSource, /Step Approval Sampai Dimana/);
  assert.match(clientSource, /Step \{row\.approvalStep\}\/\{row\.approvalTotalSteps\}/);
  assert.match(clientSource, /Menunggu: \{row\.approvalApproverName/);
  assert.match(clientSource, /resendContractReviewApprovalEmail/);
  assert.match(clientSource, /Resend email approval/);
  assert.match(clientSource, /Kirim ulang email approval sekarang/);
  assert.match(clientSource, /toast\.success\('Berhasil dikirim'/);
});

test("contract review print preview opens in a modal", () => {
  const clientSource = read("app/dashboard/hc/contract-review/client-page.tsx");
  const formSource = read("app/dashboard/hc/contract-review/form/client-form.tsx");

  assert.match(clientSource, /previewReviewId/);
  assert.match(clientSource, /onView=\{\(\) => setPreviewReviewId\(row\.id\)\}/);
  assert.match(clientSource, /Preview Contract Review/);
  assert.match(clientSource, /\?mode=print&embedded=1/);
  assert.match(formSource, /isEmbeddedPrintPreview/);
  assert.match(formSource, /fixed inset-0 z-\[9999\] flex flex-col gap-8/);
});

test("contract review print preview keeps competency and signatures on separate A4 pages", () => {
  const source = read("app/dashboard/hc/contract-review/form/client-form.tsx");
  const page2 = source.slice(source.indexOf("const pdfPreviewPage2"), source.indexOf("const pdfPreviewPage3"));

  assert.match(source, /const page3Html/);
  assert.match(source, /id="pdf-page-3"/);
  assert.match(page2, /B\. Related Competency/);
  assert.match(page2, /break-inside-avoid/);
  assert.match(source, /paddingBottom: '45mm'/);
});
