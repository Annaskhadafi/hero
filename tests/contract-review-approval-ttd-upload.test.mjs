import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("public approval provides signature mode switcher for drawing and uploading TTD", () => {
  const publicApprovalSource = read("app/review/[token]/public-approval.tsx");

  // State for signature mode & uploaded signature
  assert.match(publicApprovalSource, /signatureMode/);
  assert.match(publicApprovalSource, /setSignatureMode/);
  assert.match(publicApprovalSource, /uploadedSignatureDataUrl/);
  assert.match(publicApprovalSource, /handleSignatureFileUpload/);
  assert.match(publicApprovalSource, /handleClearUploadedSignature/);

  // UI buttons/toggles
  assert.match(publicApprovalSource, /Upload TTD/);
  assert.match(publicApprovalSource, /Metode Tanda Tangan:/);
  assert.match(publicApprovalSource, /Gambar/);
  assert.match(publicApprovalSource, /Ganti Gambar/);
  assert.match(publicApprovalSource, /Pilih atau unggah file tanda tangan/);

  // Verification in getSignatureDataUrl
  assert.match(publicApprovalSource, /if \(signatureMode === 'upload' && uploadedSignatureDataUrl\)/);
});

test("public approval and contract review forms display 'Purpose to Permanent' instead of 'Confirm to Permanent'", () => {
  const publicApprovalSource = read("app/review/[token]/public-approval.tsx");
  const printableDocSource = read("components/contract-review/contract-review-printable-doc.tsx");
  const clientFormSource = read("app/dashboard/hc/contract-review/form/client-form.tsx");
  const workbenchSource = read("components/approval-workbench.tsx");

  // Public approval
  assert.match(publicApprovalSource, /Purpose to Permanent/);
  assert.doesNotMatch(publicApprovalSource, /Confirm to Permanent/);

  // Printable doc
  assert.match(printableDocSource, /Purpose to Permanent/);
  assert.doesNotMatch(printableDocSource, /Confirm to Permanent/);

  // Client form
  assert.match(clientFormSource, /Purpose to Permanent/);
  assert.doesNotMatch(clientFormSource, /Confirm to Permanent/);

  // Workbench
  assert.match(workbenchSource, /Purpose to Permanent/);
  assert.doesNotMatch(workbenchSource, /Confirm Permanent/);
});

test("approver role defaults to 'Manager' instead of 'central_service_manager' or 'Department Head'", () => {
  const publicApprovalSource = read("app/review/[token]/public-approval.tsx");
  const clientPageSource = read("app/dashboard/hc/contract-review/client-page.tsx");
  const actionsSource = read("app/actions/contract-review.ts");
  const printableDocSource = read("components/contract-review/contract-review-printable-doc.tsx");

  // Role labels in public approval
  assert.match(publicApprovalSource, /central_service_manager: 'Manager'/);

  // Edit Approver dialog resolution defaults to Manager
  assert.match(publicApprovalSource, /found\.approverRole === 'central_service_manager'/);
  assert.match(publicApprovalSource, /target\.approverRole === 'central_service_manager'/);
  assert.match(publicApprovalSource, /placeholder="Contoh: Manager \/ Section Head"/);

  // Next superior default title in printable doc
  assert.match(printableDocSource, /form\.nextSuperiorTitle \|\| 'Manager'/);

  // Role labels in actions
  assert.match(actionsSource, /central_service_manager: 'Manager'/);

  // Role labels in client page
  assert.match(clientPageSource, /central_service_manager: 'Manager'/);
  assert.match(clientPageSource, /<Label>Manager<\/Label>/);
});
