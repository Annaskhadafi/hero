import {
  calculateAttendancePunctuality,
  evaluateAttendanceGridPunctuality,
  inferShiftCodeForEvent,
  normalizeSiteAttendanceClockConfig,
  resolveSiteAttendanceClockConfig,
  updatePunctualityInNote,
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

  describe('resolveSiteAttendanceClockConfig', () => {
    it('resolves site-specific shift times and timezone from schedulingConfig', () => {
      const siteConfig = resolveSiteAttendanceClockConfig(
        {
          id: 1,
          name: 'Site Borneo',
          location: 'Balikpapan',
          timezone: 'WITA',
        },
        {
          siteId: 1,
          timezone: 'WITA',
          fieldBreakConfig: {
            dayShiftClockIn: '07:30',
            nightShiftClockIn: '19:30',
          },
        }
      )

      expect(siteConfig.timezone).toBe('WITA')
      expect(siteConfig.dayShiftClockIn).toBe('07:30')
      expect(siteConfig.nightShiftClockIn).toBe('19:30')
    })

    it('respects site timezone when scheduling config has no timezone', () => {
      const siteConfig = resolveSiteAttendanceClockConfig(
        {
          id: 2,
          name: 'Head Office Jakarta',
          location: 'Jakarta',
          timezone: 'WIB',
        },
        {
          siteId: 2,
          fieldBreakConfig: {
            dayShiftClockIn: '08:30',
          },
        }
      )

      expect(siteConfig.timezone).toBe('WIB')
      expect(siteConfig.dayShiftClockIn).toBe('08:30')
      expect(siteConfig.nightShiftClockIn).toBe('18:00') // default fallback
    })

    it('infers timezone from site location when timezone is not set', () => {
      const siteConfig = resolveSiteAttendanceClockConfig(
        {
          id: 3,
          name: 'Site Timika Papua',
          location: 'Timika, Papua',
        },
        null
      )

      expect(siteConfig.timezone).toBe('WIT')
      expect(siteConfig.dayShiftClockIn).toBe('08:00')
      expect(siteConfig.nightShiftClockIn).toBe('18:00')
    })
  })

  describe('evaluateAttendanceGridPunctuality', () => {
    const siteConfig = {
      dayShiftClockIn: '08:30',
      nightShiftClockIn: '19:00',
      timezone: 'WITA' as const,
    }

    it('calculates on-time status correctly based on site dayShiftClockIn', () => {
      const result = evaluateAttendanceGridPunctuality({
        clockIn: '08:20',
        scheduleCode: 'DS',
        siteConfig,
      })

      expect(result.isLate).toBe(false)
      expect(result.lateMinutes).toBe(0)
      expect(result.scheduledClockIn).toBe('08:30')
      expect(result.punctualityNote).toBe('Kehadiran: Tepat waktu (jadwal 08:30)')
    })

    it('calculates late status correctly based on site dayShiftClockIn', () => {
      const result = evaluateAttendanceGridPunctuality({
        clockIn: '08:45',
        scheduleCode: 'DS',
        siteConfig,
      })

      expect(result.isLate).toBe(true)
      expect(result.lateMinutes).toBe(15)
      expect(result.scheduledClockIn).toBe('08:30')
      expect(result.punctualityNote).toBe('Kehadiran: Terlambat 15 menit (jadwal 08:30)')
    })

    it('calculates night shift punctuality based on site nightShiftClockIn', () => {
      const onTime = evaluateAttendanceGridPunctuality({
        clockIn: '18:50',
        scheduleCode: 'NS',
        siteConfig,
      })
      expect(onTime.isLate).toBe(false)
      expect(onTime.lateMinutes).toBe(0)
      expect(onTime.scheduledClockIn).toBe('19:00')

      const late = evaluateAttendanceGridPunctuality({
        clockIn: '19:25',
        scheduleCode: 'NS',
        siteConfig,
      })
      expect(late.isLate).toBe(true)
      expect(late.lateMinutes).toBe(25)
      expect(late.scheduledClockIn).toBe('19:00')
      expect(late.punctualityNote).toBe('Kehadiran: Terlambat 25 menit (jadwal 19:00)')
    })

    it('infers shift for off-day attendance without schedule code', () => {
      const nightClockIn = evaluateAttendanceGridPunctuality({
        clockIn: '19:10',
        scheduleCode: 'OFF',
        siteConfig,
      })
      expect(nightClockIn.shiftCode).toBe('OFF')
      expect(nightClockIn.scheduledClockIn).toBe('19:00')
      expect(nightClockIn.isLate).toBe(true)
      expect(nightClockIn.lateMinutes).toBe(10)

      const dayClockIn = evaluateAttendanceGridPunctuality({
        clockIn: '08:15',
        scheduleCode: null,
        siteConfig,
      })
      expect(dayClockIn.scheduledClockIn).toBe('08:30')
      expect(dayClockIn.isLate).toBe(false)
      expect(dayClockIn.lateMinutes).toBe(0)
    })

    it('returns nulls when clockIn is missing', () => {
      const result = evaluateAttendanceGridPunctuality({
        clockIn: '',
        scheduleCode: 'DS',
        siteConfig,
      })
      expect(result.isLate).toBe(false)
      expect(result.lateMinutes).toBeNull()
      expect(result.punctualityNote).toBeNull()
    })
  })

  describe('updatePunctualityInNote', () => {
    it('replaces existing Kehadiran segment with newly calculated punctuality note', () => {
      const rawNote =
        'Face Attendance | Kehadiran: Terlambat 20 menit (jadwal 08:00) | Confidence 99%'
      const updated = updatePunctualityInNote(
        rawNote,
        'Kehadiran: Tepat waktu (jadwal 08:30)'
      )

      expect(updated).toBe(
        'Face Attendance | Kehadiran: Tepat waktu (jadwal 08:30) | Confidence 99%'
      )
    })

    it('appends punctuality note if no Kehadiran segment was present', () => {
      const rawNote = 'Face Attendance | Confidence 99%'
      const updated = updatePunctualityInNote(
        rawNote,
        'Kehadiran: Terlambat 10 menit (jadwal 08:30)'
      )

      expect(updated).toBe(
        'Face Attendance | Confidence 99% | Kehadiran: Terlambat 10 menit (jadwal 08:30)'
      )
    })

    it('returns punctuality note when baseNote is empty', () => {
      expect(updatePunctualityInNote('', 'Kehadiran: Tepat waktu (jadwal 08:00)')).toBe(
        'Kehadiran: Tepat waktu (jadwal 08:00)'
      )
    })
  })

  describe('Attendance Grid Lateness Regression (User Bug)', () => {
    it('does not falsely flag Terlambat when stored note has Terlambat but selected site schedule allows it', () => {
      // Scenario: Employee checked in at 08:15.
      // Old capture stored: "Kehadiran: Terlambat 15 menit (jadwal 08:00)".
      // But selected site config has dayShiftClockIn = 08:30.
      const siteConfig = {
        dayShiftClockIn: '08:30',
        nightShiftClockIn: '18:00',
        timezone: 'WITA' as const,
      }
      const storedLocationNote =
        'Face Attendance | Kehadiran: Terlambat 15 menit (jadwal 08:00) | Validasi 99%'

      const punctuality = evaluateAttendanceGridPunctuality({
        clockIn: '08:15',
        scheduleCode: 'DS',
        siteConfig,
      })

      // Must be evaluated against site's 08:30, NOT the stored 08:00 note
      expect(punctuality.isLate).toBe(false)
      expect(punctuality.lateMinutes).toBe(0)
      expect(punctuality.scheduledClockIn).toBe('08:30')

      const updatedNote = updatePunctualityInNote(
        storedLocationNote,
        punctuality.punctualityNote
      )
      expect(updatedNote).toBe(
        'Face Attendance | Kehadiran: Tepat waktu (jadwal 08:30) | Validasi 99%'
      )
    })

    it('flags Terlambat when stored note says Tepat waktu but site requires earlier clock-in', () => {
      // Scenario: Employee checked in at 07:45.
      // Old capture stored: "Kehadiran: Tepat waktu (jadwal 08:00)".
      // But selected site config has dayShiftClockIn = 07:30.
      const siteConfig = {
        dayShiftClockIn: '07:30',
        nightShiftClockIn: '18:00',
        timezone: 'WITA' as const,
      }
      const storedLocationNote =
        'Face Attendance | Kehadiran: Tepat waktu (jadwal 08:00)'

      const punctuality = evaluateAttendanceGridPunctuality({
        clockIn: '07:45',
        scheduleCode: 'DS',
        siteConfig,
      })

      expect(punctuality.isLate).toBe(true)
      expect(punctuality.lateMinutes).toBe(15)
      expect(punctuality.scheduledClockIn).toBe('07:30')

      const updatedNote = updatePunctualityInNote(
        storedLocationNote,
        punctuality.punctualityNote
      )
      expect(updatedNote).toBe(
        'Face Attendance | Kehadiran: Terlambat 15 menit (jadwal 07:30)'
      )
    })
  })
})
