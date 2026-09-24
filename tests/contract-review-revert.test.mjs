import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("revertContractReviewStep is defined with RBAC, step reset, bell notification, and email", () => {
  const actionSource = read("app/actions/contract-review.ts");

  assert.match(actionSource, /export async function revertContractReviewStep/);
  assert.match(actionSource, /targetStepOrder/);
  assert.match(actionSource, /status: 'pending'/);
  assert.match(actionSource, /status: 'waiting'/);
  assert.match(actionSource, /signatureDataUrl: null/);
  assert.match(actionSource, /signedAt: null/);
  assert.match(actionSource, /notifyWorkflowBellRecipients/);
  assert.match(actionSource, /contract_review_reverted/);
  assert.match(actionSource, /sendContractReviewEmail/);
  assert.match(actionSource, /contract_review_reverted_notification/);
  assert.match(actionSource, /revalidatePath\('\/dashboard\/hc\/contract-review'\)/);
  assert.match(actionSource, /revalidatePath\(`\/review\/\$\{token\}`\)/);
  assert.match(actionSource, /revalidatePath\('\/dashboard\/approval'\)/);
});

test("email templates for contract review revert are registered in presets and db seed", () => {
  const presetsSource = read("lib/email-template-presets.ts");
  const seedSource = read("lib/hero-admin.ts");

  assert.match(presetsSource, /contract_review_reverted_notification/);
  assert.match(presetsSource, /Dokumen Dikembalikan/);
  assert.match(seedSource, /contract_review_reverted_notification/);
});

test("public approval UI includes Revert modal and displays full Section A before Section B", () => {
  const publicSource = read("app/review/[token]/public-approval.tsx");

  assert.match(publicSource, /revertContractReviewStep/);
  assert.match(publicSource, /Kembalikan Dokumen \(Revert\)/);
  assert.match(publicSource, /revertTargetStep/);
  assert.match(publicSource, /revertRemarks/);
  assert.match(publicSource, /previousApprovedSteps/);
  assert.match(publicSource, /Konfirmasi Revert/);

  // Check layout order: Page 1 has Section A, Page 2 has Section B
  const p1 = publicSource.slice(publicSource.indexOf("const pdfPage1"), publicSource.indexOf("const pdfPage2"));
  const p2 = publicSource.slice(publicSource.indexOf("const pdfPage2"), publicSource.indexOf("const pdfPage3"));

  assert.match(p1, /A\. Performance/);
  assert.doesNotMatch(p1, /B\. Related Competency/);
  assert.match(p2, /B\. Related Competency/);
  assert.match(p2, /Achievement Definition/);
  assert.match(p2, /Recommendation/);
});

test("client form preview displays full Section A on Page 1 before Section B on Page 2", () => {
  const formSource = read("app/dashboard/hc/contract-review/form/client-form.tsx");

  const p1 = formSource.slice(formSource.indexOf("const pdfPreviewPage1"), formSource.indexOf("const pdfPreviewPage2"));
  const p2 = formSource.slice(formSource.indexOf("const pdfPreviewPage2"), formSource.indexOf("const pdfPreviewPage3"));

  assert.match(p1, /A\. Performance/);
  assert.doesNotMatch(p1, /B\. Related Competency/);
  assert.match(p2, /B\. Related Competency/);
  assert.match(p2, /pdfAchievementBlock/);
});
