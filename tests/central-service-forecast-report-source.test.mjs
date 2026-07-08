import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("daily report shows remaining amount beside category status", () => {
  const reportSource = read("app/dashboard/central-service/forecast/report/client-page.tsx");

  assert.match(reportSource, /Sisa Amount/);
  assert.match(reportSource, /const getRemainingAmount = \(cat: CategoryRow\) => Math\.max\(0, cat\.forecastIdr - cat\.actualIdr\)/);
  assert.match(reportSource, /const getRemarkDaily = \(cat: CategoryRow\) =>/);
  assert.ok(reportSource.includes('[cat.sectionDaily, cat.remarkDaily].filter(Boolean).join(" / ")'));
  assert.match(reportSource, /existing\.actualIdr \+= Number\(a\.amountIdr\)/);
  assert.match(reportSource, /existing\.sectionDaily = a\.jobCode \|\| existing\.sectionDaily/);
  assert.match(reportSource, /<td colSpan=\{12\}/);
  assert.match(reportSource, /PIC<\/th>\s*<th[^>]*>Remark Monthly<\/th>\s*<th[^>]*>Forecast IDR<\/th>\s*<th[^>]*>Forecast USD<\/th>\s*<th[^>]*>Category<\/th>/);
  assert.match(reportSource, /<td colSpan=\{4\}[^>]*>TOTAL<\/td>/);
});
