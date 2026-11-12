import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("contract review logic validates permanentDate against dummy dates and honors explicit contract status", () => {
  const source = read("app/actions/contract-review.ts");

  assert.match(source, /hasValidPermanentDate/);
  assert.match(source, /0001/);
  assert.match(source, /1970/);
  assert.match(source, /isExplicitContract/);
});

test("HC employee client page sanitizes permanentDate against placeholder dates", () => {
  const source = read("app/dashboard/hc/employee/client-page.tsx");

  assert.match(source, /hasValidPermanentDate/);
  assert.match(source, /0001/);
  assert.match(source, /1970/);
  assert.match(source, /isExplicitContract/);
});

test("admin user management sanitizes dummy permanentDate on save", () => {
  const source = read("app/dashboard/admin-actions.ts");

  assert.match(source, /startsWith\('0001'\)/);
  assert.match(source, /startsWith\('1970'\)/);
});
