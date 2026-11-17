import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = (file) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('mobile road hazard keeps Vision credentials server-side and has full workflow', () => {
  const predictRoute = read('app/api/mobile/road-hazard/predict/route.ts')
  const sessionRoute = read('app/api/mobile/road-hazard/session/route.ts')
  const visionClient = read('lib/raray-vision/client.ts')
  const cameraView = read('components/mobile/road-hazard/road-hazard-camera-view.tsx')
  const recapView = read('components/mobile/road-hazard/road-hazard-recap-view.tsx')
  const servicesNav = read('components/mobile/mobile-dashboard-services.tsx')
  const uploadRoute = read('app/api/uploads/[...path]/route.ts')
  const resolveUpload = read('lib/resolve-upload-url.ts')

  // 1. Vision API Client check
  assert.match(visionClient, /export async function rarayPredictRoadHazard/)
  assert.match(visionClient, /targetSlug = isVideo \? 'roadhazard-video' : 'roadhazard'/)
  assert.match(visionClient, /endpoints\/\$\{targetSlug\}\/predict/)

  // 2. Predict route check
  assert.match(predictRoute, /rarayPredictRoadHazard/)
  assert.match(predictRoute, /ALLOWED_MEDIA_TYPES/)
  assert.match(predictRoute, /normalizedDetections/)
  assert.match(predictRoute, /potholesCount/)
  assert.match(predictRoute, /corrugationCount/)
  assert.match(predictRoute, /rutsCount/)
  assert.match(predictRoute, /road-hazard/)

  // 3. Security check: API Key is never present in client components
  assert.doesNotMatch(cameraView, /RARAY_VISION_API_KEY/)
  assert.doesNotMatch(recapView, /RARAY_VISION_API_KEY/)

  // 4. Camera View HUD & Snap button check
  assert.match(cameraView, /fetch\('\/api\/mobile\/road-hazard\/predict'/)
  assert.match(cameraView, /handleSnapShoot/)
  assert.match(cameraView, /Potholes/)
  assert.match(cameraView, /Corragation/)
  assert.match(cameraView, /Ruts/)
  assert.match(cameraView, /formatTimer/)
  assert.match(cameraView, /HeroConfirmDialog/)

  // 5. Recap View & PDF generation check
  assert.match(recapView, /generateRoadHazardPdf/)
  assert.match(recapView, /HeroKpiCard/)
  assert.match(recapView, /handleSaveToDatabase/)
  assert.match(recapView, /Total Kendala/)

  // 6. Navigation check
  assert.match(servicesNav, /\/mobile\/hse\/road-hazard/)
  assert.match(servicesNav, /Road Hazard Live AI/)

  // 7. Upload proxy registration
  assert.match(uploadRoute, /'road-hazard'/)
  assert.match(resolveUpload, /road-hazard/)
})
