import {
  DEFAULT_SITE_OVERTIME_CONFIG,
  calculateConfiguredOvertime,
  calculateOvertime,
  classifyOvertimePolicyDay,
  normalizeSiteOvertimeConfig,
  overtimeRuleTotalHours,
} from '@/lib/timesheet/overtime-policy'

const activeConfig = normalizeSiteOvertimeConfig({
  ...DEFAULT_SITE_OVERTIME_CONFIG,
  enabled: true,
})

describe('scheduling timesheet overtime policy', () => {
  it('derives default totals from configured intervals', () => {
    for (const shift of ['dayShift', 'nightShift'] as const) {
      expect(overtimeRuleTotalHours(activeConfig.hariBiasa, shift)).toBe(4)
      expect(overtimeRuleTotalHours(activeConfig.hariLibur, shift)).toBe(11)
      expect(overtimeRuleTotalHours(activeConfig.hariKe6, shift)).toBe(6)
      expect(overtimeRuleTotalHours(activeConfig.hariKe7, shift)).toBe(6)
    }
  })

  it('normalizes legacy configs that stored DS and NS under reversed keys', () => {
    const config = normalizeSiteOvertimeConfig({
      enabled: true,
      hariBiasa: {
        dayShift: [
          { start: '18:00', end: '20:00' },
          { start: '04:00', end: '06:00' },
        ],
        nightShift: [
          { start: '06:00', end: '08:00' },
          { start: '16:00', end: '18:00' },
        ],
      },
    })
    expect(config.hariBiasa.dayShift[0].start).toBe('06:00')
    expect(config.hariBiasa.nightShift[0].start).toBe('18:00')
  })

  it('classifies holidays, day 6, and day 7 for 13:1 roster', () => {
    const schedule = ['DS', 'DS', 'OFF']
    expect(classifyOvertimePolicyDay({ schedule, dayIndex: 0, isHoliday: true })).toBe('hariLibur')
    expect(classifyOvertimePolicyDay({ schedule, dayIndex: 1, isHoliday: false })).toBe('hariKe6')
    expect(classifyOvertimePolicyDay({ schedule, dayIndex: 0, isHoliday: false })).toBe('hariBiasa')

    const thirteenOneSchedule = Array(13).fill('DS').concat(['OFF'])
    expect(
      classifyOvertimePolicyDay({
        schedule: thirteenOneSchedule,
        dayIndex: 5,
        isHoliday: false,
        rosterType: '13:1',
      })
    ).toBe('hariKe6')
    expect(
      classifyOvertimePolicyDay({
        schedule: thirteenOneSchedule,
        dayIndex: 6,
        isHoliday: false,
        rosterType: '13:1',
      })
    ).toBe('hariKe7')
    expect(
      classifyOvertimePolicyDay({
        schedule: thirteenOneSchedule,
        dayIndex: 12,
        isHoliday: false,
        rosterType: '13:1',
      })
    ).toBe('hariKe6')
  })

  it('counts actual overlap for day and overnight night shifts', () => {
    const day = calculateConfiguredOvertime({
      config: activeConfig,
      dayKey: 'hariBiasa',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '06:00',
      clockOut: '18:00',
    })
    expect(day.totalHours).toBe(4)
    expect(day.intervals.map((interval) => `${interval.start}-${interval.end}`)).toEqual([
      '06:00-08:00',
      '16:00-18:00',
    ])
    expect(day.workingIntervals.map((interval) => `${interval.start}-${interval.end}`)).toEqual([
      '08:00-16:00',
    ])
    expect(day.unauthorizedMinutes).toBe(0)

    const night = calculateConfiguredOvertime({
      config: activeConfig,
      dayKey: 'hariBiasa',
      shiftCode: 'NS',
      workDate: '2026-07-01',
      clockIn: '18:00',
      clockOut: '06:00',
    })
    expect(night.totalHours).toBe(4)
  })

  it('requires SPL for an OFF day', () => {
    const offConfig: SiteOvertimeConfig = {
      ...activeConfig,
      hariLibur: {
        dayShift: [],
        nightShift: [],
      },
    }
    const result = calculateConfiguredOvertime({
      config: offConfig,
      dayKey: 'hariLibur',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '06:00',
      clockOut: '18:00',
    })
    expect(result.totalHours).toBe(0)
    expect(result.unauthorizedMinutes).toBe(12 * 60)
  })

  it('requires approved SPL outside automatic windows and avoids double count', () => {
    const base = {
      config: activeConfig,
      dayKey: 'hariBiasa' as const,
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '06:00',
      clockOut: '20:00',
    }
    const withoutSpl = calculateConfiguredOvertime(base)
    expect(withoutSpl.totalHours).toBe(4)
    expect(withoutSpl.unauthorizedMinutes).toBe(120)

    const withSpl = calculateConfiguredOvertime({
      ...base,
      splWindows: [
        {
          id: 1,
          splNumber: 'SPL-001',
          siteId: 1,
          employeeId: 1,
          plannedStartAt: '2026-07-01T10:00:00.000Z',
          plannedEndAt: '2026-07-01T12:00:00.000Z',
          status: 'approved',
        },
      ],
    })
    expect(withSpl.totalHours).toBe(6)
    expect(withSpl.unauthorizedMinutes).toBe(0)
    expect(withSpl.source).toBe('Auto + SPL')
    expect(withSpl.splNumbers).toEqual(['SPL-001'])
  })

  it('accepts one-hour approved SPL using the site minimum', () => {
    const result = calculateConfiguredOvertime({
      config: activeConfig,
      dayKey: 'hariBiasa',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '06:00',
      clockOut: '20:00',
      splWindows: [
        {
          id: 3,
          splNumber: 'SPL-SHORT',
          siteId: 1,
          employeeId: 1,
          plannedStartAt: '2026-07-01T10:00:00.000Z',
          plannedEndAt: '2026-07-01T11:00:00.000Z',
          status: 'approved',
        },
      ],
    })
    expect(result.totalHours).toBe(5)
    expect(result.unauthorizedMinutes).toBe(60)
    expect(result.splNumbers).toEqual(['SPL-SHORT'])
  })

  it('uses fixed 6:1 OFF credit after approved SPL', () => {
    const result = calculateConfiguredOvertime({
      config: activeConfig,
      dayKey: 'hariLibur',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '08:00',
      clockOut: '12:00',
      splWindows: [{
        id: 4,
        splNumber: 'SPL-OFF',
        siteId: 1,
        employeeId: 1,
        plannedStartAt: '2026-07-01T00:00:00.000Z',
        plannedEndAt: '2026-07-01T04:00:00.000Z',
        status: 'approved',
        category: 'off_day',
        overtimeCreditMinutes: 660,
      }],
    })
    expect(result.totalHours).toBe(11)
    expect(result.splNumbers).toEqual(['SPL-OFF'])
  })

  it('uses legacy hours when the site switch is inactive', () => {
    const result = calculateOvertime({
      config: normalizeSiteOvertimeConfig(null),
      dayKey: 'hariBiasa',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '04:00',
      clockOut: '20:00',
      legacyHours: 7.5,
    })
    expect(result.source).toBe('Legacy')
    expect(result.totalHours).toBe(7.5)
  })

  it.each(['draft', 'submitted', 'returned', 'rejected'])('ignores SPL status %s', (status) => {
    const result = calculateConfiguredOvertime({
      config: activeConfig,
      dayKey: 'hariBiasa',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '06:00',
      clockOut: '20:00',
      splWindows: [
        {
          id: 2,
          splNumber: 'SPL-NOT-VALID',
          siteId: 1,
          employeeId: 1,
          plannedStartAt: '2026-07-01T10:00:00.000Z',
          plannedEndAt: '2026-07-01T12:00:00.000Z',
          status,
        },
      ],
    })
    expect(result.totalHours).toBe(4)
    expect(result.unauthorizedMinutes).toBe(120)
    expect(result.splNumbers).toEqual([])
  })

  it('generates overtime PDF with Total Overtime column and without Total Overtime column dynamically', async () => {
    const { generateOvertimeRecordPdf } = await import('@/lib/timesheet/generate-attendance-pdf')
    
    const baseInput = {
      period: '2026-07',
      employeeName: 'Budi Santoso',
      employeeSn: '123456',
      department: 'Operation',
      section: 'Workshop',
      siteName: 'Site Tabang',
      signatures: { preparedBy: 'Budi Santoso' },
      days: [
        {
          day: 1,
          dayName: 'Wed',
          status: 'present',
          clockIn: '06:00',
          clockOut: '18:00',
          scheduleCode: 'DS',
          isHoliday: false,
          overtime: { totalHours: 2, splNumbers: ['SPL-001'], intervals: [] } as any,
        },
      ],
      isNonStaff: true,
    }

    const pdfWithTotal = await generateOvertimeRecordPdf({ ...baseInput, showTotalOvertime: true })
    expect(pdfWithTotal).toBeInstanceOf(Uint8Array)
    expect(pdfWithTotal.length).toBeGreaterThan(1000)

    const pdfWithoutTotal = await generateOvertimeRecordPdf({ ...baseInput, showTotalOvertime: false })
    expect(pdfWithoutTotal).toBeInstanceOf(Uint8Array)
    expect(pdfWithoutTotal.length).toBeGreaterThan(1000)
  })
})
