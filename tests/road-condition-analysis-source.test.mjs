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
  const historySource = read("app/api/reports/road-condition/history/route.ts");
  const aiConfigSource = read("lib/ai-inspection-report.ts");

  assert.match(source, /getServerSession/);
  assert.match(source, /session\?\.user\?\.email/);
  assert.match(source, /getInspectionAiConfig/);
  assert.match(aiConfigSource, /anthropic\/claude-3\.5-sonnet/);
  assert.match(aiConfigSource, /openai\/gpt-4o-mini/);
  assert.doesNotMatch(source, /ROAD_CONDITION_AI_/);
  assert.match(source, /getCurrentMenuPermission\(ROAD_CONDITION_RESOURCE\)/);
  assert.match(source, /permission\.canView/);
  assert.match(source, /inspectorName/);
  assert.match(source, /pointName/);
  assert.match(source, /Nama inspector/);
  assert.match(source, /Nama point/);
  assert.match(source, /photos\.length !== 3/);
  assert.match(source, /type: 'image_url'/);
  assert.match(source, /data:\$\{mimeType\};base64/);
  assert.match(source, /normalizeAiResult/);
  assert.match(historySource, /roadConditionReports/);
  assert.match(historySource, /normalizeDrafts/);
  assert.match(historySource, /recommendationEdited/);
  assert.match(historySource, /GET/);
  assert.match(historySource, /POST/);
});

test("road condition page supports multi-category 16:9 compiled report", () => {
  const source = read("app/dashboard/reports/road-condition/client-page.tsx");
  const pageSource = read("app/dashboard/reports/road-condition/page.tsx");
  const rubricSource = read("lib/road-condition-rubric.ts");
  const schemaSource = read("db/schema/hero.ts");
  const historyHelperSource = read("lib/road-condition-history.ts");

  assert.match(source, /PHOTO_ANGLES = \['Angle 1', 'Angle 2', 'Angle 3'\]/);
  assert.match(source, /ROAD_CONDITION_SCORE_OPTIONS/);
  assert.match(source, /SUMMARY_CATEGORY_ORDER/);
  assert.match(source, /type CategoryDraft/);
  assert.match(source, /pointName: string/);
  assert.match(source, /type RoadConditionHistoryRow/);
  assert.match(source, /type AnalysisStatus/);
  assert.match(source, /Nama Inspector/);
  assert.match(source, /Nama Point \/ Segment/);
  assert.match(source, /categoryToAdd/);
  assert.match(source, /addCategory\(categoryToAdd\)/);
  assert.doesNotMatch(source, /usedCategoryKeys/);
  assert.doesNotMatch(source, /availableCategoryOptions/);
  assert.match(source, /getActiveAssessmentRows/);
  assert.match(source, /updateAssessmentScore/);
  assert.match(source, /updateAssessmentRecommendation/);
  assert.match(source, /saveReport/);
  assert.doesNotMatch(source, /loadHistoryReport/);
  assert.match(pageSource, /History Inspeksi/);
  assert.match(source, /Simpan History/);
  assert.match(source, /\/api\/reports\/road-condition\/history/);
  assert.match(source, /Validasi AI/);
  assert.match(source, /Rekomendasi bisa diedit manual dan disimpan ke history/);
  assert.match(source, /getRoadConditionAssessmentTemplate/);
  assert.match(source, /getRoadConditionOverallScore/);
  assert.match(rubricSource, /normalizeRoadConditionScore/);
  assert.match(rubricSource, /ROAD_CONDITION_SCORE_RECOMMENDATIONS/);
  assert.match(pageSource, /roadConditionReports/);
  assert.match(pageSource, /TabsTrigger value="history"/);
  assert.doesNotMatch(pageSource, /initialHistory/);
  assert.match(pageSource, /ensureRoadConditionReportTable/);
  assert.match(schemaSource, /hero_road_condition_reports/);
  assert.match(schemaSource, /reportData: jsonb\('report_data'\)/);
  assert.match(historyHelperSource, /CREATE TABLE IF NOT EXISTS hero_road_condition_reports/);
  assert.match(historyHelperSource, /runtime guard/);
  assert.doesNotMatch(source, /uploadFile/);
  assert.match(source, /\/api\/reports\/road-condition\/analyze/);
  assert.match(source, /runActiveAnalysis/);
  assert.match(source, /setAnalysisStatus/);
  assert.match(source, /AI Kategori/);
  assert.match(source, /AI Semua/);
  assert.match(source, /window\.print\(\)/);
  assert.match(source, /Cetak PDF Gabungan/);
  assert.match(source, /road-condition-print-root/);
  assert.match(source, /Site Condition Assessment/);
  assert.match(source, /formatSummaryPercent/);
  assert.match(source, /totalSlides = drafts\.length \+ 3/);
  assert.match(source, /url\('\/cover\.png'\)/);
  assert.match(source, /url\('\/backcover\.png'\)/);
  assert.match(source, /aspect-video/);
  assert.match(source, /\.road-condition-slide \{ position: relative; \}/);
  assert.doesNotMatch(source, /road-condition-slide relative aspect-video/);
  assert.match(source, /@page \{ size: 297mm 167\.063mm; margin: 0; \}/);
  assert.match(source, /#road-condition-print-root \{ position: absolute !important; inset: 0 !important; display: block !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; gap: 0 !important; background: #fff !important; \}/);
  assert.match(source, /break-after: page/);
  assert.match(source, /Slide 1\/\{totalSlides\}/);
  assert.match(source, /Slide 2\/\{totalSlides\}/);
  assert.match(source, /Slide \{slideIndex \+ 3\}\/\{totalSlides\}/);
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
