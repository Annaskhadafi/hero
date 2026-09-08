import {
  calculateAttendancePunctuality,
  calculateLateMinutesFromTimes,
  inferShiftCodeForEvent,
  isOffScheduleCode,
  normalizeSiteAttendanceClockConfig,
  resolveConfiguredShiftClockIn,
} from '@/lib/timesheet/attendance-punctuality'
import {
  minutesFromTime,
  normalizeTo24HourTime,
  formatTo12HourTime,
} from '@/lib/timesheet/attendance-real'

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

  it('correctly handles 12-hour AM/PM and 24-hour time strings', () => {
    expect(minutesFromTime('06:24 PM')).toBe(18 * 60 + 24)
    expect(minutesFromTime('6:24 pm')).toBe(18 * 60 + 24)
    expect(minutesFromTime('18:24')).toBe(18 * 60 + 24)
    expect(minutesFromTime('06:24 AM')).toBe(6 * 60 + 24)
    expect(minutesFromTime('12:00 AM')).toBe(0)
    expect(minutesFromTime('12:00 PM')).toBe(720)

    expect(normalizeTo24HourTime('06:24 PM')).toBe('18:24')
    expect(normalizeTo24HourTime('6:24 AM')).toBe('06:24')
    expect(normalizeTo24HourTime('18:24')).toBe('18:24')

    expect(formatTo12HourTime('18:24')).toBe('06:24 PM')
    expect(formatTo12HourTime('08:00')).toBe('08:00 AM')
    expect(formatTo12HourTime('00:00')).toBe('12:00 AM')
    expect(formatTo12HourTime('12:00')).toBe('12:00 PM')
  })

  it('calculates late minutes accurately for Night Shift (18:00) with 06:24 PM (+24m, not +624m)', () => {
    const scheduled = resolveConfiguredShiftClockIn('NS', {
      dayShiftClockIn: '08:00',
      nightShiftClockIn: '18:00',
      timezone: 'WITA',
    })
    expect(scheduled).toBe('18:00')

    // 06:24 PM against 18:00 schedule -> 24 minutes late
    expect(calculateLateMinutesFromTimes('06:24 PM', scheduled)).toBe(24)
    expect(calculateLateMinutesFromTimes('18:24', scheduled)).toBe(24)

    // On time (17:55 against 18:00) -> 0 minutes late
    expect(calculateLateMinutesFromTimes('17:55', scheduled)).toBe(0)
    expect(calculateLateMinutesFromTimes('05:55 PM', scheduled)).toBe(0)
  })

  it('correctly identifies off-schedule codes and suppresses late calculation', () => {
    expect(isOffScheduleCode('OFF')).toBe(true)
    expect(isOffScheduleCode('FB')).toBe(true)
    expect(isOffScheduleCode('LIBUR')).toBe(true)
    expect(isOffScheduleCode('CUTI')).toBe(true)
    expect(isOffScheduleCode('SAKIT')).toBe(true)
    expect(isOffScheduleCode('IZIN')).toBe(true)
    expect(isOffScheduleCode('DS')).toBe(false)
    expect(isOffScheduleCode('NS')).toBe(false)
    expect(isOffScheduleCode('IN')).toBe(false)
    expect(isOffScheduleCode('PAGI')).toBe(false)
    expect(isOffScheduleCode('MALAM')).toBe(false)
  })

  it('resolves night shift aliases (NG, M, S2) and day shift aliases (PAGI, SIANG, S1)', () => {
    const siteCfg = {
      dayShiftClockIn: '08:00',
      nightShiftClockIn: '18:00',
      timezone: 'WITA' as const,
    }
    expect(resolveConfiguredShiftClockIn('NG', siteCfg)).toBe('18:00')
    expect(resolveConfiguredShiftClockIn('M', siteCfg)).toBe('18:00')
    expect(resolveConfiguredShiftClockIn('S2', siteCfg)).toBe('18:00')
    expect(resolveConfiguredShiftClockIn('PAGI', siteCfg)).toBe('08:00')
    expect(resolveConfiguredShiftClockIn('SIANG', siteCfg)).toBe('08:00')
    expect(resolveConfiguredShiftClockIn('S1', siteCfg)).toBe('08:00')
    expect(resolveConfiguredShiftClockIn('OFF', siteCfg)).toBeNull()
    expect(resolveConfiguredShiftClockIn('FB', siteCfg)).toBeNull()
  })
})
