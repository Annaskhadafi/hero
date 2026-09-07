import {
  IndonesiaTimezoneCode,
  normalizeIndonesiaTimezone,
  resolveTimezoneIana,
} from '@/lib/indonesia-timezone'

export const DEFAULT_SITE_ATTENDANCE_CLOCKS = {
  dayShiftClockIn: '08:00',
  nightShiftClockIn: '18:00',
  timezone: 'WITA' as IndonesiaTimezoneCode,
} as const

export type SiteAttendanceClockConfig = {
  dayShiftClockIn: string
  nightShiftClockIn: string
  timezone: IndonesiaTimezoneCode
}

export type AttendancePunctuality = {
  shiftCode: string
  scheduledClockIn: string
  lateMinutes: number
  isLate: boolean
  note: string
}

const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isClockTime(value: unknown): value is string {
  return typeof value === 'string' && CLOCK_TIME_PATTERN.test(value)
}

export function normalizeSiteAttendanceClockConfig(value: unknown): SiteAttendanceClockConfig {
  const config = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const legacyDayClock = isClockTime(config.defaultClockIn) ? config.defaultClockIn : null
  const timezone = normalizeIndonesiaTimezone(config.timezone).code

  return {
    dayShiftClockIn: isClockTime(config.dayShiftClockIn)
      ? config.dayShiftClockIn
      : (legacyDayClock ?? DEFAULT_SITE_ATTENDANCE_CLOCKS.dayShiftClockIn),
    nightShiftClockIn: isClockTime(config.nightShiftClockIn)
      ? config.nightShiftClockIn
      : DEFAULT_SITE_ATTENDANCE_CLOCKS.nightShiftClockIn,
    timezone,
  }
}

export function isStaffRole(role?: string | null): boolean {
  const r = (role ?? '').toLowerCase().trim()
  if (r.includes('non staff') || r.includes('non-staff') || r.includes('nonstaff')) return false
  if (r.includes('staff')) return true
  if (/manager|supervisor|admin|koordinator|coord|lead|head|superintendent|engineer|officer/i.test(r)) return true
  return false
}

export function resolveConfiguredShiftClockIn(
  shiftCode: string | null | undefined,
  config: SiteAttendanceClockConfig
) {
  const code = String(shiftCode ?? '')
    .trim()
    .toUpperCase()

  // Direct HH:mm or HH:mm-HH:mm schedule (e.g., "08:00", "08:00-17:00", "18:00-05:00")
  if (isClockTime(code)) return code
  const timeRangeMatch = code.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (timeRangeMatch) return timeRangeMatch[0]

  if (
    [
      'NS',
      'NIGHT',
      'MALAM',
      'SHIFT MALAM',
      'SHIFT 2',
      'SHIFT-2',
      'N',
      '2',
      'NIGHT SHIFT',
      'S2',
    ].includes(code)
  ) {
    return config.nightShiftClockIn
  }

  if (
    [
      'DS',
      'IN',
      'DAY',
      'PAGI',
      'SHIFT PAGI',
      'SHIFT 1',
      'SHIFT-1',
      'D',
      '1',
      'P',
      'REGULAR',
      'OFFICE',
      'DAY SHIFT',
      'S1',
    ].includes(code)
  ) {
    return config.dayShiftClockIn
  }

  return null
}

export function inferShiftFromClockInTime(
  clockInTime: string,
  config: SiteAttendanceClockConfig
): { shiftCode: 'night' | 'day'; scheduledClockIn: string } {
  const inM = clockMinutes(clockInTime)
  if (inM === null) {
    return { shiftCode: 'day', scheduledClockIn: config.dayShiftClockIn }
  }
  const dayStart = clockMinutes(config.dayShiftClockIn) ?? 480
  const nightStart = clockMinutes(config.nightShiftClockIn) ?? 1080
  const distDay = Math.min(Math.abs(inM - dayStart), 24 * 60 - Math.abs(inM - dayStart))
  const distNight = Math.min(Math.abs(inM - nightStart), 24 * 60 - Math.abs(inM - nightStart))

  if (distNight < distDay) {
    return { shiftCode: 'night', scheduledClockIn: config.nightShiftClockIn }
  }
  return { shiftCode: 'day', scheduledClockIn: config.dayShiftClockIn }
}

export function calculateLateMinutesFromTimes(
  clockIn: string | null | undefined,
  scheduledClockIn: string | null | undefined
): number | null {
  if (!clockIn || !scheduledClockIn) return null
  const inM = clockMinutes(clockIn)
  const schedM = clockMinutes(scheduledClockIn)
  if (inM === null || schedM === null) return null

  let difference = inM - schedM
  if (difference < -12 * 60) difference += 24 * 60
  else if (difference > 12 * 60) difference -= 24 * 60

  return Math.max(0, difference)
}

function clockMinutes(value: string) {
  const match = value.match(CLOCK_TIME_PATTERN)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function eventClockMinutes(eventTime: Date, timeZone?: string) {
  const iana = resolveTimezoneIana(timeZone)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: iana,
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
  timeZone?: string
) {
  const targetTz = timeZone || config.timezone
  const actual = eventClockMinutes(eventTime, targetTz)
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
  else if (difference > 12 * 60) difference -= 24 * 60
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

export function checkEmployeeOffDayStatus(input: {
  eventTime: Date
  role?: string | null
  scheduledCode?: string | null
  scheduleType?: string | null
  rosterType?: string | null
  timeZone?: string
}) {
  const staff = isStaffRole(input.role)
  const code = (input.scheduledCode ?? '').trim().toUpperCase()

  let isOffDay = false

  if (['OFF', 'FB', 'LIBUR', 'SAKIT', 'CUTI'].includes(code)) {
    isOffDay = true
  } else if (['IN', 'DS', 'NS', 'PAGI', 'MALAM'].includes(code)) {
    isOffDay = false
  } else {
    // Check by day of week based on timezone
    const iana = resolveTimezoneIana(input.timeZone)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      weekday: 'short',
    }).format(input.eventTime)

    const isWeekendDay = parts === 'Sat' || parts === 'Sun'
    const scheduleType = (input.scheduleType ?? 'shift').toLowerCase()
    const rosterType = (input.rosterType ?? '5:2').toLowerCase()

    if (scheduleType === 'office' || (scheduleType === 'hybrid' && staff) || rosterType === '5:2') {
      if (isWeekendDay) {
        isOffDay = true
      }
    }
  }

  // Staff cannot submit attendance on off-days by default; Non-Staff CAN submit attendance on off-days.
  const allowAttendance = !isOffDay || !staff

  return {
    isOffDay,
    isStaff: staff,
    allowAttendance,
    reason: isOffDay && staff
      ? 'Karyawan Staff tidak dijadwalkan absensi pada hari OFF/libur roster. Hubungi Site Admin jika ada penugasan khusus.'
      : null,
  }
}
