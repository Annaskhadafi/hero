import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("road condition rubric covers requested categories and parameters", () => {
  const source = read("lib/road-condition-rubric.ts");

  assert.match(source, /loading_point/);
  assert.match(source, /haulroad/);
  assert.match(source, /disposal/);
  assert.match(source, /cross_fall/);
  assert.match(source, /gradient/);
  assert.match(source, /windrow/);
  assert.match(source, /support_equipment/);
  assert.match(source, /Score 1 paling buruk|1: 'Tumpahan/);
});

test("road condition AI route is authenticated and sends images to the model", () => {
  const source = read("app/api/reports/road-condition/analyze/route.ts");
  const aiConfigSource = read("lib/ai-inspection-report.ts");

  assert.match(source, /getServerSession/);
  assert.match(source, /session\?\.user\?\.email/);
  assert.match(source, /getInspectionAiConfig/);
  assert.match(aiConfigSource, /anthropic\/claude-3\.5-sonnet/);
  assert.match(aiConfigSource, /openai\/gpt-4o-mini/);
  assert.doesNotMatch(source, /ROAD_CONDITION_AI_/);
  assert.match(source, /getCurrentMenuPermission\(ROAD_CONDITION_RESOURCE\)/);
  assert.match(source, /permission\.canView/);
  assert.match(source, /photos\.length !== 3/);
  assert.match(source, /type: 'image_url'/);
  assert.match(source, /data:\$\{mimeType\};base64/);
  assert.match(source, /normalizeAiResult/);
});

test("road condition page supports multi-category 16:9 compiled report", () => {
  const source = read("app/dashboard/reports/road-condition/client-page.tsx");

  assert.match(source, /PHOTO_ANGLES = \['Angle 1', 'Angle 2', 'Angle 3'\]/);
  assert.match(source, /type CategoryDraft/);
  assert.match(source, /type AnalysisStatus/);
  assert.doesNotMatch(source, /uploadFile/);
  assert.match(source, /\/api\/reports\/road-condition\/analyze/);
  assert.match(source, /runActiveAnalysis/);
  assert.match(source, /setAnalysisStatus/);
  assert.match(source, /AI Kategori/);
  assert.match(source, /AI Semua/);
  assert.match(source, /window\.print\(\)/);
  assert.match(source, /Cetak PDF Gabungan/);
  assert.match(source, /road-condition-print-root/);
  assert.match(source, /aspect-video/);
  assert.match(source, /\.road-condition-slide \{ position: relative; \}/);
  assert.doesNotMatch(source, /road-condition-slide relative aspect-video/);
  assert.match(source, /@page \{ size: 297mm 167\.063mm; margin: 0; \}/);
  assert.match(source, /break-after: page/);
  assert.match(source, /Slide \{slideIndex \+ 1\}\/\{drafts\.length\}/);
  assert.match(source, /Nilai/);
  assert.match(source, /Deskripsi/);
  assert.match(source, /Rekomendasi/);
});

test("road condition menu seed is managed by HSE permissions", () => {
  const source = read("lib/hero-admin.ts");

  assert.match(source, /Road Condition Analysis/);
  assert.match(source, /\/dashboard\/reports\/road-condition/);
  assert.match(source, /hse_road_condition_analysis/);
  assert.match(source, /HSE_MANAGED_RESOURCES[\s\S]*hse_road_condition_analysis/);
});
