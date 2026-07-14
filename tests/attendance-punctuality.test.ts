import {
  calculateAttendancePunctuality,
  inferShiftCodeForEvent,
  normalizeSiteAttendanceClockConfig,
} from '@/lib/timesheet/attendance-punctuality'

describe('site attendance punctuality', () => {
  const config = normalizeSiteAttendanceClockConfig({
    dayShiftClockIn: '06:00',
    nightShiftClockIn: '18:00',
  })

  it('uses the configured DS and NS clock-in times', () => {
    expect(
      calculateAttendancePunctuality({
        eventTime: new Date('2026-07-14T22:05:00.000Z'),
        shiftCode: 'DS',
        scheduledClockIn: config.dayShiftClockIn,
      }).lateMinutes
    ).toBe(5)
    expect(
      calculateAttendancePunctuality({
        eventTime: new Date('2026-07-15T10:12:00.000Z'),
        shiftCode: 'NS',
        scheduledClockIn: config.nightShiftClockIn,
      }).lateMinutes
    ).toBe(12)
  })

  it('keeps early arrivals on time and infers the closest shift when needed', () => {
    expect(
      calculateAttendancePunctuality({
        eventTime: new Date('2026-07-14T21:55:00.000Z'),
        shiftCode: 'DS',
        scheduledClockIn: config.dayShiftClockIn,
      }).isLate
    ).toBe(false)
    expect(inferShiftCodeForEvent(new Date('2026-07-15T10:05:00.000Z'), config)).toBe('night')
  })
})
