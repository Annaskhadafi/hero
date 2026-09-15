import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (file) => readFileSync(path.join(root, file), 'utf8')

test('mobile attendance exposes camera photo fallback after automatic retries', () => {
  const client = read('app/mobile/attendance/face-v2/face-v2-client.tsx')
  const route = read('app/api/mobile/v2/face-recognition/route.ts')

  assert.match(client, /const MAX_AUTO_RETRY = 8/)
  assert.match(client, /retryCount >= MAX_AUTO_RETRY/)
  assert.match(client, /manualFallback: true/)
  assert.match(route, /const isManualFallback = manualFallback === true/)
  assert.match(route, /source: isManualFallback \? 'photo-fallback' : 'face-v2'/)
  assert.match(route, /status: isManualFallback \? 'needs-review' : 'verified'/)
  assert.match(route, /syncFaceAttendanceToTimesheet\(empId, sId, eventTime\)/)
})
