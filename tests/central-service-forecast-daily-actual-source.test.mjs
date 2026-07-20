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

  assert.match(dailySource, /md:grid-cols-4/);
  assert.match(dailySource, /Document Completed/);
  assert.doesNotMatch(dailySource, /Total Actual \(SAP\)/);
  assert.match(dailySource, /Revenue SAP/);
  assert.match(dailySource, /const sapTotalIdr = useMemo/);
  assert.match(dailySource, /Number\(r\.revenueIdr\) \|\| 0/);
  assert.match(dailySource, /Number\(r\.revenueUsd\) \|\| 0/);
  assert.match(dailySource, /const CATEGORIES = \['Outstanding', 'Repair', 'Service', 'Retread'\] as const/);
  assert.match(dailySource, /outstandingAmountIdr: '0'/);
  assert.match(dailySource, /outstandingRemark: ''/);
  assert.match(dailySource, /outstandingSection: '-'/);
  assert.match(dailySource, /outstandingPoNumber: ''/);
  assert.match(dailySource, /const normalizeStatusDoc =/);
  assert.match(dailySource, /status === 'Complete'\) return 'Invoice'/);
  assert.match(dailySource, /status === 'Pending'\) return 'Waiting PO'/);
  assert.match(dailySource, /const formatStatusDoc =/);
  assert.match(dailySource, /const isCancelStatusDoc =/);
  assert.match(dailySource, /isCancelStatusDoc\(a\.itemStatus\) \? sum : sum \+ Number\(a\.amountIdr\)/);
  assert.match(dailySource, /<SelectItem value="PO Release">PO Release<\/SelectItem>/);
  assert.match(dailySource, /<SelectItem value="Waiting PO">Waiting PO<\/SelectItem>/);
  assert.match(dailySource, /<SelectItem value="Invoice">Invoice<\/SelectItem>/);
  assert.match(dailySource, /<SelectItem value="Cancel">Cancel<\/SelectItem>/);
  assert.match(dailySource, /<Label className="text-xs">No PO<\/Label>/);
  assert.match(dailySource, /\['PO Release', 'Invoice'\]\.includes\(selectedStatus\)/);
  assert.match(dailySource, /\['PO Release', 'Invoice'\]\.includes\(itemStatus\)/);
  assert.match(dailySource, /invoiceNumber: poNumber/);
  assert.match(dailySource, /const hasPayload =\s*amtIdr > 0 \|\|\s*String\(actualsForm\[remarkKey\]/);
  assert.match(dailySource, /jobCode: cat === 'Outstanding' \? actualsForm\[sectionKey\] : ''/);
  assert.match(dailySource, /<Label className="text-xs">Section<\/Label>/);
  assert.match(dailySource, /<SelectItem value="Repair">Repair<\/SelectItem>/);
  assert.match(dailySource, /const os = getCat\('Outstanding'\)/);
  assert.match(dailySource, /Outstanding/);
  assert.match(dailySource, /os\.hasData/);
  assert.match(dailySource, /formatCurrency\(os\.sumIdr\)/);
  assert.match(dailySource, /a\.invoiceNumber/);
  assert.match(dailySource, /formatStatusDoc\(entry\.status, entry\.poNumber\)/);
  assert.match(dailySource, /os\.hasData \? os\.section : '—'/);
});

test("daily update search includes saved and SAP PO numbers", () => {
  const dailySource = read("app/dashboard/central-service/forecast/daily/client-page.tsx");

  assert.match(dailySource, /wrapper\.actuals\?\.some\(\(actual: any\) => actual\.invoiceNumber\?\.toLowerCase\(\)\.includes\(query\)\)/);
  assert.match(dailySource, /r\.poNo\?\.toLowerCase\(\)\.includes\(q\)/);
  assert.match(dailySource, /Search customer \/ No PO\.\.\./);
  assert.match(dailySource, /Search billing, material, No PO\.\.\./);
});
