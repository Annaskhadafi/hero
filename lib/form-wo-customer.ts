/**
 * Helper to identify Cipta Kridatama (CK) customer variations.
 * Used across client components, preview dialogs, and PDF generation.
 */
export function isCiptaKridatamaCustomer(customerName?: string | null): boolean {
  if (!customerName) return false
  const c = customerName.toLowerCase().trim()
  return (
    c.includes('cipta kridatama') ||
    c.includes('ciptakridatama') ||
    c.includes('pt ck') ||
    c.includes('pt. ck') ||
    c.includes('pt.ck') ||
    c === 'ck' ||
    c.startsWith('ck ') ||
    c.endsWith(' ck') ||
    c.includes(' ck ') ||
    c.includes('ck-') ||
    c.includes('ckb') ||
    c.includes('trakindo') ||
    c.includes('mvc')
  )
}
