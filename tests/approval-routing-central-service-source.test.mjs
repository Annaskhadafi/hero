import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("approval routing sends Central Service outside Jakarta/Balikpapan to PJO Site", () => {
  const source = read("lib/approval-engine.ts");

  assert.match(source, /isCentralServiceDepartment/);
  assert.match(source, /isJakartaOrBalikpapanSite/);
  assert.match(source, /resolveCentralServiceSitePjoRoute/);
  assert.match(source, /siteHeadEmployeeId: sites\.headEmployeeId/);
  assert.match(source, /context\.siteHeadEmployeeId/);
  assert.match(source, /Head Area\/PJO Site dari master Lokasi Site/);
  assert.match(source, /resolutionSource: "legacy_site_pjo"/);
});

test("approval routing keeps non Central Service on direct manager or org matrix path", () => {
  const source = read("lib/approval-engine.ts");

  assert.match(source, /const matrixCandidates = await db/);
  assert.match(source, /return resolveLegacyFallbackRoute\(context\)/);
  assert.match(source, /label: "Direct Manager"/);
  assert.match(source, /resolutionSource: "legacy_manager"/);
});

