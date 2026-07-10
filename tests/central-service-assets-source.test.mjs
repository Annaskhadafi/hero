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
  assert.match(tableSource, /function uploadProxyUrl/);
  assert.match(tableSource, /\/api\/uploads\/\$\{parts\.slice/);
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

test("central service asset global search includes serial number", () => {
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");

  assert.match(tableSource, /function assetSearchText\(asset: Asset\)/);
  assert.match(tableSource, /asset\.serialNumber/);
  assert.match(tableSource, /globalFilterFn: \(row, _columnId, filterValue\)/);
  assert.match(tableSource, /assetSearchText\(row\.original\)\.includes/);
});

test("central service assets can filter and default-sort certificate or calibration due items", () => {
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");

  assert.match(tableSource, /function dueState/);
  assert.match(tableSource, /function hasDueAttention/);
  assert.match(tableSource, /function dueFilterValue/);
  assert.match(tableSource, /function dueSortValue/);
  assert.match(tableSource, /useState<SortingState>\(\[\{ id: "duePriority", desc: false \}\]\)/);
  assert.match(tableSource, /columnVisibility: \{ duePriority: false, dueStatus: false \}/);
  assert.match(tableSource, /table\.getColumn\("dueStatus"\)\?\.setFilterValue/);
  assert.match(tableSource, /Calibration Due/);
  assert.match(tableSource, /Certificate Due/);
});

test("central service assets hides calibration fields and supports inline condition workflow", () => {
  const actionsSource = read("app/dashboard/central-service/assets/actions.ts");
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");
  const formSource = read("app/dashboard/central-service/assets/components/asset-form-dialog.tsx");

  assert.doesNotMatch(formSource, /<FormLabel>Last Calibration<\/FormLabel>/);
  assert.doesNotMatch(formSource, /<FormLabel>Cycle \(bulan\)<\/FormLabel>[\s\S]*calibrationCycleMonths/);
  assert.doesNotMatch(formSource, /<FormLabel>Calibration Due<\/FormLabel>/);
  assert.doesNotMatch(tableSource, /header: "Last Calibration"/);
  assert.doesNotMatch(tableSource, /header: "Cycle \(Mo\)"/);
  assert.doesNotMatch(tableSource, /header: "Calib\. Due"/);
  assert.doesNotMatch(tableSource, /header: "Cert\. Date"/);
  assert.doesNotMatch(tableSource, /header: "Cert\. Cycle"/);
  assert.doesNotMatch(tableSource, /header: "Cert\. Due"/);
  assert.match(tableSource, /const DEFAULT_CONDITION_FILTERS = CONDITIONS\.filter\(\(condition\) => condition !== "SCRAP"\)/);
  assert.match(tableSource, /DropdownMenuCheckboxItem/);
  assert.match(tableSource, /updateAssetCondition\(asset\.id, condition\)/);
  assert.match(actionsSource, /export async function updateAssetCondition/);
  assert.match(actionsSource, /Kondisi tidak valid/);
});

test("central service assets stores and shows change history logs", () => {
  const schemaSource = read("db/schema/central-service.ts");
  const migrationSource = read("drizzle/0044_create_asset_history_table.sql");
  const actionsSource = read("app/dashboard/central-service/assets/actions.ts");
  const tableSource = read("app/dashboard/central-service/assets/components/assets-table.tsx");
  const createSource = read("scripts/create-asset-table.ts");

  assert.match(schemaSource, /centralServiceAssetHistories/);
  assert.match(schemaSource, /hero_central_service_asset_histories/);
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS "hero_central_service_asset_histories"/);
  assert.match(createSource, /hero_central_service_asset_histories/);
  assert.match(actionsSource, /TRACKED_FIELDS/);
  assert.match(actionsSource, /buildChangeRows/);
  assert.match(actionsSource, /centralServiceAssetHistories/);
  assert.match(actionsSource, /fieldName: "attachments"/);
  assert.match(tableSource, /expandedHistoryId/);
  assert.match(tableSource, /History Perubahan/);
  assert.match(tableSource, /histories: \[\.\.\.\(updatedAsset\.histories \?\? \[\]\), \.\.\.\(a\.histories \?\? \[\]\)\]/);
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
