export function toYearMonthString(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return ''
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }
  const s = String(val).trim()
  if (/^\d{4}-\d{2}/.test(s)) {
    return s.substring(0, 7)
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }
  return ''
}

export function normalizeSiteName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.\-_/,()]/g, ' ')
    .replace(/\b(pt|site|project|tbk|cv|corp)\b/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function matchesSiteName(
  workLocation: string | null | undefined,
  siteName: string | null | undefined,
  siteLocation?: string | null
): boolean {
  if (!workLocation || !siteName) return false
  const normW = workLocation.trim().toUpperCase().replace(/[-_]/g, ' ')
  const normS = siteName.trim().toUpperCase().replace(/[-_]/g, ' ')
  if (normW === normS) return true
  if (normW.includes(normS) || normS.includes(normW)) return true

  const cleanW = normalizeSiteName(workLocation)
  const cleanS = normalizeSiteName(siteName)
  if (cleanW === cleanS) return true
  if (cleanW.includes(cleanS) || cleanS.includes(cleanW)) return true

  // Token matching (all non-trivial words in cleanS exist in cleanW or vice versa)
  const sTokens = cleanS.split(' ').filter((t) => t.length > 2)
  if (sTokens.length > 0 && sTokens.every((token) => cleanW.includes(token))) {
    return true
  }
  const wTokens = cleanW.split(' ').filter((t) => t.length > 2)
  if (wTokens.length > 0 && wTokens.every((token) => cleanS.includes(token))) {
    return true
  }

  if (siteLocation) {
    const normL = siteLocation.trim().toUpperCase().replace(/[-_]/g, ' ')
    if (normW === normL || normW.includes(normL) || normL.includes(normW)) return true
    const cleanL = normalizeSiteName(siteLocation)
    if (cleanW === cleanL || cleanW.includes(cleanL) || cleanL.includes(cleanW)) return true
    const lTokens = cleanL.split(' ').filter((t) => t.length > 2)
    if (lTokens.length > 0 && lTokens.every((token) => cleanW.includes(token))) return true
  }

  return false
}
