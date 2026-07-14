import {
  buildContiguousQuotationRanges,
  buildQuotationAttendanceRanges,
  DEFAULT_QUOTATION_BILLING_STATUS_CONFIG,
  getPeriodsInDateRange,
  isQuotationAttendanceStatusBillable,
  normalizeQuotationBillingStatusConfig,
} from '@/lib/service360-quotation-attendance'
import { normalizeAttendanceStatus } from '@/lib/timesheet/attendance-real'

describe('Service 360 quotation attendance ranges', () => {
  it('splits Labour Cost around Field Break while keeping OFF dates inside the range', () => {
    const fieldBreakDates = new Set([
      '2026-04-15',
      '2026-04-16',
      '2026-04-17',
      '2026-04-18',
      '2026-04-19',
      '2026-04-20',
    ])

    expect(buildQuotationAttendanceRanges('2026-04-01', '2026-04-30', fieldBreakDates)).toEqual([
      { start: '2026-04-01', end: '2026-04-14' },
      { start: '2026-04-21', end: '2026-04-30' },
    ])
    expect(buildQuotationAttendanceRanges('2026-04-10', '2026-04-14', new Set())).toEqual([
      { start: '2026-04-10', end: '2026-04-14' },
    ])
    expect(
      buildQuotationAttendanceRanges(
        '2026-04-10',
        '2026-04-12',
        new Set(['2026-04-10', '2026-04-11', '2026-04-12'])
      )
    ).toEqual([])
  })

  it('supports quotation periods that cross months', () => {
    expect(getPeriodsInDateRange('2026-04-20', '2026-05-10')).toEqual(['2026-04', '2026-05'])
  })

  it('bills only attendance and roster OFF dates', () => {
    expect(
      buildContiguousQuotationRanges([
        '2026-04-01',
        '2026-04-02',
        '2026-04-05', // roster OFF remains billable
        '2026-04-06',
      ])
    ).toEqual([
      { start: '2026-04-01', end: '2026-04-02' },
      { start: '2026-04-05', end: '2026-04-06' },
    ])
  })

  it('applies optional quotation statuses while always billing present and OFF', () => {
    const config = normalizeQuotationBillingStatusConfig({
      countEmpty: true,
      countSick: true,
      countLeave: false,
      countAbsent: false,
    })

    expect(isQuotationAttendanceStatusBillable('present', config)).toBe(true)
    expect(isQuotationAttendanceStatusBillable('off', config)).toBe(true)
    expect(isQuotationAttendanceStatusBillable('empty', config)).toBe(true)
    expect(isQuotationAttendanceStatusBillable('sick', config)).toBe(true)
    expect(isQuotationAttendanceStatusBillable('leave', config)).toBe(false)
    expect(isQuotationAttendanceStatusBillable('absent', config)).toBe(false)
    expect(DEFAULT_QUOTATION_BILLING_STATUS_CONFIG).toEqual({
      countEmpty: false,
      countSick: false,
      countLeave: false,
      countAbsent: false,
    })
    expect(normalizeAttendanceStatus('empty')).toBe('empty')
    expect(normalizeAttendanceStatus('OFF')).toBe('off')
    expect(normalizeAttendanceStatus('Alfa')).toBe('absent')
  })
})
