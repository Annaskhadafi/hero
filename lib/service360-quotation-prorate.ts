const DAY_MS = 24 * 60 * 60 * 1000

function parseDate(value?: string | null) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return Number.isNaN(date.getTime()) ? null : date
}

export function calculateStartMonthProrateFactor(start?: string | null, end?: string | null) {
  const periodStart = parseDate(start)
  const periodEnd = parseDate(end)
  if (!periodStart || !periodEnd || periodEnd < periodStart) return 0

  const daysInStartMonth = new Date(Date.UTC(
    periodStart.getUTCFullYear(),
    periodStart.getUTCMonth() + 1,
    0,
  )).getUTCDate()
  const inclusiveDays = (periodEnd.getTime() - periodStart.getTime()) / DAY_MS + 1

  return inclusiveDays / daysInStartMonth
}
