import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = (file) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('desktop tire damage page exposes model and API URL settings without browser secrets', () => {
  const page = read('app/dashboard/hse/tire-damage/tire-damage-desktop-client.tsx')
  const route = read('app/api/mobile/tire-damage/predict/route.ts')
  const vision = read('lib/raray-vision/client.ts')
  assert.match(page, /hero\.tireDamage\.settings/)
  assert.match(page, /model_endpoint/)
  assert.match(page, /api_url/)
  assert.match(page, /video\/mp4/)
  assert.doesNotMatch(page, /RARAY_VISION_API_KEY|RARAY_VISION_PASSWORD/)
  assert.match(route, /validateApiUrl/)
  assert.match(route, /model_endpoint/)
  assert.match(vision, /modelEndpoint/)
  assert.match(vision, /baseUrlOverride/)
})
