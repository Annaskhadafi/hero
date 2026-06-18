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
