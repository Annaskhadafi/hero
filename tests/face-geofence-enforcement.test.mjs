import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const route = readFileSync('app/api/mobile/v2/face-recognition/route.ts', 'utf8')
const client = readFileSync('app/mobile/attendance/face-v2/face-v2-client.tsx', 'utf8')

test('face check-in blocks outside attendance when site policy is disabled', () => {
  assert.match(route, /allowOutsideAttendance: sites\.allowOutsideAttendance/)
  assert.match(route, /resolvedEventType === 'checked-in'/)
  assert.match(route, /boundary\.status === 'outside'/)
  assert.match(route, /boundary\.status === 'unknown'/)
  assert.match(route, /'GEOFENCE_GPS_REQUIRED'/)
  assert.match(route, /site\.allowOutsideAttendance === false/)
  assert.match(route, /errorResponse\(\s*422,\s*'GEOFENCE_OUTSIDE'/s)
  assert.ok(route.indexOf("'GEOFENCE_OUTSIDE'") < route.indexOf('const [antiSpoofRes'))
  assert.ok(route.indexOf("'GEOFENCE_OUTSIDE'") < route.indexOf('.insert(attendanceRecords)'))
  assert.ok(route.indexOf("'GEOFENCE_GPS_REQUIRED'") < route.indexOf('.insert(attendanceRecords)'))
  assert.ok(route.indexOf("'GEOFENCE_GPS_REQUIRED'") < route.indexOf('await syncFaceAttendanceToTimesheet'))
})

test('face client treats geofence rejection as terminal in camera and manual flows', () => {
  assert.equal((client.match(/code === 'GEOFENCE_OUTSIDE'/g) || []).length, 2)
  assert.match(client, /code === 'GEOFENCE_GPS_REQUIRED'/)
  assert.match(client, /data\?\.error\?\.code === 'GEOFENCE_GPS_REQUIRED'/)
  assert.equal((client.match(/data\?\.error\?\.code === 'GEOFENCE_OUTSIDE'/g) || []).length, 1)
  assert.ok(client.includes("setErrorMessage(data?.error?.message || 'Anda berada di luar lokasi absensi yang dikonfigurasi.')"))
  assert.ok(client.includes("setErrorMessage(data.error.message || 'Anda berada di luar lokasi absensi yang dikonfigurasi.')"))
})
