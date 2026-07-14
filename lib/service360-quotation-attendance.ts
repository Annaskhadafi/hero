export type QuotationDateRange = {
  start: string
  end: string
}

export type QuotationBillingStatusConfig = {
  countEmpty: boolean
  countSick: boolean
  countLeave: boolean
  countAbsent: boolean
}

export const DEFAULT_QUOTATION_BILLING_STATUS_CONFIG: QuotationBillingStatusConfig = {
  countEmpty: false,
  countSick: false,
  countLeave: false,
  countAbsent: false,
}

export function normalizeQuotationBillingStatusConfig(
  value: unknown
): QuotationBillingStatusConfig {
  const config = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    countEmpty: config.countEmpty === true,
    countSick: config.countSick === true,
    countLeave: config.countLeave === true,
    countAbsent: config.countAbsent === true,
  }
}

export function isQuotationAttendanceStatusBillable(
  status: 'present' | 'empty' | 'sick' | 'leave' | 'absent' | 'off',
  config: QuotationBillingStatusConfig
) {
  if (status === 'present' || status === 'off') return true
  if (status === 'empty') return config.countEmpty
  if (status === 'sick') return config.countSick
  if (status === 'leave') return config.countLeave
  return config.countAbsent
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function getIsoDatesInRange(start: string, end: string) {
  const startDate = parseIsoDate(start)
  const endDate = parseIsoDate(end)
  if (!startDate || !endDate || startDate > endDate) return []

  const dates: string[] = []
  for (
    const cursor = new Date(startDate);
    cursor <= endDate;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    dates.push(formatIsoDate(cursor))
  }
  return dates
}

export function getPeriodsInDateRange(start: string, end: string) {
  return [...new Set(getIsoDatesInRange(start, end).map((date) => date.slice(0, 7)))]
}

export function buildContiguousQuotationRanges(includedDates: Iterable<string>) {
  const dates = [...new Set(includedDates)].filter((date) => parseIsoDate(date)).sort()
  if (!dates.length) return []

  const ranges: QuotationDateRange[] = []
  let rangeStart = dates[0]
  let previous = dates[0]

  for (const date of dates.slice(1)) {
    const expectedNext = new Date(`${previous}T00:00:00.000Z`)
    expectedNext.setUTCDate(expectedNext.getUTCDate() + 1)
    if (formatIsoDate(expectedNext) !== date) {
      ranges.push({ start: rangeStart, end: previous })
      rangeStart = date
    }
    previous = date
  }

  ranges.push({ start: rangeStart, end: previous })
  return ranges
}

export function buildQuotationAttendanceRanges(
  start: string,
  end: string,
  fieldBreakDates: ReadonlySet<string>
): QuotationDateRange[] {
  const includedDates = getIsoDatesInRange(start, end).filter((date) => !fieldBreakDates.has(date))
  return buildContiguousQuotationRanges(includedDates)
}
