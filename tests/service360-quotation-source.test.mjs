import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("service 360 quotation line items support drag sorting", () => {
  const formSource = read("app/dashboard/360-service/quotations/create/quotation-form.tsx");
  const actionSource = read("app/actions/service360.ts");

  assert.match(formSource, /DndContext/);
  assert.match(formSource, /SortableContext/);
  assert.match(formSource, /useSortable/);
  assert.match(formSource, /arrayMove\(formItems, oldIndex, newIndex\)/);
  assert.match(formSource, /setValue\("items", arrayMove\(formItems, oldIndex, newIndex\), \{ shouldDirty: true \}\)/);
  assert.match(formSource, /GripVertical/);
  assert.match(formSource, /restrictToVerticalAxis/);
  assert.match(actionSource, /orderBy\(asc\(service360QuotationItems\.id\)\)/);
});

test("service 360 quotation reload keeps backup labour prorate eligible", () => {
  const formSource = read("app/dashboard/360-service/quotations/create/quotation-form.tsx");

  assert.match(formSource, /category: i\.item\?\.category \|\| \(i\.quotationItem\.isBackup \? "Labour Cost" : "General"\)/);
  assert.match(formSource, /const PRORATE_CATEGORIES = \["Labour Cost", "Rental & Tools", "Rental", "Tools"\]/);
  assert.match(formSource, /getBackupProrate\(selItem\)/);
});

test("service 360 quotation edit reloads project name and PO period fields", () => {
  const formSource = read("app/dashboard/360-service/quotations/create/quotation-form.tsx");

  assert.match(formSource, /const parsePoPeriod = \(periodStr\?: string \| null\)/);
  assert.match(formSource, /const parsedPoPeriod = parsePoPeriod\(initialData\?\.poPeriod\)/);
  assert.match(formSource, /const initialProjectSiteId =/);
  assert.match(formSource, /siteList\?\.find\(\(site\) => site\.name === initialData\?\.projectName\)\?\.id\?\.toString\(\)/);
  assert.match(formSource, /selectedProjectSite: initialProjectSiteId/);
  assert.match(formSource, /poPeriodStart: parsedPoPeriod\.start/);
  assert.match(formSource, /poPeriodEnd: parsedPoPeriod\.end/);
  assert.match(formSource, /value=\{poPeriodStart \|\| ""\}/);
  assert.match(formSource, /value=\{poPeriodEnd \|\| ""\}/);
});
