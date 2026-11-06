import {
  IndonesiaTimezoneCode,
  getTimezoneDateParts,
  inferTimezoneFromLocation,
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
  scheduleType?: string
  rosterType?: string
  rosterTypeStaff?: string
  rosterTypeNonStaff?: string
  staffDayShiftClockIn?: string
  staffDayShiftClockOut?: string
  staffNightShiftClockIn?: string
  staffNightShiftClockOut?: string
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

export function isNightShiftScheduleCode(code?: string | null): boolean {
  if (!code) return false
  const upper = String(code).trim().toUpperCase()
  return (
    [
      'NS',
      'NG',
      'N',
      'NIGHT',
      'NIGHTSHIFT',
      'NIGHT SHIFT',
      'MALAM',
      'SHIFT MALAM',
      'SHIFT 2',
      'SHIFT-2',
      'SHIFT2',
      '2',
      'S2',
    ].includes(upper) || upper.startsWith('NS')
  )
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
    scheduleType: typeof config.scheduleType === 'string' ? config.scheduleType : undefined,
    rosterType: typeof config.rosterType === 'string' ? config.rosterType : undefined,
    rosterTypeStaff: typeof config.rosterTypeStaff === 'string' ? config.rosterTypeStaff : undefined,
    rosterTypeNonStaff: typeof config.rosterTypeNonStaff === 'string' ? config.rosterTypeNonStaff : undefined,
    staffDayShiftClockIn: isClockTime(config.staffDayShiftClockIn)
      ? config.staffDayShiftClockIn
      : undefined,
    staffDayShiftClockOut: isClockTime(config.staffDayShiftClockOut)
      ? config.staffDayShiftClockOut
      : undefined,
    staffNightShiftClockIn: isClockTime(config.staffNightShiftClockIn)
      ? config.staffNightShiftClockIn
      : undefined,
    staffNightShiftClockOut: isClockTime(config.staffNightShiftClockOut)
      ? config.staffNightShiftClockOut
      : undefined,
  }
}

export function resolveSiteAttendanceClockConfig(
  site: {
    id?: number | string | null
    name?: string | null
    location?: string | null
    provinceName?: string | null
    regencyName?: string | null
    timezone?: string | null
  } | null | undefined,
  schedulingConfig: {
    siteId?: number | string | null
    timezone?: string | null
    scheduleType?: string | null
    rosterType?: string | null
    fieldBreakConfig?: unknown
  } | null | undefined
): SiteAttendanceClockConfig {
  const fbConfig =
    schedulingConfig?.fieldBreakConfig && typeof schedulingConfig.fieldBreakConfig === 'object'
      ? (schedulingConfig.fieldBreakConfig as Record<string, unknown>)
      : {}

  const inferredTimezone = inferTimezoneFromLocation(
    [site?.location, site?.provinceName, site?.regencyName, site?.name].filter(Boolean).join(' ')
  )

  const rawTimezone =
    schedulingConfig?.timezone ||
    (fbConfig.timezone as string | undefined) ||
    site?.timezone ||
    inferredTimezone
  const timezone = normalizeIndonesiaTimezone(rawTimezone).code

  return normalizeSiteAttendanceClockConfig({
    ...fbConfig,
    scheduleType: schedulingConfig?.scheduleType ?? (fbConfig.scheduleType as string | undefined),
    rosterType: schedulingConfig?.rosterType ?? (fbConfig.rosterType as string | undefined),
    timezone,
  })
}

export function isStaffRole(
  role?: string | null,
  jobTitle?: string | null,
  levelName?: string | null
): boolean {
  if (levelName) {
    const lvl = levelName.trim().toLowerCase()
    if (lvl.includes('non staff') || lvl.includes('non-staff') || lvl.includes('nonstaff')) {
      return false
    }
    if (
      lvl.includes('staff') ||
      lvl.includes('supervisor') ||
      lvl.includes('spv') ||
      lvl.includes('manager') ||
      lvl.includes('coordinator') ||
      lvl.includes('coord') ||
      lvl.includes('leader') ||
      lvl.includes('lead') ||
      lvl.includes('head') ||
      lvl.includes('engineer') ||
      lvl.includes('officer') ||
      lvl.includes('analyst') ||
      lvl.includes('executive') ||
      lvl.includes('bod') ||
      lvl.includes('director')
    ) {
      return true
    }
  }
  const combined = `${role ?? ''} ${jobTitle ?? ''}`.toLowerCase().trim()
  if (!combined) return false
  if (combined.includes('non staff') || combined.includes('non-staff') || combined.includes('nonstaff')) return false
  if (/^(serviceman|repairman|operator|mekanik|mechanic|helper|driver|technician pa)/i.test((role ?? '').trim()) && !combined.includes('leader') && !combined.includes('spv')) {
    return false
  }
  if (combined.includes('staff')) return true
  if (/manager|supervisor|spv|admin|koordinator|coord|leader|lead|head|superintendent|engineer|analyst|officer|specialist|director|trainer|support|secretary|planning|planing/i.test(combined)) {
    return true
  }
  return false
}

export function resolveConfiguredShiftClockIn(
  shiftCode: string | null | undefined,
  config: SiteAttendanceClockConfig,
  isStaff?: boolean
) {
  const code = String(shiftCode ?? '')
    .trim()
    .toUpperCase()

  // Direct HH:mm or HH:mm-HH:mm schedule (e.g., "08:00", "08:00-17:00", "18:00-05:00")
  if (isClockTime(code)) return code
  const timeRangeMatch = String(code).match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (timeRangeMatch) return timeRangeMatch[0]

  const isHybridStaff = Boolean(config.scheduleType === 'hybrid' && isStaff)

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
    if (isHybridStaff && config.staffNightShiftClockIn) {
      return config.staffNightShiftClockIn
    }
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
    if (isHybridStaff && config.staffDayShiftClockIn) {
      return config.staffDayShiftClockIn
    }
    return config.dayShiftClockIn
  }

  return null
}

export function inferShiftFromClockInTime(
  clockInTime: string,
  config: SiteAttendanceClockConfig,
  isStaff?: boolean
): { shiftCode: 'night' | 'day'; scheduledClockIn: string } {
  const inM = clockMinutes(clockInTime)
  const isHybridStaff = Boolean(config.scheduleType === 'hybrid' && isStaff)
  const targetDayIn = (isHybridStaff && config.staffDayShiftClockIn) || config.dayShiftClockIn
  const targetNightIn = (isHybridStaff && config.staffNightShiftClockIn) || config.nightShiftClockIn

  if (inM === null) {
    return { shiftCode: 'day', scheduledClockIn: targetDayIn }
  }
  const dayStart = clockMinutes(targetDayIn) ?? 480
  const nightStart = clockMinutes(targetNightIn) ?? 1080
  const distDay = Math.min(Math.abs(inM - dayStart), 24 * 60 - Math.abs(inM - dayStart))
  const distNight = Math.min(Math.abs(inM - nightStart), 24 * 60 - Math.abs(inM - nightStart))

  if (distNight < distDay) {
    return { shiftCode: 'night', scheduledClockIn: targetNightIn }
  }
  return { shiftCode: 'day', scheduledClockIn: targetDayIn }
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

export function updatePunctualityInNote(
  baseNote: string | null | undefined,
  punctualityNote: string | null | undefined
): string {
  if (!punctualityNote) return baseNote ?? ''
  if (!baseNote || !baseNote.trim()) return punctualityNote

  const parts = baseNote
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
  const punctIndex = parts.findIndex((p) => p.startsWith('Kehadiran:'))
  if (punctIndex >= 0) {
    parts[punctIndex] = punctualityNote
  } else {
    parts.push(punctualityNote)
  }
  return parts.join(' | ')
}

export function evaluateAttendanceGridPunctuality(input: {
  clockIn: string | null | undefined
  scheduleCode?: string | null
  siteConfig: SiteAttendanceClockConfig
  isStaff?: boolean
}): {
  shiftCode: string | null
  scheduledClockIn: string
  lateMinutes: number | null
  isLate: boolean
  punctualityNote: string | null
} {
  const { clockIn, scheduleCode, siteConfig, isStaff } = input
  const isHybridStaff = Boolean(siteConfig.scheduleType === 'hybrid' && isStaff)
  const targetDefaultDayIn = (isHybridStaff && siteConfig.staffDayShiftClockIn) || siteConfig.dayShiftClockIn

  const configuredClockIn = resolveConfiguredShiftClockIn(scheduleCode, siteConfig, isStaff)
  const inferred = clockIn ? inferShiftFromClockInTime(clockIn, siteConfig, isStaff) : null
  const scheduledClockIn =
    configuredClockIn || inferred?.scheduledClockIn || targetDefaultDayIn
  const shiftCode = scheduleCode || inferred?.shiftCode || null

  if (!clockIn || !scheduledClockIn) {
    return {
      shiftCode,
      scheduledClockIn,
      lateMinutes: null,
      isLate: false,
      punctualityNote: null,
    }
  }

  const lateMinutes = calculateLateMinutesFromTimes(clockIn, scheduledClockIn)
  const isLate = Boolean(lateMinutes !== null && lateMinutes > 0)
  const punctualityNote = isLate
    ? `Kehadiran: Terlambat ${lateMinutes} menit (jadwal ${scheduledClockIn})`
    : `Kehadiran: Tepat waktu (jadwal ${scheduledClockIn})`

  return {
    shiftCode,
    scheduledClockIn,
    lateMinutes,
    isLate,
    punctualityNote,
  }
}

export function resolveShiftDateForEvent(input: {
  eventTime: Date
  shiftCode?: string | null
  siteConfig: SiteAttendanceClockConfig
}): string {
  const { eventTime, shiftCode, siteConfig } = input
  const tz = siteConfig.timezone
  const parts = getTimezoneDateParts(eventTime, tz)
  const hour = parts.hours
  const code = String(shiftCode ?? '').trim().toUpperCase()
  const nightCodes = ['NS','NIGHT','MALAM','SHIFT MALAM','SHIFT 2','SHIFT-2','N','2','NIGHT SHIFT','S2']
  const isNightShift = nightCodes.includes(code) || (!code && hour < 12 && hour >= 0)
  // Untuk night shift, event jam 00:00-11:59 masih milik shiftDate kemarin (checkout esok)
  if (isNightShift && hour < 12) {
    // Kurangi 1 hari secara timezone-aware
    const d = new Date(eventTime)
    // Gunakan parts untuk buat date lokal lalu -1
    const pad = (n:number)=> String(n).padStart(2,'0')
    const localMidnightStr = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T00:00:00${parts.timezoneInfo.offsetString}`
    const localMidnight = new Date(localMidnightStr)
    const prevMidnight = new Date(localMidnight.getTime() - 24*60*60*1000)
    const prevParts = getTimezoneDateParts(prevMidnight, tz)
    return `${prevParts.year}-${pad(prevParts.month)}-${pad(prevParts.day)}`
  }
  const pad2 = (n:number)=> String(n).padStart(2,'0')
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

export function getShiftWindowForDate(shiftDateStr: string, siteConfig: SiteAttendanceClockConfig): { start: Date; end: Date } {
  const nightStart = clockMinutes(siteConfig.nightShiftClockIn) ?? 19*60
  const dayStart = clockMinutes(siteConfig.dayShiftClockIn) ?? 8*60
  const isNightDate = true // untuk AMM Mifa, night shift window dipakai untuk shiftDate tersebut
  const tzInfo = normalizeIndonesiaTimezone(siteConfig.timezone)
  // Start = shiftDate 19:00, End = shiftDate+1 12:00 (cover checkout sampai siang)
  const [y,m,d] = shiftDateStr.split('-').map(Number)
  const pad = (n:number)=> String(n).padStart(2,'0')
  const startStr = `${y}-${pad(m)}-${pad(d)}T${String(Math.floor(nightStart/60)).padStart(2,'0')}:${String(nightStart%60).padStart(2,'0')}:00${tzInfo.offsetString}`
  const endDate = new Date(`${y}-${pad(m)}-${pad(d)}T00:00:00${tzInfo.offsetString}`)
  endDate.setDate(endDate.getDate()+1)
  const endParts = getTimezoneDateParts(endDate, siteConfig.timezone)
  const endStr = `${endParts.year}-${pad(endParts.month)}-${pad(endParts.day)}T12:00:00${tzInfo.offsetString}`
  return { start: new Date(startStr), end: new Date(endStr) }
}

export function checkEmployeeOffDayStatus(input: {
  eventTime: Date
  role?: string | null
  jobTitle?: string | null
  levelName?: string | null
  scheduledCode?: string | null
  scheduleType?: string | null
  rosterType?: string | null
  rosterTypeStaff?: string | null
  rosterTypeNonStaff?: string | null
  timeZone?: string
}) {
  const staff = isStaffRole(input.role, input.jobTitle, input.levelName)
  const code = (input.scheduledCode ?? '').trim().toUpperCase()

  let isOffDay = false

  if (['OFF', 'FB', 'AL', 'LIBUR', 'SAKIT', 'CUTI'].includes(code)) {
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
    const effectiveRosterType = (
      scheduleType === 'hybrid'
        ? (staff ? (input.rosterTypeStaff ?? '5:2') : (input.rosterTypeNonStaff ?? input.rosterType ?? '6:1'))
        : (input.rosterType ?? '5:2')
    ).toLowerCase()

    if (scheduleType === 'office' || (scheduleType === 'hybrid' && staff) || effectiveRosterType === '5:2') {
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

export async function resolveNightShiftCheckoutContext(input: {
  employeeId: number
  siteId?: number
  eventTime: Date
  eventType: string
}) {
  const eventType = input.eventType || ''
  const isCheckOut =
    eventType === 'checked-out' ||
    eventType.toLowerCase().includes('out') ||
    eventType.toLowerCase().includes('pulang') ||
    eventType.toLowerCase().includes('checkout')

  if (!isCheckOut) {
    return { isNightShiftCheckout: false, effectiveDate: input.eventTime }
  }

  // Check local time hour (00:00 - 12:00 morning window)
  const localHour = input.eventTime.getHours()
  if (localHour >= 12) {
    return { isNightShiftCheckout: false, effectiveDate: input.eventTime }
  }

  // Look for an unclosed night check-in in the past 24 hours
  const past24h = new Date(input.eventTime.getTime() - 24 * 60 * 60 * 1000)

  let recentPunches: Array<{ id: number; eventType: string; eventTime: Date }> = []

  if (typeof window === 'undefined') {
    try {
      const loadDbHelper = new Function('p', 'return import(p)')
      const { getRecentPunchesForNightShift } = await loadDbHelper('./attendance-night-shift-db')
      recentPunches = await getRecentPunchesForNightShift(input.employeeId, past24h, input.eventTime)
    } catch {
      recentPunches = []
    }
  }

  const lastCheckIn = recentPunches.find(
    (p) =>
      p.eventType === 'checked-in' ||
      (!p.eventType.toLowerCase().includes('out') &&
        !p.eventType.toLowerCase().includes('pulang') &&
        !p.eventType.toLowerCase().includes('checkout'))
  )

  if (!lastCheckIn) {
    return { isNightShiftCheckout: false, effectiveDate: input.eventTime }
  }

  const checkInHour = lastCheckIn.eventTime.getHours()
  const isNightCheckIn = checkInHour >= 15 || checkInHour < 5

  const checkInDateStr = lastCheckIn.eventTime.toISOString().slice(0, 10)
  const checkOutDateStr = input.eventTime.toISOString().slice(0, 10)

  if (isNightCheckIn && checkInDateStr !== checkOutDateStr) {
    return {
      isNightShiftCheckout: true,
      shiftDate: lastCheckIn.eventTime,
      checkInRecord: lastCheckIn,
      effectiveDate: lastCheckIn.eventTime, // Evaluates against Monday's Night Shift
    }
  }

  return { isNightShiftCheckout: false, effectiveDate: input.eventTime }
}

