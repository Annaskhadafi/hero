import {
  DEFAULT_SITE_OVERTIME_CONFIG,
  calculateConfiguredOvertime,
  calculateOvertime,
  classifyOvertimePolicyDay,
  normalizeSiteOvertimeConfig,
  overtimeRuleTotalHours,
  validateSiteOvertimeConfig,
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

  it('classifies day 6 for 6:1 roster correctly based on next off day or work streak', () => {
    const sixOneSchedule = ['DS', 'DS', 'DS', 'DS', 'DS', 'DS', 'OFF']
    expect(
      classifyOvertimePolicyDay({
        schedule: sixOneSchedule,
        dayIndex: 5,
        isHoliday: false,
        rosterType: '6:1',
      })
    ).toBe('hariKe6')
    expect(
      classifyOvertimePolicyDay({
        schedule: sixOneSchedule,
        dayIndex: 4,
        isHoliday: false,
        rosterType: '6:1',
      })
    ).toBe('hariBiasa')
    expect(
      classifyOvertimePolicyDay({
        schedule: sixOneSchedule,
        dayIndex: 6,
        isHoliday: false,
        rosterType: '6:1',
      })
    ).toBe('hariLibur')
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

    const nightRealistic = calculateConfiguredOvertime({
      config: activeConfig,
      dayKey: 'hariBiasa',
      shiftCode: 'NS',
      workDate: '2026-07-01',
      clockIn: '17:31',
      clockOut: '05:59',
    })
    expect(nightRealistic.totalHours).toBe(4)
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
    expect(withoutSpl.autoMinutes).toBe(240)
    expect(withoutSpl.splMinutes).toBe(0)
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
    expect(withSpl.autoMinutes).toBe(240)
    expect(withSpl.splMinutes).toBe(120)
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

  it('keeps approved SPL overlapping mandatory overtime out of the SPL bucket', () => {
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
    // Payroll keeps the configured off-day SPL credit; the display buckets
    // remain mutually exclusive and use actual intervals.
    expect(result.totalHours).toBe(11)
    expect(result.splMinutes).toBe(0)
    expect(result.splNumbers).toEqual([])
  })

  it('counts only the actual SPL portion outside mandatory overtime', () => {
    const result = calculateConfiguredOvertime({
      config: activeConfig,
      dayKey: 'hariBiasa',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '06:00',
      clockOut: '20:00',
      splWindows: [
        {
          id: 5,
          splNumber: 'SPL-PARTIAL',
          siteId: 1,
          employeeId: 1,
          plannedStartAt: '2026-07-01T09:00:00.000Z',
          plannedEndAt: '2026-07-01T11:00:00.000Z',
          status: 'approved',
        },
      ],
    })

    // 16:00-18:00 is mandatory; the approved SPL is 17:00-19:00 Makassar,
    // so only 18:00-19:00 belongs to Overtime SPL.
    expect(result.autoMinutes).toBe(240)
    expect(result.splMinutes).toBe(60)
    expect(result.totalMinutes).toBe(300)
    expect(result.splNumbers).toEqual(['SPL-PARTIAL'])
  })

  it('counts approved break SPL outside mandatory overtime without losing payroll hours', () => {
    const result = calculateConfiguredOvertime({
      config: activeConfig,
      dayKey: 'hariBiasa',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '06:00',
      clockOut: '18:00',
      splWindows: [{
        id: 20, splNumber: 'SPL-BREAK', siteId: 1, employeeId: 1,
        plannedStartAt: '2026-07-01T04:00:00.000Z',
        plannedEndAt: '2026-07-01T05:00:00.000Z',
        status: 'approved', category: 'break',
      }],
    })
    expect(result.autoMinutes).toBe(240)
    expect(result.splMinutes).toBe(60)
    expect(result.totalMinutes).toBe(300)
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
    expect(result.autoMinutes).toBe(0)
  })

  it('does not classify legacy fallback as mandatory overtime when no windows are configured', () => {
    const config = {
      ...activeConfig,
      hariBiasa: { dayShift: [], nightShift: [] },
    }
    const result = calculateOvertime({
      config,
      dayKey: 'hariBiasa',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '08:00',
      clockOut: '20:00',
      legacyHours: 4,
    })
    expect(result.source).toBe('Legacy')
    expect(result.totalHours).toBe(4)
    expect(result.autoMinutes).toBe(0)
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

    // Test with explicit evidenceUrl & verify PDF output structure
    const pdfWithEvidenceUrl = await generateOvertimeRecordPdf({
      ...baseInput,
      employeeId: 42,
      evidenceUrl: 'https://hero.chitraparatama.co.id/spl-evidence/SPL-001',
    })
    expect(pdfWithEvidenceUrl).toBeInstanceOf(Uint8Array)
    expect(pdfWithEvidenceUrl.length).toBeGreaterThan(1000)

    // Test Overtime Record with 2 external approvals
    const pdfExternal2 = await generateOvertimeRecordPdf({
      ...baseInput,
      signatures: {
        ...baseInput.signatures,
        useExternalOnly: true,
        externalSignatureCount: 2,
        externalPreparedBy: 'Adit Prasetyo',
        externalApprovedBy: 'Plant Group Leader AMM MIFA',
      },
    })
    expect(pdfExternal2).toBeInstanceOf(Uint8Array)
    expect(pdfExternal2.length).toBeGreaterThan(1000)

    // Test Overtime Record with 3 external approvals and custom signer
    const pdfExternal3 = await generateOvertimeRecordPdf({
      ...baseInput,
      signatures: {
        ...baseInput.signatures,
        useExternalOnly: true,
        externalSignatureCount: 3,
        externalPreparedBy: 'Adit Prasetyo',
        externalApprovedBy: 'Plant Group Leader AMM MIFA',
        customSigners: [{ label: 'Approved by (Dept Head):', name: 'Budi Santoso' }],
      },
    })
    expect(pdfExternal3).toBeInstanceOf(Uint8Array)
    expect(pdfExternal3.length).toBeGreaterThan(1000)
  })

  it('allows optional empty overtime intervals in site setup and validation', () => {
    const configWithEmpty = normalizeSiteOvertimeConfig({
      enabled: true,
      hariBiasa: {
        dayShift: [
          { start: '06:00', end: '08:00' },
          { start: '', end: '' },
        ],
        nightShift: [
          { start: '', end: '' },
          { start: '', end: '' },
        ],
      },
    })

    expect(configWithEmpty.hariBiasa.dayShift[1]).toEqual({ start: '', end: '' })
    expect(configWithEmpty.hariBiasa.nightShift[0]).toEqual({ start: '', end: '' })
    expect(validateSiteOvertimeConfig(configWithEmpty)).toEqual([])

    const result = calculateConfiguredOvertime({
      config: configWithEmpty,
      dayKey: 'hariBiasa',
      shiftCode: 'DS',
      workDate: '2026-07-01',
      clockIn: '06:00',
      clockOut: '18:00',
    })
    expect(result.totalHours).toBe(2)
    expect(result.intervals.map((i) => `${i.start}-${i.end}`)).toEqual(['06:00-08:00'])

    const incompleteConfig = normalizeSiteOvertimeConfig({
      enabled: true,
      hariBiasa: {
        dayShift: [
          { start: '06:00', end: '' },
          { start: '', end: '' },
        ],
      },
    })
    const errors = validateSiteOvertimeConfig(incompleteConfig)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('jam mulai/selesai yang tidak lengkap')
  })

  it('calculates actual overtime on off-days when requireSpl is false without needing SPL', () => {
    const offConfigNoSpl: SiteOvertimeConfig = {
      ...activeConfig,
      requireSpl: false,
      hariLibur: {
        dayShift: [],
        nightShift: [],
      },
    }
    const result = calculateConfiguredOvertime({
      config: offConfigNoSpl,
      dayKey: 'hariLibur',
      shiftCode: 'DS',
      workDate: '2026-10-10',
      clockIn: '10:13',
      clockOut: '18:14',
    })
    expect(result.totalHours).toBeCloseTo(8.016, 2)
    expect(result.unauthorizedMinutes).toBe(0)
    expect(result.intervals.length).toBe(1)
    expect(result.intervals[0].start).toBe('10:13')
    expect(result.intervals[0].end).toBe('18:14')
  })

  it('includes additional 1 hour overtime when requireSpl is false without SPL', () => {
    const regularConfigNoSpl: SiteOvertimeConfig = {
      ...activeConfig,
      requireSpl: false,
    }
    const result = calculateConfiguredOvertime({
      config: regularConfigNoSpl,
      dayKey: 'hariBiasa',
      shiftCode: 'DS',
      workDate: '2026-10-06',
      clockIn: '06:00',
      clockOut: '19:00',
    })
    expect(result.totalHours).toBe(5)
    expect(result.unauthorizedMinutes).toBe(0)
  })

  it('renders actual off-day overtime and extended overtime +1 hour in Overtime Record PDF', async () => {
    const { generateOvertimeRecordPdf } = await import('@/lib/timesheet/generate-attendance-pdf')
    const pdf = await generateOvertimeRecordPdf({
      documentTitle: 'OVERTIME RECORD',
      period: '2026-10',
      employeeId: 999,
      employeeName: 'Tini Dwi Saripah',
      employeeSn: '73226',
      department: 'Finance',
      section: 'Finance Operations',
      siteName: 'Balikpapan',
      signatures: { preparedBy: 'Tini Dwi Saripah' },
      isNonStaff: true,
      showTotalOvertime: true,
      days: [
        {
          day: 1,
          dayName: 'Thursday',
          status: 'present',
          clockIn: '08:00',
          clockOut: '20:00',
          scheduleCode: 'DS',
          isHoliday: false,
          configuredOvertimeIntervals: [{ start: '17:00', end: '19:00' }],
          overtime: {
            totalHours: 3,
            totalMinutes: 180,
            autoMinutes: 120,
            splMinutes: 60,
            unauthorizedMinutes: 0,
            source: 'Auto',
            splNumbers: [],
            intervals: [{ startMinute: 1020, endMinute: 1200, start: '17:00', end: '20:00', source: 'Auto' }],
            workingIntervals: [],
          },
        },
        {
          day: 3,
          dayName: 'Saturday',
          status: 'present',
          clockIn: '10:13',
          clockOut: '18:14',
          scheduleCode: 'OFF',
          isHoliday: false,
          configuredOvertimeIntervals: [{ start: '00:00', end: '00:00' }],
          overtime: {
            totalHours: 8,
            totalMinutes: 480,
            autoMinutes: 480,
            splMinutes: 0,
            unauthorizedMinutes: 0,
            source: 'Auto',
            splNumbers: [],
            intervals: [{ startMinute: 613, endMinute: 1094, start: '10:13', end: '18:14', source: 'Auto' }],
            workingIntervals: [],
          },
        },
      ],
    })
    expect(pdf).toBeInstanceOf(Uint8Array)
    expect(pdf.length).toBeGreaterThan(1000)
  })
})

