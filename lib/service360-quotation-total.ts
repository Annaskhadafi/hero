export function calculateQuotationTotal(
  subTotal: number,
  taxRate: number,
  discountType?: string | null,
  discountValue = 0,
) {
  const discountAmount = discountType === 'percent'
    ? subTotal * discountValue / 100
    : discountType === 'fixed' ? discountValue : 0
  const discountedSubTotal = Math.max(0, subTotal - discountAmount)
  const taxAmount = discountedSubTotal * taxRate / 100

  return { discountAmount, discountedSubTotal, taxAmount, grandTotal: discountedSubTotal + taxAmount }
}
