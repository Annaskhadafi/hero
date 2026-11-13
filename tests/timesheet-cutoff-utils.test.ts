import {
  buildCkCutoffDateRange,
  getPreviousPeriod,
  formatCkCutoffLabel,
  formatCkCutoffFullRange,
} from '../lib/timesheet/cutoff-utils'

describe('CK Billing Cut-off Date Range Utilities (16 - 15)', () => {
  test('correctly calculates previous period across normal months and year boundaries', () => {
    expect(getPreviousPeriod('2026-10')).toBe('2026-09')
    expect(getPreviousPeriod('2026-05')).toBe('2026-04')
    expect(getPreviousPeriod('2026-01')).toBe('2025-12')
    expect(getPreviousPeriod('2027-01')).toBe('2026-12')
  })

  test('builds accurate 16 Sept - 15 Oct 2026 date range (30 days total)', () => {
    const range = buildCkCutoffDateRange('2026-10')
    // September has 30 days: 16..30 = 15 days
    // October: 1..15 = 15 days
    // Total = 30 days
    expect(range.length).toBe(30)

    // First day: 16 Sept 2026
    const first = range[0]
    expect(first.period).toBe('2026-09')
    expect(first.day).toBe(16)
    expect(first.dateStr).toBe('2026-09-16')
    expect(first.displayHeader).toBe('16 Sep')
    expect(first.isPrevMonth).toBe(true)

    // Day 15 in range: 30 Sept 2026
    const lastSept = range[14]
    expect(lastSept.period).toBe('2026-09')
    expect(lastSept.day).toBe(30)
    expect(lastSept.dateStr).toBe('2026-09-30')
    expect(lastSept.displayHeader).toBe('30 Sep')
    expect(lastSept.isPrevMonth).toBe(true)

    // Day 16 in range: 01 Oct 2026
    const firstOct = range[15]
    expect(firstOct.period).toBe('2026-10')
    expect(firstOct.day).toBe(1)
    expect(firstOct.dateStr).toBe('2026-10-01')
    expect(firstOct.displayHeader).toBe('01 Okt')
    expect(firstOct.isPrevMonth).toBe(false)

    // Last day: 15 Oct 2026
    const last = range[29]
    expect(last.period).toBe('2026-10')
    expect(last.day).toBe(15)
    expect(last.dateStr).toBe('2026-10-15')
    expect(last.displayHeader).toBe('15 Okt')
    expect(last.isPrevMonth).toBe(false)
  })

  test('builds accurate 16 Aug - 15 Sept 2026 range when previous month has 31 days (31 days total)', () => {
    const range = buildCkCutoffDateRange('2026-09')
    // August has 31 days: 16..31 = 16 days
    // September: 1..15 = 15 days
    // Total = 31 days
    expect(range.length).toBe(31)

    expect(range[0].dateStr).toBe('2026-08-16')
    expect(range[15].dateStr).toBe('2026-08-31')
    expect(range[16].dateStr).toBe('2026-09-01')
    expect(range[30].dateStr).toBe('2026-09-15')
  })

  test('handles February correctly when previous month is Feb (non-leap year: 28 days total)', () => {
    // 2026 is non-leap year, Feb has 28 days: 16..28 = 13 days + 15 days = 28 days
    const range = buildCkCutoffDateRange('2026-03')
    expect(range.length).toBe(28)
    expect(range[0].dateStr).toBe('2026-02-16')
    expect(range[12].dateStr).toBe('2026-02-28')
    expect(range[13].dateStr).toBe('2026-03-01')
    expect(range[27].dateStr).toBe('2026-03-15')
  })

  test('handles year boundary correctly (16 Dec 2025 - 15 Jan 2026)', () => {
    const range = buildCkCutoffDateRange('2026-01')
    // December has 31 days: 16..31 = 16 days + 15 days = 31 days
    expect(range.length).toBe(31)
    expect(range[0].dateStr).toBe('2025-12-16')
    expect(range[0].year).toBe(2025)
    expect(range[15].dateStr).toBe('2025-12-31')
    expect(range[16].dateStr).toBe('2026-01-01')
    expect(range[16].year).toBe(2026)
    expect(range[30].dateStr).toBe('2026-01-15')
  })

  test('formats CK Cutoff labels nicely in Indonesian', () => {
    expect(formatCkCutoffLabel('2026-10')).toBe('Cut-off Tagihan CK (16 Sep - 15 Okt 2026)')
    expect(formatCkCutoffFullRange('2026-10')).toBe('16 September s/d 15 Oktober 2026')
    expect(formatCkCutoffFullRange('2026-01')).toBe('16 Desember 2025 s/d 15 Januari 2026')
  })
})
