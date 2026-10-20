// ─── Helpers: Kalkulasi Tanggal & Durasi HRGA Kerjasama ──────────────────────

export function calculateDuration(startDateStr: string, endDateStr: string): {
  months: number
  days: number
  display: string
} {
  if (!startDateStr || !endDateStr) {
    return { months: 0, days: 0, display: '-' }
  }

  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { months: 0, days: 0, display: '-' }
  }

  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth() + years * 12
  let days = end.getDate() - start.getDate()

  if (days < 0) {
    months -= 1
    const prevMonthDays = new Date(end.getFullYear(), end.getMonth(), 0).getDate()
    days += prevMonthDays
  }

  const display = `${months > 0 ? `${months} Bulan ` : ''}${days} Hari`
  return { months: Math.max(0, months), days: Math.max(0, days), display }
}

export function computePklStatus(startDateStr: string, endDateStr: string): 'active' | 'completed' | 'upcoming' {
  const today = new Date().toISOString().split('T')[0]
  if (endDateStr < today) return 'completed'
  if (startDateStr > today) return 'upcoming'
  return 'active'
}

export function computeRsStatus(
  startDateStr?: string | null,
  endDateStr?: string | null,
  manualStatus?: string
): 'active' | 'expiring_soon' | 'expired' | 'no_partnership' {
  if (!startDateStr || !endDateStr || manualStatus === 'no_partnership') {
    return 'no_partnership'
  }
  const today = new Date().toISOString().split('T')[0]
  if (endDateStr < today) {
    return 'expired'
  }
  const endMs = new Date(endDateStr).getTime()
  const todayMs = new Date().getTime()
  const diffDays = Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24))
  if (diffDays <= 60 && diffDays >= 0) {
    return 'expiring_soon'
  }
  return 'active'
}

export function computeSekolahStatus(
  startDateStr?: string | null,
  endDateStr?: string | null,
  manualStatus?: string
): 'active' | 'expiring_soon' | 'expired' | 'no_partnership' {
  return computeRsStatus(startDateStr, endDateStr, manualStatus)
}
