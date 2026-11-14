import { daysInMonth, type HolidayLike } from '../timesheet-scheduling'

export interface CkCutoffDateItem {
  index: number
  period: string // e.g. "2026-09"
  day: number // e.g. 16
  dateStr: string // e.g. "2026-09-16"
  monthShort: string // e.g. "Sep"
  monthLong: string // e.g. "September"
  year: number // e.g. 2026
  displayHeader: string // e.g. "16 Sep"
  subHeader: string // e.g. "Rab" or "Rab*"
  isWeekend: boolean
  isHoliday: boolean
  isPrevMonth: boolean
}

const INDONESIAN_MONTH_SHORT = [
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

const INDONESIAN_MONTH_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const INDONESIAN_WEEKDAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/**
 * Returns the previous month period in YYYY-MM format.
 * E.g., '2026-10' -> '2026-09', '2026-01' -> '2025-12'
 */
export function getPreviousPeriod(period: string): string {
  const [yearStr, monthStr] = period.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!year || !month) return period

  const prevDate = new Date(year, month - 2, 1)
  const prevYear = prevDate.getFullYear()
  const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0')
  return `${prevYear}-${prevMonth}`
}

/**
 * Builds the Cipta Kridatama (CK) billing cut-off date range (16th of previous month to 15th of current month).
 * Example: for period '2026-10', returns dates from 16 Sept 2026 to 15 Oct 2026.
 */
export function buildCkCutoffDateRange(
  period: string,
  holidays: HolidayLike[] = []
): CkCutoffDateItem[] {
  const prevPeriod = getPreviousPeriod(period)
  const [prevYearStr, prevMonthStr] = prevPeriod.split('-')
  const [currYearStr, currMonthStr] = period.split('-')

  const prevYear = Number(prevYearStr)
  const prevMonth = Number(prevMonthStr)
  const currYear = Number(currYearStr)
  const currMonth = Number(currMonthStr)

  const prevDaysInMonth = daysInMonth(prevPeriod)
  const result: CkCutoffDateItem[] = []
  let index = 0

  // 1. Days from previous month (16 to end of month)
  for (let d = 16; d <= prevDaysInMonth; d++) {
    const dateStr = `${prevPeriod}-${String(d).padStart(2, '0')}`
    const dateObj = new Date(prevYear, prevMonth - 1, d)
    const dayOfWeek = dateObj.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const holidayMatch = holidays.find(
      (h) => h.date === dateStr || (h.day === d && prevPeriod === period)
    )
    const isHoliday = Boolean(holidayMatch)
    const wdayShort = INDONESIAN_WEEKDAYS_SHORT[dayOfWeek]
    const monthShort = INDONESIAN_MONTH_SHORT[prevMonth - 1]
    const monthLong = INDONESIAN_MONTH_LONG[prevMonth - 1]

    result.push({
      index: index++,
      period: prevPeriod,
      day: d,
      dateStr,
      monthShort,
      monthLong,
      year: prevYear,
      displayHeader: `${String(d).padStart(2, '0')} ${monthShort}`,
      subHeader: isHoliday ? `${wdayShort}*` : wdayShort,
      isWeekend,
      isHoliday,
      isPrevMonth: true,
    })
  }

  // 2. Days from current month (1 to 15)
  for (let d = 1; d <= 15; d++) {
    const dateStr = `${period}-${String(d).padStart(2, '0')}`
    const dateObj = new Date(currYear, currMonth - 1, d)
    const dayOfWeek = dateObj.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const holidayMatch = holidays.find(
      (h) => h.date === dateStr || (h.day === d && h.date?.startsWith(period))
    )
    const isHoliday = Boolean(holidayMatch)
    const wdayShort = INDONESIAN_WEEKDAYS_SHORT[dayOfWeek]
    const monthShort = INDONESIAN_MONTH_SHORT[currMonth - 1]
    const monthLong = INDONESIAN_MONTH_LONG[currMonth - 1]

    result.push({
      index: index++,
      period,
      day: d,
      dateStr,
      monthShort,
      monthLong,
      year: currYear,
      displayHeader: `${String(d).padStart(2, '0')} ${monthShort}`,
      subHeader: isHoliday ? `${wdayShort}*` : wdayShort,
      isWeekend,
      isHoliday,
      isPrevMonth: false,
    })
  }

  return result
}

/**
 * Returns formatted label for CK Cut-off period.
 * Example: 'Cut-off Tagihan CK (16 Sep - 15 Okt 2026)'
 */
export function formatCkCutoffLabel(period: string): string {
  const prevPeriod = getPreviousPeriod(period)
  const [, prevMonthStr] = prevPeriod.split('-')
  const [currYearStr, currMonthStr] = period.split('-')

  const prevMonthIdx = Number(prevMonthStr) - 1
  const currMonthIdx = Number(currMonthStr) - 1

  const prevMonthShort = INDONESIAN_MONTH_SHORT[prevMonthIdx] || ''
  const currMonthShort = INDONESIAN_MONTH_SHORT[currMonthIdx] || ''

  return `Cut-off Tagihan CK (16 ${prevMonthShort} - 15 ${currMonthShort} ${currYearStr})`
}

/**
 * Returns full description label for CK Cut-off period.
 * Example: '16 September 2026 s/d 15 Oktober 2026'
 */
export function formatCkCutoffFullRange(period: string): string {
  const prevPeriod = getPreviousPeriod(period)
  const [prevYearStr, prevMonthStr] = prevPeriod.split('-')
  const [currYearStr, currMonthStr] = period.split('-')

  const prevMonthIdx = Number(prevMonthStr) - 1
  const currMonthIdx = Number(currMonthStr) - 1

  const prevMonthLong = INDONESIAN_MONTH_LONG[prevMonthIdx] || ''
  const currMonthLong = INDONESIAN_MONTH_LONG[currMonthIdx] || ''

  if (prevYearStr !== currYearStr) {
    return `16 ${prevMonthLong} ${prevYearStr} s/d 15 ${currMonthLong} ${currYearStr}`
  }
  return `16 ${prevMonthLong} s/d 15 ${currMonthLong} ${currYearStr}`
}

export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-').map(Number)
  return { year: parts[0] || 0, month: parts[1] || 0, day: parts[2] || 0 }
}

/**
 * Builds custom date range items for any arbitrary start and end dates (inclusive).
 * Example: '2026-09-16' to '2026-10-15', or '2026-09-17' to '2026-11-16'.
 */
export function buildCustomDateRange(
  startDateStr: string,
  endDateStr: string,
  holidays: HolidayLike[] = []
): CkCutoffDateItem[] {
  if (!startDateStr || !endDateStr) return []

  const { year: sY, month: sM, day: sD } = parseDateParts(startDateStr)
  const { year: eY, month: eM, day: eD } = parseDateParts(endDateStr)
  if (!sY || !sM || !sD || !eY || !eM || !eD) return []

  const start = new Date(sY, sM - 1, sD, 12, 0, 0)
  const end = new Date(eY, eM - 1, eD, 12, 0, 0)
  if (start > end) return []

  const result: CkCutoffDateItem[] = []
  const curr = new Date(start)
  let index = 0

  while (curr <= end) {
    const y = curr.getFullYear()
    const m = curr.getMonth() + 1
    const d = curr.getDate()

    const period = `${y}-${String(m).padStart(2, '0')}`
    const dateStr = `${period}-${String(d).padStart(2, '0')}`
    const dayOfWeek = curr.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const holidayMatch = holidays.find(
      (h) => h.date === dateStr || (h.day === d && h.date?.startsWith(period))
    )
    const isHoliday = Boolean(holidayMatch)
    const wdayShort = INDONESIAN_WEEKDAYS_SHORT[dayOfWeek]
    const monthShort = INDONESIAN_MONTH_SHORT[m - 1]
    const monthLong = INDONESIAN_MONTH_LONG[m - 1]

    result.push({
      index: index++,
      period,
      day: d,
      dateStr,
      monthShort,
      monthLong,
      year: y,
      displayHeader: `${String(d).padStart(2, '0')} ${monthShort}`,
      subHeader: isHoliday ? `${wdayShort}*` : wdayShort,
      isWeekend,
      isHoliday,
      isPrevMonth: false,
    })

    curr.setDate(curr.getDate() + 1)
  }

  return result
}

/**
 * Returns formatted short label for custom date range.
 * Example: 'Cut-Off (16 Sep - 15 Okt 2026)' or 'Cut-Off (17 Sep - 16 Nov 2026)'
 */
export function formatCustomDateRangeLabel(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return 'Cut-off Kustom'
  const start = parseDateParts(startDateStr)
  const end = parseDateParts(endDateStr)

  const sMonth = INDONESIAN_MONTH_SHORT[start.month - 1] || ''
  const eMonth = INDONESIAN_MONTH_SHORT[end.month - 1] || ''

  if (start.year !== end.year) {
    return `Cut-off (${start.day} ${sMonth} ${start.year} - ${end.day} ${eMonth} ${end.year})`
  }
  return `Cut-off (${start.day} ${sMonth} - ${end.day} ${eMonth} ${end.year})`
}

/**
 * Returns full description label for custom date range in Indonesian.
 * Example: '16 September 2026 s/d 15 Oktober 2026'
 */
export function formatCustomDateRangeFull(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return ''
  const start = parseDateParts(startDateStr)
  const end = parseDateParts(endDateStr)

  const sMonth = INDONESIAN_MONTH_LONG[start.month - 1] || ''
  const eMonth = INDONESIAN_MONTH_LONG[end.month - 1] || ''

  if (start.year !== end.year) {
    return `${start.day} ${sMonth} ${start.year} s/d ${end.day} ${eMonth} ${end.year}`
  }
  return `${start.day} ${sMonth} s/d ${end.day} ${eMonth} ${end.year}`
}
