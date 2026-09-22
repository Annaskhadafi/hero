import assert from 'node:assert/strict'
import test from 'node:test'
import selectionModule from '../lib/timesheet/attendance-selection.ts'

const { selectAttendancePunches } = selectionModule

const site = { geoLatitude: '-6.2', geoLongitude: '106.8', geoRadiusMeters: null }
const configuredSite = { geoLatitude: '-6.2', geoLongitude: '106.8', geoRadiusMeters: 500 }
const punch = (id, eventType, eventTime, latitude = null, longitude = null) => ({
  id,
  eventType,
  eventTime,
  latitude,
  longitude,
  locationNote: null,
})

test('ranks each explicit punch type by nearest configured GPS', () => {
  const result = selectAttendancePunches(
    [
      punch(1, 'checked-in', '2026-09-22T08:00:00+07:00', '-6.21', '106.80'),
      punch(2, 'checked-in', '2026-09-22T08:01:00+07:00', '-6.2001', '106.8001'),
      punch(3, 'checked-out', '2026-09-22T17:00:00+07:00', '-6.21', '106.80'),
      punch(4, 'checked-out', '2026-09-22T17:01:00+07:00', '-6.2001', '106.8001'),
    ],
    { site: configuredSite }
  )

  assert.equal(result.checkIn?.id, 2)
  assert.equal(result.checkOut?.id, 4)
})

test('uses scheduled clock-in proximity when the boundary is unconfigured', () => {
  const result = selectAttendancePunches(
    [
      punch(1, 'checked-in', '2026-09-22T07:35:00+08:00', '-6.2', '106.8'),
      punch(2, 'checked-in', '2026-09-22T08:03:00+08:00', '-6.3', '106.9'),
    ],
    { site: site, scheduledClockIn: '08:00', timeZone: 'WITA' }
  )

  assert.equal(result.checkIn?.id, 2)
})

test('does not let an explicit checkout compete with check-in selection', () => {
  const result = selectAttendancePunches(
    [
      punch(1, 'checked-in', '2026-09-22T08:00:00+07:00', '-6.2001', '106.8001'),
      punch(2, 'checked-out', '2026-09-22T17:00:00+07:00', '-6.2001', '106.8001'),
    ],
    { site: configuredSite }
  )

  assert.equal(result.checkIns.length, 1)
  assert.equal(result.checkOuts.length, 1)
  assert.equal(result.checkIn?.eventType, 'checked-in')
  assert.equal(result.checkOut?.eventType, 'checked-out')
})

test('uses latest checkout when GPS distance ties', () => {
  const result = selectAttendancePunches(
    [
      punch(1, 'checked-out', '2026-09-22T17:00:00+07:00', '-6.2', '106.8'),
      punch(2, 'checked-out', '2026-09-22T17:05:00+07:00', '-6.2', '106.8'),
    ],
    { site: configuredSite }
  )

  assert.equal(result.checkOut?.id, 2)
})

test('ranks GPS-missing candidates last and falls back to time when all are missing', () => {
  const mixed = selectAttendancePunches(
    [
      punch(1, 'checked-in', '2026-09-22T08:00:00+07:00'),
      punch(2, 'checked-in', '2026-09-22T08:01:00+07:00', '-6.2001', '106.8001'),
    ],
    { site: configuredSite }
  )
  assert.equal(mixed.checkIn?.id, 2)
  assert.equal(mixed.checkIns.at(-1)?.id, 1)

  const allMissing = selectAttendancePunches(
    [
      punch(3, 'checked-in', '2026-09-22T07:55:00+07:00'),
      punch(4, 'checked-in', '2026-09-22T08:05:00+07:00'),
    ],
    { site: configuredSite }
  )
  assert.equal(allMissing.checkIn?.id, 3)
})
