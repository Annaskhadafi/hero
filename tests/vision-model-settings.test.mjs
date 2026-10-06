import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = (file) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('vision model settings and desktop tire damage detection integration', () => {
  const settingsLib = read('lib/vision-model-settings.ts')
  const settingsActions = read('app/dashboard/settings/vision-model/actions.ts')
  const settingsClient = read('app/dashboard/settings/vision-model/client-page.tsx')
  const settingsPage = read('app/dashboard/settings/vision-model/page.tsx')
  const desktopTireClient = read('app/dashboard/hero-genius/tire-damage/client-page.tsx')
  const desktopTirePage = read('app/dashboard/hero-genius/tire-damage/page.tsx')
  const predictRoute = read('app/api/tire-damage/predict/route.ts')
  const feedbackRoute = read('app/api/tire-damage/feedback/route.ts')
  const heroAdmin = read('lib/hero-admin.ts')
  const visionClient = read('lib/raray-vision/client.ts')

  // 1. Settings Library
  assert.match(settingsLib, /SETTINGS_KEY_VISION_TIRE_MODEL = 'vision_tire_model_settings'/)
  assert.match(settingsLib, /DEFAULT_VISION_MODEL_SETTINGS/)
  assert.match(settingsLib, /tire-demage-onnx/)
  assert.match(settingsLib, /tire-demage/)
  assert.match(settingsLib, /getVisionModelSettings/)
  assert.match(settingsLib, /saveVisionModelSettings/)
  assert.match(settingsLib, /testVisionEndpoint/)

  // 2. Settings Server Actions & Pages
  assert.match(settingsActions, /fetchVisionModelSettingsAction/)
  assert.match(settingsActions, /updateVisionModelSettingsAction/)
  assert.match(settingsActions, /testVisionConnectionAction/)
  assert.match(settingsPage, /VisionModelSettingsClient/)
  assert.match(settingsClient, /Vision Base URL/)
  assert.match(settingsClient, /Model Utama \(Default\)/)
  assert.match(settingsClient, /Model Cadangan \(Fallback\)/)
  assert.match(settingsClient, /Jadikan Default/)
  assert.match(settingsClient, /Uji Koneksi/)

  // 3. Desktop Tire Damage Detection
  assert.match(desktopTirePage, /DesktopTireDamageClient/)
  assert.match(desktopTireClient, /Deteksi Kerusakan Ban \(AI\)/)
  assert.match(desktopTireClient, /Pilihan Model Serving & Threshold/)
  assert.match(desktopTireClient, /Confidence Threshold/)
  assert.match(desktopTireClient, /IoU Overlap/)
  assert.match(desktopTireClient, /Analisis Kerusakan Ban Sekarang/)
  assert.match(desktopTireClient, /Hero Genius AI Insight & Solusi/)
  assert.match(desktopTireClient, /Apakah hasil deteksi ini akurat\?/)
  assert.match(desktopTireClient, /Gunakan Webcam/)

  // 4. API Routes & Aliases
  assert.match(predictRoute, /app\/api\/mobile\/tire-damage\/predict\/route/)
  assert.match(feedbackRoute, /app\/api\/mobile\/tire-damage\/feedback\/route/)

  const mobilePredictRoute = read('app/api/mobile/tire-damage/predict/route.ts')
  const mobileTirePage = read('app/mobile/hse/tire-damage/page.tsx')
  assert.match(mobilePredictRoute, /getVisionModelSettings/)
  assert.match(mobilePredictRoute, /primaryEndpoint/)
  assert.match(mobileTirePage, /activeModelInfo/)

  // 5. Navigation & Admin Registration
  assert.match(heroAdmin, /\/dashboard\/hero-genius\/tire-damage/)
  assert.match(heroAdmin, /\/dashboard\/settings\/vision-model/)
  assert.match(heroAdmin, /settings_vision_model/)

  // 6. Dynamic client integration
  assert.match(visionClient, /getVisionModelSettings/)
  assert.match(visionClient, /dynamicBaseUrl/)
})
