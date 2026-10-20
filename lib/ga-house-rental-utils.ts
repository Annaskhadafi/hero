// ─── Helpers: Kalkulasi Tanggal, Status, & Format GA House Rental ─────────────

const INDO_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

export function calculateRemainingDays(endDateStr?: string | Date | null): number {
  if (!endDateStr) return 0

  if (typeof endDateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(endDateStr)) {
    const [y, m, d] = endDateStr.substring(0, 10).split('-').map(Number)
    const endUtc = Date.UTC(y, m - 1, d)
    const now = new Date()
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    return Math.ceil((endUtc - todayUtc) / (1000 * 60 * 60 * 24))
  }

  const end = new Date(endDateStr)
  if (isNaN(end.getTime())) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const diffMs = end.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function computeHouseRentalStatus(
  startDateStr?: string | Date | null,
  endDateStr?: string | Date | null,
  currentStatus?: string | null
): 'active' | 'expiring_soon' | 'expired' | 'terminated' {
  if (currentStatus === 'terminated') return 'terminated'
  if (!endDateStr) return 'active'

  const remaining = calculateRemainingDays(endDateStr)
  if (remaining < 0) return 'expired'
  if (remaining <= 60) return 'expiring_soon'
  return 'active'
}

/**
 * Deterministic format for Rupiah to prevent React hydration mismatch between Node and browser V8.
 */
export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'Rp 0'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return 'Rp 0'
  const rounded = Math.round(num)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${formatted}`
}

/**
 * Deterministic format for Indonesian dates to prevent React hydration mismatch.
 */
export function formatIndoDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '-'

  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, day] = dateStr.substring(0, 10).split('-').map(Number)
    const monthName = INDO_MONTHS_SHORT[m - 1] || '-'
    return `${day} ${monthName} ${y}`
  }

  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  const day = d.getDate()
  const monthName = INDO_MONTHS_SHORT[d.getMonth()] || '-'
  const year = d.getFullYear()
  return `${day} ${monthName} ${year}`
}

export function calculateRentalDuration(
  startStr?: string | Date | null,
  endStr?: string | Date | null
): string {
  if (!startStr || !endStr) return '-'

  let sY = 0,
    sM = 0,
    sD = 0
  let eY = 0,
    eM = 0,
    eD = 0

  if (
    typeof startStr === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(startStr) &&
    typeof endStr === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(endStr)
  ) {
    ;[sY, sM, sD] = startStr.substring(0, 10).split('-').map(Number)
    ;[eY, eM, eD] = endStr.substring(0, 10).split('-').map(Number)
  } else {
    const start = new Date(startStr)
    const end = new Date(endStr)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return '-'
    sY = start.getFullYear()
    sM = start.getMonth() + 1
    sD = start.getDate()
    eY = end.getFullYear()
    eM = end.getMonth() + 1
    eD = end.getDate()
  }

  let years = eY - sY
  let months = eM - sM + years * 12
  let days = eD - sD

  if (days < 0) {
    months -= 1
    const prevMonthDays = new Date(eY, eM - 1, 0).getDate()
    days += prevMonthDays
  }

  const parts = []
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y > 0) parts.push(`${y} Tahun`)
  if (m > 0) parts.push(`${m} Bulan`)
  if (days > 0 && y === 0) parts.push(`${days} Hari`)

  return parts.length > 0 ? parts.join(' ') : '0 Hari'
}
