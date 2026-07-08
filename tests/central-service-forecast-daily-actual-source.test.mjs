import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("daily actual dialog supports outstanding and remark-only rows", () => {
  const dailySource = read("app/dashboard/central-service/forecast/daily/client-page.tsx");

  assert.match(dailySource, /const CATEGORIES = \["Outstanding", "Repair", "Service", "Retread"\] as const/);
  assert.match(dailySource, /outstandingAmountIdr: "0"/);
  assert.match(dailySource, /outstandingRemark: ""/);
  assert.match(dailySource, /outstandingSection: "-"/);
  assert.match(dailySource, /const hasPayload =\s*amtIdr > 0 \|\|\s*String\(actualsForm\[remarkKey\]/);
  assert.match(dailySource, /jobCode: cat === "Outstanding" \? actualsForm\[sectionKey\] : ""/);
  assert.match(dailySource, /<Label className="text-xs">Section<\/Label>/);
  assert.match(dailySource, /<SelectItem value="Repair">Repair<\/SelectItem>/);
  assert.match(dailySource, /const os = getCat\("Outstanding"\)/);
  assert.match(dailySource, />Outstanding<\/div>/);
  assert.match(dailySource, /os\.hasData \? formatCurrency\(os\.sumIdr\)/);
  assert.match(dailySource, /const section = c\.map\(\(a: any\) => a\.jobCode\)\.find\(Boolean\) \|\| "—"/);
  assert.match(dailySource, /os\.hasData \? os\.section : "—"/);
});
