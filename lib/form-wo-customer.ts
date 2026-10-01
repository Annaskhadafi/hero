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

/**
 * Helper to identify KPC (Kaltim Prima Coal) customer or site variations.
 * Used for filtering KPC vs Non-KPC (HERO) Work Order records.
 */
export function isKpcCustomer(customerOrSite?: string | null): boolean {
  if (!customerOrSite) return false
  const c = customerOrSite.toUpperCase().trim()
  return c.includes('KALTIM PRIMA COAL') || c.includes('KPC')
}

export function isKpcRecord(record?: {
  customer?: string | null
  site?: string | null
  store_loc?: string | null
  customerSite?: string | null
  inspectLocation?: string | null
} | null): boolean {
  if (!record) return false
  return (
    isKpcCustomer(record.customer) ||
    isKpcCustomer(record.site) ||
    isKpcCustomer(record.store_loc) ||
    isKpcCustomer(record.customerSite) ||
    isKpcCustomer(record.inspectLocation)
  )
}

