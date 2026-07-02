import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("central service assets keeps workbook locations as table source", () => {
  const pageSource = read("app/dashboard/central-service/assets/page.tsx");
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");
  const formSource = read("app/dashboard/central-service/assets/components/asset-form-dialog.tsx");

  assert.doesNotMatch(pageSource, /getSites\(/);
  assert.match(tableSource, /new Set\(data\.map\(\(asset\) => asset\.location\?\.trim\(\)\)/);
  assert.match(tableSource, /row\.getValue\(columnId\)[\s\S]*=== String\(filterValue\)/);
  assert.match(formSource, /list="asset-location-options"/);
  assert.match(formSource, /locations\.map\(\(location\)/);
});

test("central service assets exposes workbook section and master section options", () => {
  const pageSource = read("app/dashboard/central-service/assets/page.tsx");
  const actionsSource = read("app/dashboard/central-service/assets/actions.ts");
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");
  const formSource = read("app/dashboard/central-service/assets/components/asset-form-dialog.tsx");
  const importSource = read("scripts/import-master-rooster.cjs");

  assert.match(pageSource, /getMasterSectionOptions/);
  assert.match(actionsSource, /masterSections/);
  assert.match(tableSource, /accessorKey: "workSection"/);
  assert.match(tableSource, /Semua Section/);
  assert.match(formSource, /name="workSection"/);
  assert.match(formSource, /asset-work-section-options/);
  assert.match(importSource, /workSection: 1/);
  assert.match(importSource, /work_section, section, location/);
});

test("central service asset category can use existing options or manual input", () => {
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");
  const formSource = read("app/dashboard/central-service/assets/components/asset-form-dialog.tsx");

  assert.match(tableSource, /const categoryOptions = useMemo/);
  assert.match(tableSource, /data\.map\(\(asset\) => asset\.section\?\.trim\(\)/);
  assert.match(tableSource, /categories=\{categoryOptions\}/);
  assert.match(formSource, /categories: string\[\]/);
  assert.match(formSource, /list="asset-category-options"/);
  assert.match(formSource, /categories\.map\(\(category\)/);
  assert.doesNotMatch(formSource, /name="section"[\s\S]*SelectValue placeholder="Pilih kategori/);
});

test("central service assets supports multiple attachments with list and preview popup", () => {
  const schemaSource = read("db/schema/central-service.ts");
  const actionsSource = read("app/dashboard/central-service/assets/actions.ts");
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");
  const formSource = read("app/dashboard/central-service/assets/components/asset-form-dialog.tsx");

  assert.match(schemaSource, /hero_central_service_asset_attachments/);
  assert.match(actionsSource, /centralServiceAssetAttachments/);
  assert.match(actionsSource, /getS3ObjectReadUrl/);
  assert.match(formSource, /uploadFile\(formData\)/);
  assert.match(formSource, /multiple/);
  assert.match(tableSource, /AssetAttachmentsDialog/);
  assert.match(tableSource, /md:grid-cols-\[320px_minmax\(0,1fr\)\]/);
  assert.match(tableSource, /<iframe title=\{selected\.fileName\}/);
  assert.match(tableSource, /<img[\s\S]*src=\{attachmentUrl\(selected\)\}/);
});

test("central service assets due and condition colors stay high contrast", () => {
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");

  assert.match(tableSource, /startOfDay\(new Date\(\)\)/);
  assert.match(tableSource, /addMonths\(today, 1\)/);
  assert.match(tableSource, /isBefore\(d, today\)/);
  assert.match(tableSource, /!isAfter\(d, oneMonthFromNow\)/);
  assert.match(tableSource, /bg-yellow-300 text-slate-950/);
  assert.match(tableSource, /bg-red-700 text-white/);
  assert.match(tableSource, /bg-emerald-700 text-white/);
});

test("central service asset scorecards follow active filters", () => {
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");

  assert.match(tableSource, /filteredAssets = table\.getFilteredRowModel\(\)\.rows\.map\(\(row\) => row\.original\)/);
  assert.match(tableSource, /total: filteredAssets\.length/);
  assert.match(tableSource, /active: filteredAssets\.filter/);
  assert.doesNotMatch(tableSource, /const total = data\.length/);
});

test("master rooster import keeps raw location and rolls back fatal failures", () => {
  const importSource = read("scripts/import-master-rooster.cjs");
  const fixSource = read("scripts/fix-asset-locations.cjs");
  const createSource = read("scripts/create-asset-table.ts");
  const migrationSource = read("drizzle/0043_create_asset_table.sql");

  assert.match(importSource, /BEGIN/);
  assert.match(importSource, /COMMIT/);
  assert.match(importSource, /ROLLBACK/);
  assert.match(importSource, /keep raw workbook location/);
  assert.doesNotMatch(createSource, /CREATE UNIQUE INDEX IF NOT EXISTS "cs_asset_number_idx"/);
  assert.match(createSource, /DROP INDEX IF EXISTS "cs_asset_number_idx"/);
  assert.match(migrationSource, /DROP INDEX IF EXISTS "cs_asset_number_idx"/);
  assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS "work_section"/);
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS "hero_central_service_asset_attachments"/);
  assert.doesNotMatch(fixSource, /"BMB": "CK BMB"/);
  assert.match(fixSource, /"BMB": "BMB"/);
});
