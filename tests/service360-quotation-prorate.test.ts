import { calculateRunningMonthProrateFactor } from '@/lib/service360-quotation-prorate'

describe('quotation backup prorate', () => {
  it('uses the running month for each billing cycle', () => {
    expect(calculateRunningMonthProrateFactor('2026-06-15', '2026-07-14')).toBe(1)
    expect(calculateRunningMonthProrateFactor('2026-07-15', '2026-08-14')).toBe(1)
    expect(calculateRunningMonthProrateFactor('2026-06-15', '2026-08-14')).toBe(2)
  })

  it('prorates a partial running-month cycle', () => {
    expect(calculateRunningMonthProrateFactor('2026-06-15', '2026-06-29')).toBe(0.5)
  })
})
