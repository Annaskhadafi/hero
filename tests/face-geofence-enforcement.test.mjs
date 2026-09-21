import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const route = readFileSync('app/api/mobile/v2/face-recognition/route.ts', 'utf8')
const client = readFileSync('app/mobile/attendance/face-v2/face-v2-client.tsx', 'utf8')

test('face attendance allows outside GPS with warning and requires a note when GPS is unavailable', () => {
  assert.match(route, /allowOutsideAttendance: sites\.allowOutsideAttendance/)
  assert.match(route, /boundary\.status === 'outside'/)
  assert.match(route, /boundary\.status === 'unknown'/)
  assert.match(route, /'GEOFENCE_GPS_REQUIRED'/)
  assert.ok(route.indexOf("'GEOFENCE_GPS_REQUIRED'") < route.indexOf('.insert(attendanceRecords)'))
  assert.ok(route.indexOf("'GEOFENCE_GPS_REQUIRED'") < route.indexOf('await syncFaceAttendanceToTimesheet'))
  assert.match(route, /locationExplanation/)
  assert.match(route, /notifyHrGaLocationAlert/)
  assert.match(route, /attendance_location_alert/)
  assert.match(route, /sendPush: false/)
})

test('face client preserves legacy geofence errors and prompts for GPS inside attendance actions', () => {
  assert.equal((client.match(/code === 'GEOFENCE_OUTSIDE'/g) || []).length, 2)
  assert.match(client, /code === 'GEOFENCE_GPS_REQUIRED'/)
  assert.match(client, /data\?\.error\?\.code === 'GEOFENCE_GPS_REQUIRED'/)
  assert.equal((client.match(/data\?\.error\?\.code === 'GEOFENCE_OUTSIDE'/g) || []).length, 1)
  assert.ok(client.includes("setErrorMessage(data?.error?.message || 'Anda berada di luar lokasi absensi yang dikonfigurasi.')"))
  assert.ok(client.includes("setErrorMessage(data.error.message || 'Anda berada di luar lokasi absensi yang dikonfigurasi.')"))
  assert.match(client, /GPS belum aktif/)
  assert.match(client, /locationExplanation/)
  assert.match(client, /Aktifkan GPS/)
  assert.match(client, /locationWarning/)
  assert.match(client, /locationPromptEvent/)
})
