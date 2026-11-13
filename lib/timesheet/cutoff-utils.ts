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
