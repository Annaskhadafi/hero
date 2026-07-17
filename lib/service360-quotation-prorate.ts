const DAY_MS = 24 * 60 * 60 * 1000

function parseDate(value?: string | null) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return Number.isNaN(date.getTime()) ? null : date
}

export function calculateRunningMonthProrateFactor(start?: string | null, end?: string | null) {
  let periodStart = parseDate(start)
  const periodEnd = parseDate(end)
  if (!periodStart || !periodEnd || periodEnd < periodStart) return 0

  let factor = 0
  while (periodStart <= periodEnd) {
    const daysInRunningMonth = new Date(Date.UTC(
      periodStart.getUTCFullYear(),
      periodStart.getUTCMonth() + 1,
      0,
    )).getUTCDate()
    const cycleEnd = new Date(periodStart.getTime() + (daysInRunningMonth - 1) * DAY_MS)
    const billedEnd = cycleEnd < periodEnd ? cycleEnd : periodEnd
    factor += ((billedEnd.getTime() - periodStart.getTime()) / DAY_MS + 1) / daysInRunningMonth
    periodStart = new Date(cycleEnd.getTime() + DAY_MS)
  }

  return factor
}
