export const DEFAULT_SITE_ATTENDANCE_CLOCKS = {
  dayShiftClockIn: '08:00',
  nightShiftClockIn: '18:00',
} as const

export type SiteAttendanceClockConfig = {
  dayShiftClockIn: string
  nightShiftClockIn: string
}

export type AttendancePunctuality = {
  shiftCode: string
  scheduledClockIn: string
  lateMinutes: number
  isLate: boolean
  note: string
}

const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const APP_TIME_ZONE = 'Asia/Makassar'

export function isClockTime(value: unknown): value is string {
  return typeof value === 'string' && CLOCK_TIME_PATTERN.test(value)
}

export function normalizeSiteAttendanceClockConfig(value: unknown): SiteAttendanceClockConfig {
  const config = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const legacyDayClock = isClockTime(config.defaultClockIn) ? config.defaultClockIn : null

  return {
    dayShiftClockIn: isClockTime(config.dayShiftClockIn)
      ? config.dayShiftClockIn
      : (legacyDayClock ?? DEFAULT_SITE_ATTENDANCE_CLOCKS.dayShiftClockIn),
    nightShiftClockIn: isClockTime(config.nightShiftClockIn)
      ? config.nightShiftClockIn
      : DEFAULT_SITE_ATTENDANCE_CLOCKS.nightShiftClockIn,
  }
}

export function resolveConfiguredShiftClockIn(
  shiftCode: string | null | undefined,
  config: SiteAttendanceClockConfig
) {
  const code = String(shiftCode ?? '')
    .trim()
    .toUpperCase()
  if (['NS', 'NIGHT'].includes(code)) return config.nightShiftClockIn
  if (['DS', 'IN', 'DAY'].includes(code)) return config.dayShiftClockIn
  return null
}

function clockMinutes(value: string) {
  const match = value.match(CLOCK_TIME_PATTERN)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function eventClockMinutes(eventTime: Date, timeZone = APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(eventTime)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)
  return hour * 60 + minute
}

export function inferShiftCodeForEvent(
  eventTime: Date,
  config: SiteAttendanceClockConfig,
  timeZone = APP_TIME_ZONE
) {
  const actual = eventClockMinutes(eventTime, timeZone)
  const dayStart = clockMinutes(config.dayShiftClockIn) ?? 0
  const nightStart = clockMinutes(config.nightShiftClockIn) ?? 0
  const circularDistance = (start: number) => {
    const distance = Math.abs(actual - start)
    return Math.min(distance, 24 * 60 - distance)
  }

  return circularDistance(nightStart) < circularDistance(dayStart) ? 'night' : 'day'
}

export function calculateAttendancePunctuality(input: {
  eventTime: Date
  shiftCode: string
  scheduledClockIn: string
  timeZone?: string
}): AttendancePunctuality {
  const scheduled = clockMinutes(input.scheduledClockIn)
  if (scheduled === null) {
    throw new Error('Scheduled clock-in must use HH:mm format.')
  }

  const actual = eventClockMinutes(input.eventTime, input.timeZone)
  let difference = actual - scheduled
  if (difference < -12 * 60) difference += 24 * 60
  const lateMinutes = Math.max(0, difference)
  const isLate = lateMinutes > 0

  return {
    shiftCode: input.shiftCode,
    scheduledClockIn: input.scheduledClockIn,
    lateMinutes,
    isLate,
    note: isLate
      ? `Kehadiran: Terlambat ${lateMinutes} menit (jadwal ${input.scheduledClockIn})`
      : `Kehadiran: Tepat waktu (jadwal ${input.scheduledClockIn})`,
  }
}

export function getPunctualityDetail(locationNote: string | null | undefined) {
  return (
    locationNote
      ?.split('|')
      .map((part) => part.trim())
      .find((part) => part.startsWith('Kehadiran:')) ?? null
  )
}
