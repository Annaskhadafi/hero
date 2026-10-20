import {
  checkEmployeeOffDayStatus,
  evaluateAttendanceGridPunctuality,
  isStaffRole,
  normalizeSiteAttendanceClockConfig,
  resolveConfiguredShiftClockIn,
  resolveSiteAttendanceClockConfig,
} from '@/lib/timesheet/attendance-punctuality'

describe('Hybrid Shift Dual Roster & Staff vs Non-Staff Working Time', () => {
  const hybridSiteConfig = normalizeSiteAttendanceClockConfig({
    scheduleType: 'hybrid',
    rosterType: '6:1',
    rosterTypeStaff: '5:2',
    rosterTypeNonStaff: '6:1',
    dayShiftClockIn: '06:00',
    dayShiftClockOut: '18:00',
    nightShiftClockIn: '18:00',
    nightShiftClockOut: '06:00',
    staffDayShiftClockIn: '08:00',
    staffDayShiftClockOut: '17:00',
    staffNightShiftClockIn: '18:00',
    staffNightShiftClockOut: '06:00',
    timezone: 'WITA',
  })

  describe('isStaffRole detection', () => {
    it('accurately distinguishes Staff vs Non-Staff roles', () => {
      expect(isStaffRole('Staff Admin', 'Admin Operational', 'Staff')).toBe(true)
      expect(isStaffRole('Supervisor', 'SPV Retread', 'Supervisor')).toBe(true)
      expect(isStaffRole('Tyreman', 'Mekanik Ban', 'Non-Staff')).toBe(false)
      expect(isStaffRole('Serviceman', 'Serviceman OTR', 'Non-Staff')).toBe(false)
      expect(isStaffRole('Operator', 'Operator Loader', 'Non Staff')).toBe(false)
    })
  })

  describe('resolveConfiguredShiftClockIn with Hybrid shift', () => {
    it('resolves Staff day shift to staffDayShiftClockIn (08:00)', () => {
      const staffClockIn = resolveConfiguredShiftClockIn('IN', hybridSiteConfig, true)
      expect(staffClockIn).toBe('08:00')

      const staffDsClockIn = resolveConfiguredShiftClockIn('DS', hybridSiteConfig, true)
      expect(staffDsClockIn).toBe('08:00')
    })

    it('resolves Non-Staff day shift to dayShiftClockIn (06:00)', () => {
      const nonStaffClockIn = resolveConfiguredShiftClockIn('IN', hybridSiteConfig, false)
      expect(nonStaffClockIn).toBe('06:00')

      const nonStaffDsClockIn = resolveConfiguredShiftClockIn('DS', hybridSiteConfig, false)
      expect(nonStaffDsClockIn).toBe('06:00')
    })
  })

  describe('evaluateAttendanceGridPunctuality (Bug Fix Verification)', () => {
    it('flags Staff clocking in at 07:55 or 08:00 as ON TIME (Tepat waktu)', () => {
      // Prior bug: Staff clocking in at 08:00 on hybrid site was flagged late by 120 min against 06:00
      const onTimeStaff = evaluateAttendanceGridPunctuality({
        clockIn: '07:55',
        scheduleCode: 'IN',
        siteConfig: hybridSiteConfig,
        isStaff: true,
      })
      expect(onTimeStaff.isLate).toBe(false)
      expect(onTimeStaff.scheduledClockIn).toBe('08:00')
      expect(onTimeStaff.punctualityNote).toBe('Kehadiran: Tepat waktu (jadwal 08:00)')

      const exactStaff = evaluateAttendanceGridPunctuality({
        clockIn: '08:00',
        scheduleCode: 'IN',
        siteConfig: hybridSiteConfig,
        isStaff: true,
      })
      expect(exactStaff.isLate).toBe(false)
      expect(exactStaff.scheduledClockIn).toBe('08:00')
      expect(exactStaff.punctualityNote).toBe('Kehadiran: Tepat waktu (jadwal 08:00)')
    })

    it('flags Staff clocking in at 08:15 as 15 minutes late, NOT 135 minutes late', () => {
      const lateStaff = evaluateAttendanceGridPunctuality({
        clockIn: '08:15',
        scheduleCode: 'IN',
        siteConfig: hybridSiteConfig,
        isStaff: true,
      })
      expect(lateStaff.isLate).toBe(true)
      expect(lateStaff.lateMinutes).toBe(15)
      expect(lateStaff.scheduledClockIn).toBe('08:00')
      expect(lateStaff.punctualityNote).toBe('Kehadiran: Terlambat 15 menit (jadwal 08:00)')
    })

    it('flags Non-Staff clocking in at 06:00 as ON TIME, and at 07:00 as 60 minutes late', () => {
      const onTimeNonStaff = evaluateAttendanceGridPunctuality({
        clockIn: '05:50',
        scheduleCode: 'DS',
        siteConfig: hybridSiteConfig,
        isStaff: false,
      })
      expect(onTimeNonStaff.isLate).toBe(false)
      expect(onTimeNonStaff.scheduledClockIn).toBe('06:00')

      const lateNonStaff = evaluateAttendanceGridPunctuality({
        clockIn: '07:00',
        scheduleCode: 'DS',
        siteConfig: hybridSiteConfig,
        isStaff: false,
      })
      expect(lateNonStaff.isLate).toBe(true)
      expect(lateNonStaff.lateMinutes).toBe(60)
      expect(lateNonStaff.scheduledClockIn).toBe('06:00')
      expect(lateNonStaff.punctualityNote).toBe('Kehadiran: Terlambat 60 menit (jadwal 06:00)')
    })
  })

  describe('resolveSiteAttendanceClockConfig resolution from DB payload', () => {
    it('parses hybrid roster types and staff working hours correctly', () => {
      const parsed = resolveSiteAttendanceClockConfig(
        {
          id: 10,
          name: 'Sangatta KPC',
          location: 'Sangatta',
          timezone: 'WITA',
        },
        {
          siteId: 10,
          timezone: 'WITA',
          scheduleType: 'hybrid',
          rosterType: '6:1',
          fieldBreakConfig: {
            rosterTypeStaff: '5:2',
            rosterTypeNonStaff: '6:1',
            dayShiftClockIn: '06:00',
            dayShiftClockOut: '18:00',
            nightShiftClockIn: '18:00',
            nightShiftClockOut: '06:00',
            staffDayShiftClockIn: '08:00',
            staffDayShiftClockOut: '17:00',
          },
        }
      )

      expect(parsed.scheduleType).toBe('hybrid')
      expect(parsed.rosterTypeStaff).toBe('5:2')
      expect(parsed.rosterTypeNonStaff).toBe('6:1')
      expect(parsed.dayShiftClockIn).toBe('06:00')
      expect(parsed.staffDayShiftClockIn).toBe('08:00')
      expect(parsed.staffDayShiftClockOut).toBe('17:00')
    })
  })

  describe('checkEmployeeOffDayStatus on Hybrid site', () => {
    it('blocks Staff on weekend for 5:2 roster but allows Non-Staff on weekday', () => {
      // Saturday: 2026-10-17
      const saturday = new Date('2026-10-17T08:00:00+08:00')
      const staffCheck = checkEmployeeOffDayStatus({
        eventTime: saturday,
        role: 'Staff Finance',
        scheduleType: 'hybrid',
        rosterType: '6:1',
        rosterTypeStaff: '5:2',
        rosterTypeNonStaff: '6:1',
        timeZone: 'WITA',
      })
      expect(staffCheck.isOffDay).toBe(true)
      expect(staffCheck.allowAttendance).toBe(false)

      // Monday: 2026-10-19
      const monday = new Date('2026-10-19T08:00:00+08:00')
      const weekdayStaffCheck = checkEmployeeOffDayStatus({
        eventTime: monday,
        role: 'Staff Finance',
        scheduleType: 'hybrid',
        rosterType: '6:1',
        rosterTypeStaff: '5:2',
        rosterTypeNonStaff: '6:1',
        timeZone: 'WITA',
      })
      expect(weekdayStaffCheck.isOffDay).toBe(false)
      expect(weekdayStaffCheck.allowAttendance).toBe(true)
    })
  })
})
