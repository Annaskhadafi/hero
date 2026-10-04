import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const form = readFileSync('components/mobile/mobile-daily-activity-form.tsx', 'utf8')
const sync = readFileSync('lib/offline-sync.ts', 'utf8')

test('mobile DAR draft persists photo payloads per activity', () => {
  assert.match(form, /fileToQueuedPhoto/)
  assert.match(form, /queuedPhotoPayloads/)
  assert.match(form, /photo: entry\.queuedPhotoPayloads\?\.\[0\]/)
  assert.match(form, /photo: queuedPhotoPayloads\[0\] \?\? null/)
})

test('mobile DAR draft restores and uploads queued photos after reload', () => {
  assert.match(form, /setQueuedPhotoPayloads\(draft\.photos/)
  assert.match(form, /queuedPhotoToFile/)
  assert.match(form, /uploadActivityPhoto\(queuedPhotoToFile\(restored\)\)/)
})

test('offline sync validates per-item photos', () => {
  assert.match(sync, /photo: queuedImageFileSchema\.nullable\(\)\.optional\(\)\.default\(null\)/)
  assert.match(sync, /photos: z\.array\(queuedImageFileSchema\)/)
})
