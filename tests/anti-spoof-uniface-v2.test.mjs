import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Test source code integration
const clientPath = path.resolve('lib/raray-vision/client.ts')
const clientCode = fs.readFileSync(clientPath, 'utf8')

assert(clientCode.includes('rarayCheckAntiSpoofUniFaceV2'), 'rarayCheckAntiSpoofUniFaceV2 must be defined in client.ts')
assert(clientCode.includes('/api/v1/anti-spoof/uniface-v2'), 'UniFace-v2 API endpoint must be targeted')
assert(clientCode.includes('RarayAntiSpoofResult'), 'RarayAntiSpoofResult interface must be defined')
assert(clientCode.includes('confidence >= 90'), 'Confidence threshold must check >= 90%')

// Test face login route integration
const faceLoginPath = path.resolve('app/api/auth/face-login/route.ts')
const faceLoginCode = fs.readFileSync(faceLoginPath, 'utf8')
assert(faceLoginCode.includes('rarayCheckAntiSpoofUniFaceV2'), 'Face login route must call rarayCheckAntiSpoofUniFaceV2')
assert(faceLoginCode.includes('spoof_detected'), 'Face login route must reject spoof attempts')

// Test face attendance actions integration
const attendanceActionPath = path.resolve('app/actions/face-attendance-actions.ts')
const attendanceActionCode = fs.readFileSync(attendanceActionPath, 'utf8')
assert(attendanceActionCode.includes('rarayCheckAntiSpoofUniFaceV2'), 'Face attendance action must call rarayCheckAntiSpoofUniFaceV2')

// Test mobile v2 face recognition route integration
const mobileV2Path = path.resolve('app/api/mobile/v2/face-recognition/route.ts')
const mobileV2Code = fs.readFileSync(mobileV2Path, 'utf8')
assert(mobileV2Code.includes('rarayCheckAntiSpoofUniFaceV2'), 'Mobile V2 route must call rarayCheckAntiSpoofUniFaceV2')
assert(mobileV2Code.includes('SPOOFING_DETECTED'), 'Mobile V2 route must handle SPOOFING_DETECTED')

// Test multi-attendance kiosk route integration
const multiAttendancePath = path.resolve('app/api/multi-attendance/recognize/route.ts')
const multiAttendanceCode = fs.readFileSync(multiAttendancePath, 'utf8')
assert(multiAttendanceCode.includes('rarayCheckAntiSpoofUniFaceV2'), 'Multi-attendance route must call rarayCheckAntiSpoofUniFaceV2')

console.log('✅ All Anti-Spoof UniFace-v2 Integration Tests Passed!')
