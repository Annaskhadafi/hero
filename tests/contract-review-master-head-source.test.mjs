import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("contract review approvals resolve section and department head from master data", () => {
  const source = read("app/actions/contract-review.ts");

  assert.match(source, /masterSections/);
  assert.match(source, /masterDepartments/);
  assert.match(source, /resolveMasterSectionAndDepartmentHeads/);
  assert.match(source, /const departmentHead =/);
  assert.match(source, /role: 'central_service_manager'/);
});

test("contract review form receives master head map for signatory autofill", () => {
  const createPageSource = read("app/dashboard/hc/contract-review/form/page.tsx");
  const editPageSource = read("app/dashboard/hc/contract-review/form/[id]\/page.tsx");
  const formSource = read("app/dashboard/hc/contract-review/form/client-form.tsx");
  const publicApprovalSource = read("app/review/[token]/public-approval.tsx");

  assert.match(createPageSource, /masterHeadMap/);
  assert.match(editPageSource, /masterHeadMap/);
  assert.match(formSource, /masterDepartmentHead/);
  assert.match(formSource, /masterSectionHead/);
  assert.match(publicApprovalSource, /central_service_manager: 'Department Head'/);
});

test("contract review leader signature preview uses latest canvas data", () => {
  const formSource = read("app/dashboard/hc/contract-review/form/client-form.tsx");

  assert.match(formSource, /hasVisibleCanvasInk/);
  assert.match(formSource, /const leaderCanvasSignature = getLeaderSignatureDataUrl\(\)/);
  assert.match(formSource, /leaderCanvasSignature \|\| previewLeaderSig \|\| initialData\?\.leaderSignatureDataUrl/);
  assert.match(formSource, /const leaderPreviewSignature = previewLeaderSig \|\| leaderApprovalSig/);
});

test("contract review public approval previews signature history notes and timestamp", () => {
  const publicApprovalSource = read("app/review/[token]/public-approval.tsx");

  assert.match(publicApprovalSource, /hasVisibleCanvasInk/);
  assert.match(publicApprovalSource, /previewSignatureDataUrl/);
  assert.match(publicApprovalSource, /approvalHistoryForDisplay/);
  assert.match(publicApprovalSource, /onEnd=\{updateSignaturePreview\}/);
  assert.match(publicApprovalSource, /Waktu TTD:/);
  assert.match(publicApprovalSource, /Catatan:/);
});

test("contract review public approval exposes productivity tab with token-limited embed", () => {
  const publicApprovalSource = read("app/review/[token]/public-approval.tsx");
  const embeddedEmployeeSource = read("app/embedded/hc/employee/[id]/page.tsx");

  assert.match(publicApprovalSource, /TabsTrigger value="productivity"/);
  assert.match(publicApprovalSource, /Profil Produktivitas Karyawan/);
  assert.match(publicApprovalSource, /contractReviewToken=\$\{encodeURIComponent\(token\)\}/);
  assert.match(embeddedEmployeeSource, /getContractReviewApprovalByToken/);
  assert.match(embeddedEmployeeSource, /Number\(tokenEmployeeId\) !== hrEmployeeId/);
});

test("contract review pending approvals appear in mobile inbox and reminder uses settings", () => {
  const approvalWorkspaceSource = read("lib/approval-workspace.ts");
  const mobileApprovalSource = read("components/mobile/mobile-approval-center.tsx");
  const contractReviewSource = read("app/actions/contract-review.ts");
  const contractReviewPageSource = read("app/dashboard/hc/contract-review/client-page.tsx");

  assert.match(approvalWorkspaceSource, /getContractReviewInboxItems/);
  assert.match(approvalWorkspaceSource, /contractReviewInboxItems/);
  assert.match(approvalWorkspaceSource, /hcContractReviewApprovals/);
  assert.match(mobileApprovalSource, /Buka TTD Contract Review/);
  assert.match(mobileApprovalSource, /contractReviewItems/);
  assert.match(contractReviewSource, /reminderDaysBefore/);
  assert.match(contractReviewSource, /new Set\(settings\.reminderDaysBefore\)/);
  assert.match(contractReviewPageSource, /Reminder Days Before/);
});

test("contract review public approval layout is mobile friendly", () => {
  const publicApprovalSource = read("app/review/[token]/public-approval.tsx");

  assert.match(publicApprovalSource, /flex-col items-stretch gap-4 xl:flex-row/);
  assert.match(publicApprovalSource, /w-full shrink-0 space-y-4 xl:sticky/);
  assert.match(publicApprovalSource, /touch-none rounded-lg bg-white/);
  assert.match(publicApprovalSource, /overflow-x-auto pb-2/);
  assert.match(publicApprovalSource, /h-\[72vh\].*sm:h-\[86vh\]/);
});
