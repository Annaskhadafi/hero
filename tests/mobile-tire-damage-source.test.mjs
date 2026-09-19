import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = (file) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('mobile tire damage keeps Vision credentials server-side and enforces existing inspection access', () => {
  const route = read('app/api/mobile/tire-damage/predict/route.ts')
  const downloadRoute = read('app/api/mobile/tire-damage/download/route.ts')
  const client = read('app/mobile/hse/tire-damage/page.tsx')
  const visionClient = read('lib/raray-vision/client.ts')

  assert.match(route, /getCurrentMenuPermission\('hse_tire_inspection'\)/)
  assert.match(route, /ALLOWED_MEDIA_TYPES/)
  assert.match(client, /fetch\('\/api\/mobile\/tire-damage\/predict'/)
  assert.match(client, /MAX_IMAGE_DIMENSION = 1600/)
  assert.match(client, /image\/jpeg', 0\.82/)
  assert.match(client, /createImageBitmap/)
  assert.match(client, /Menyiapkan foto agar unggah lebih cepat/)
  assert.doesNotMatch(client, /HSE • AI INSPECTION/)
  assert.match(client, /transition-\[width\] duration-700/)
  assert.match(client, /animate-pulse/)
  assert.match(client, /Unduh Gambar/)
  assert.doesNotMatch(client, /JSON\.stringify\(result, null, 2\)/)
  assert.match(downloadRoute, /Content-Disposition/)
  assert.match(downloadRoute, /is3\.cloudhost\.id/)
  assert.doesNotMatch(client, /RARAY_VISION_API_KEY|rv_c861/)
  assert.match(visionClient, /\/api\/v1\/models\/endpoints\/tire-demage\/predict/)
})
