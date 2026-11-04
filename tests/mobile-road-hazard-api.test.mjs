import assert from 'node:assert/strict'
import test from 'node:test'
import dotenv from 'dotenv'
dotenv.config()
import { rarayPredictRoadHazard } from '../lib/raray-vision/client.ts'

test('rarayPredictRoadHazard connects to vision server endpoint', async () => {
  // Test with dummy 1x1 image buffer
  const dummyBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )

  const res = await rarayPredictRoadHazard({
    fileBuffer: dummyBuffer,
    fileName: 'pixel.png',
    mimeType: 'image/png',
    confidenceThreshold: 0.25,
    iouThreshold: 0.45,
  })

  // The endpoint is live and authenticated!
  assert.equal(res.status, 'success')
  assert.ok(res.result)
  assert.equal(res.result.endpoint.slug, 'roadhazard')
  assert.equal(res.result.model_name, 'Road hazard PPA BA')
  assert.ok(Array.isArray(res.result.detections))
})
