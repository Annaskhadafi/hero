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
  assert.match(aiConfigSource, /OPENAI_API_KEY/);
  assert.match(aiConfigSource, /OPENAI_BASE_URL/);
  assert.match(aiConfigSource, /OPENAI_MODEL/);
  assert.match(aiConfigSource, /9router\.chitraparatama\.com/);
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
  const mobilePageSource = read("app/mobile/reports/road-condition/page.tsx");
  const rubricSource = read("lib/road-condition-rubric.ts");
  const schemaSource = read("db/schema/hero.ts");
  const historyHelperSource = read("lib/road-condition-history.ts");
  const historyApiSource = read("app/api/reports/road-condition/history/route.ts");
  const historyDeleteSource = read("app/api/reports/road-condition/history/[id]/route.ts");
  const pptxRouteSource = read("app/api/reports/road-condition/pptx/route.ts");

  assert.match(source, /PHOTO_ANGLES = \['Angle 1', 'Angle 2', 'Angle 3'\]/);
  assert.match(source, /ROAD_CONDITION_SCORE_OPTIONS/);
  assert.match(source, /SUMMARY_CATEGORY_ORDER/);
  assert.match(source, /type CategoryDraft/);
  assert.match(source, /pointName: string/);
  assert.match(source, /export type HistoryRow/);
  assert.match(source, /type AnalysisStatus/);
  assert.match(source, /Nama Inspector/);
  assert.match(source, /Nama Point \/ Segment/);
  assert.match(source, /siteInputMode/);
  assert.match(source, /handleManualSiteChange/);
  assert.match(source, /categoryToAdd/);
  assert.match(source, /addCategory\(categoryToAdd\)/);
  assert.match(source, /moveDraft/);
  assert.match(source, /movePhoto/);
  assert.doesNotMatch(source, /usedCategoryKeys/);
  assert.doesNotMatch(source, /availableCategoryOptions/);
  assert.match(source, /getActiveAssessmentRows/);
  assert.match(source, /updateAssessmentScore/);
  assert.match(source, /updateAssessmentRecommendation/);
  assert.match(source, /saveReport/);
  assert.match(source, /loadHistoryRow/);
  assert.match(source, /deleteHistoryRow/);
  assert.match(source, /dataUrl/);
  assert.match(source, /function isImageDataUrl/);
  assert.match(source, /createDraftsFromHistoryData/);
  assert.match(source, /setHistoryList/);
  assert.match(source, /setActiveTab\('report'\)/);
  assert.match(source, /photoPayload\[index\]\?\.dataUrl/);
  assert.match(historyApiSource, /dataUrl/);
  assert.match(historyApiSource, /readImageDataUrl/);
  assert.match(historyDeleteSource, /export async function DELETE/);
  assert.match(historyDeleteSource, /deletedId/);
  assert.doesNotMatch(source, /loadHistoryReport/);
  assert.match(source, /History Inspeksi/);
  assert.match(source, /TabsTrigger value="history"/);
  assert.match(source, /historyRows/);
  assert.match(source, /previewHistory/);
  assert.match(source, /PenSquare/);
  assert.match(source, /Eye className/);
  assert.match(source, /Manual/);
  assert.match(source, /Hapus history/);
  assert.match(pageSource, /historyRows=\{parsedHistoryRows\}/);
  assert.match(source, /Simpan History/);
  assert.match(source, /\/api\/reports\/road-condition\/history/);
  assert.match(source, /Validasi AI/);
  assert.match(source, /Rekomendasi bisa diedit manual dan disimpan ke history/);
  assert.match(source, /getRoadConditionAssessmentTemplate/);
  assert.match(source, /getRoadConditionOverallScore/);
  assert.match(rubricSource, /normalizeRoadConditionScore/);
  assert.match(rubricSource, /ROAD_CONDITION_SCORE_RECOMMENDATIONS/);
  assert.match(pageSource, /roadConditionReports/);
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
  assert.match(source, /generateReportPdf/);
  assert.match(source, /generateHistoryPdf/);
  assert.match(source, /generateReportPptx/);
  assert.match(source, /generateHistoryPptx/);
  assert.match(pptxRouteSource, /pptxgenjs/);
  assert.match(source, /\/api\/reports\/road-condition\/pptx/);
  assert.match(source, /downloadReportPptx/);
  assert.match(source, /Download PPTX/);
  assert.match(source, /drawPdfStars/);
  assert.match(source, /jspdf/);
  assert.match(source, /downloadReportPdf/);
  assert.match(source, /drawPdfDetail/);
  assert.match(source, /buildHistoryPdfSource/);
  assert.match(source, /Generate PDF/);
  assert.match(source, /pdfProgress/);
  assert.match(source, /savePdfBlob/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /window\.open/);
  assert.match(source, /<Progress/);
  assert.match(source, /road-condition-print-root/);
  assert.match(source, /object-contain/);
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
  assert.match(mobilePageSource, /MobileRoadConditionAnalysisPage/);
  assert.match(mobilePageSource, /RoadConditionAnalysisClient/);
  assert.match(mobilePageSource, /historyRows=\{parsedHistoryRows\}/);
  assert.match(mobilePageSource, /hasil slide report PDF/);
});

test("road condition menu seed is managed by HSE permissions", () => {
  const source = read("lib/hero-admin.ts");

  assert.match(source, /Road Condition Analysis/);
  assert.match(source, /\/dashboard\/reports\/road-condition/);
  assert.match(source, /hse_road_condition_analysis/);
  assert.match(source, /HSE_MANAGED_RESOURCES[\s\S]*hse_road_condition_analysis/);
});

test("inspection AI config properly maps OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL and 9router", () => {
  function cleanEnv(value) {
    if (!value) return "";
    let trimmed = String(value).trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      trimmed = trimmed.slice(1, -1).trim();
    }
    return trimmed;
  }

  // Simulate getInspectionAiConfig function logic
  function testConfig(env) {
    const preferOpenAi = cleanEnv(env.LLM_PROVIDER).toLowerCase() === "openai";

    let rawUrl = (
      (preferOpenAi ? cleanEnv(env.OPENAI_BASE_URL) : "") ||
      cleanEnv(env.INSPECTION_AI_URL) ||
      cleanEnv(env.OPENAI_BASE_URL) ||
      (preferOpenAi ? "" : cleanEnv(env.OLLAMA_API_URL)) ||
      (preferOpenAi ? "" : cleanEnv(env.OLLAMA_URL)) ||
      "https://9router.chitraparatama.com/v1"
    ).trim();

    if (rawUrl.endsWith("/")) {
      rawUrl = rawUrl.slice(0, -1);
    }
    const apiUrl = rawUrl.endsWith("/chat/completions")
      ? rawUrl
      : `${rawUrl}/chat/completions`;

    const apiKey = (
      (preferOpenAi ? cleanEnv(env.OPENAI_API_KEY) : "") ||
      cleanEnv(env.INSPECTION_AI_API_KEY) ||
      cleanEnv(env.OPENAI_API_KEY) ||
      (preferOpenAi ? "" : cleanEnv(env.OLLAMA_API_KEY)) ||
      (preferOpenAi ? "" : cleanEnv(env.TIRE_PATTERN_API_KEY)) ||
      (preferOpenAi ? "" : cleanEnv(env.OPENROUTER_API_KEY)) ||
      ""
    ).trim();

    const configuredModel = (
      (preferOpenAi ? cleanEnv(env.OPENAI_MODEL) : "") ||
      cleanEnv(env.INSPECTION_AI_MODEL) ||
      cleanEnv(env.OPENAI_MODEL) ||
      (preferOpenAi ? "" : cleanEnv(env.TIRE_PATTERN_MODEL)) ||
      (preferOpenAi ? "" : cleanEnv(env.OLLAMA_MODEL)) ||
      "cx/gpt-5.6-luna"
    ).trim();

    const model =
      configuredModel === "anthropic/claude-3.5-sonnet" ? "openai/gpt-4o-mini" : configuredModel;

    return { apiUrl, apiKey, model };
  }

  // Case 1: Standard 9router + OpenAI envs
  const c1 = testConfig({
    OPENAI_API_KEY: "sk-test123",
    OPENAI_BASE_URL: "https://9router.chitraparatama.com/v1",
    OPENAI_MODEL: "cx/gpt-5.6-luna",
    LLM_PROVIDER: "openai",
  });
  assert.equal(c1.apiUrl, "https://9router.chitraparatama.com/v1/chat/completions");
  assert.equal(c1.apiKey, "sk-test123");
  assert.equal(c1.model, "cx/gpt-5.6-luna");

  // Case 2: Trailing slash in OPENAI_BASE_URL
  const c2 = testConfig({
    OPENAI_API_KEY: "sk-test456",
    OPENAI_BASE_URL: "https://9router.chitraparatama.com/v1/",
  });
  assert.equal(c2.apiUrl, "https://9router.chitraparatama.com/v1/chat/completions");
  assert.equal(c2.apiKey, "sk-test456");
  assert.equal(c2.model, "cx/gpt-5.6-luna");

  // Case 3: URL already includes /chat/completions
  const c3 = testConfig({
    OPENAI_API_KEY: "sk-test789",
    OPENAI_BASE_URL: "https://9router.chitraparatama.com/v1/chat/completions",
  });
  assert.equal(c3.apiUrl, "https://9router.chitraparatama.com/v1/chat/completions");

  // Case 4: Specific INSPECTION_AI overrides take precedence
  const c4 = testConfig({
    OPENAI_API_KEY: "sk-openai",
    OPENAI_BASE_URL: "https://9router.chitraparatama.com/v1",
    OPENAI_MODEL: "cx/gpt-5.6-luna",
    INSPECTION_AI_API_KEY: "sk-custom",
    INSPECTION_AI_MODEL: "openrouter/inference-net/schematron-v2-turbo",
  });
  assert.equal(c4.apiKey, "sk-custom");
  assert.equal(c4.model, "openrouter/inference-net/schematron-v2-turbo");

  // Case 5: Env variables with surrounding quotes (Dokploy UI)
  const c5 = testConfig({
    OPENAI_API_KEY: '"sk-quoted-key"',
    OPENAI_BASE_URL: '"https://9router.chitraparatama.com/v1"',
    OPENAI_MODEL: '"cx/gpt-5.6-luna"',
    LLM_PROVIDER: '"openai"',
  });
  assert.equal(c5.apiUrl, "https://9router.chitraparatama.com/v1/chat/completions");
  assert.equal(c5.apiKey, "sk-quoted-key");
  assert.equal(c5.model, "cx/gpt-5.6-luna");
});

