import { calculateQuotationTotal } from '@/lib/service360-quotation-total'

describe('quotation grand total', () => {
  it('applies discount before tax', () => {
    expect(calculateQuotationTotal(1_000_000, 11, 'percent', 10)).toEqual({
      discountAmount: 100_000,
      discountedSubTotal: 900_000,
      taxAmount: 99_000,
      grandTotal: 999_000,
    })
  })

  it('ignores a stale discount value when discount is disabled', () => {
    expect(calculateQuotationTotal(1_000_000, 11, null, 100_000).grandTotal).toBe(1_110_000)
  })
})
