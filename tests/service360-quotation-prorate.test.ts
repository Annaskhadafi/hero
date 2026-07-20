import { calculateStartMonthProrateFactor } from '@/lib/service360-quotation-prorate'

describe('quotation backup prorate', () => {
  it('uses the period start month as the divisor', () => {
    expect(calculateStartMonthProrateFactor('2026-06-15', '2026-07-14')).toBe(1)
    expect(calculateStartMonthProrateFactor('2026-07-15', '2026-08-14')).toBe(1)
    expect(calculateStartMonthProrateFactor('2026-06-15', '2026-08-14')).toBeCloseTo(61 / 30)
  })

  it('prorates a partial period', () => {
    expect(calculateStartMonthProrateFactor('2026-06-15', '2026-06-29')).toBe(0.5)
  })

  it('uses 31 days when the period starts in a 31-day month', () => {
    expect(calculateStartMonthProrateFactor('2026-07-01', '2026-07-15')).toBeCloseTo(15 / 31)
  })

  it('keeps extra and backup dates on the main start month divisor', () => {
    expect(calculateStartMonthProrateFactor('2026-07-01', '2026-07-01', '2026-06-29')).toBeCloseTo(1 / 30)
    expect(calculateStartMonthProrateFactor('2026-07-01', '2026-07-31', '2026-06-29')).toBeCloseTo(31 / 30)
  })
})
