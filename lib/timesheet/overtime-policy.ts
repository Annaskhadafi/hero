import { DEFAULT_SPL_POLICY, normalizeSplPolicy, type SplPolicyConfig } from '@/lib/spl-policy'

export type OvertimeDayKey = 'hariBiasa' | 'hariLibur' | 'hariKe6' | 'hariKe7'
export type OvertimeShiftKey = 'dayShift' | 'nightShift'

export type OvertimeInterval = {
  start: string
  end: string
}

export type OvertimeDayRule = Record<OvertimeShiftKey, OvertimeInterval[]>

export type SiteOvertimeConfig = {
  enabled: boolean
  splPolicy: SplPolicyConfig
  hariBiasa: OvertimeDayRule
  hariLibur: OvertimeDayRule
  hariKe6: OvertimeDayRule
  hariKe7: OvertimeDayRule
}

export type ApprovedSplWindow = {
  id: number
  splNumber: string
  siteId: number
  employeeId: number
  plannedStartAt: string
  plannedEndAt: string
  status: string
  category?: 'break' | 'off_day' | 'after_mandatory_ot'
  overtimeCreditMinutes?: number | null
  evidenceStatus?: string
  payrollPeriod?: string
}

export type CalculatedTimeInterval = {
  startMinute: number
  endMinute: number
  start: string
  end: string
}

export type EligibleOvertimeInterval = CalculatedTimeInterval & {
  source: 'Auto' | 'SPL' | 'Auto + SPL'
}

export type OvertimeCalculationResult = {
  totalMinutes: number
  totalHours: number
  autoMinutes: number
  splMinutes: number
  unauthorizedMinutes: number
  source: 'None' | 'Auto' | 'SPL' | 'Auto + SPL' | 'Legacy'
  splNumbers: string[]
  intervals: EligibleOvertimeInterval[]
  workingIntervals: CalculatedTimeInterval[]
}

type MinuteInterval = {
  start: number
  end: number
  sources?: Set<'auto' | 'spl'>
}

const EMPTY_RESULT: OvertimeCalculationResult = {
  totalMinutes: 0,
  totalHours: 0,
  autoMinutes: 0,
  splMinutes: 0,
  unauthorizedMinutes: 0,
  source: 'None',
  splNumbers: [],
  intervals: [],
  workingIntervals: [],
}

export const DEFAULT_SITE_OVERTIME_CONFIG: SiteOvertimeConfig = {
  enabled: false,
  splPolicy: DEFAULT_SPL_POLICY,
  hariBiasa: {
    dayShift: [
      { start: '06:00', end: '08:00' },
      { start: '16:00', end: '18:00' },
    ],
    nightShift: [
      { start: '18:00', end: '20:00' },
      { start: '04:00', end: '06:00' },
    ],
  },
  hariLibur: {
    dayShift: [
      { start: '06:00', end: '12:00' },
      { start: '13:00', end: '18:00' },
    ],
    nightShift: [
      { start: '18:00', end: '00:00' },
      { start: '01:00', end: '06:00' },
    ],
  },
  hariKe6: {
    dayShift: [
      { start: '06:00', end: '08:00' },
      { start: '14:00', end: '18:00' },
    ],
    nightShift: [
      { start: '18:00', end: '20:00' },
      { start: '02:00', end: '06:00' },
    ],
  },
  hariKe7: {
    dayShift: [
      { start: '06:00', end: '08:00' },
      { start: '14:00', end: '18:00' },
    ],
    nightShift: [
      { start: '18:00', end: '20:00' },
      { start: '02:00', end: '06:00' },
    ],
  },
}

function cloneDefaults(): SiteOvertimeConfig {
  return {
    enabled: DEFAULT_SITE_OVERTIME_CONFIG.enabled,
    splPolicy: normalizeSplPolicy(DEFAULT_SITE_OVERTIME_CONFIG.splPolicy),
    hariBiasa: {
      dayShift: DEFAULT_SITE_OVERTIME_CONFIG.hariBiasa.dayShift.map((item) => ({ ...item })),
      nightShift: DEFAULT_SITE_OVERTIME_CONFIG.hariBiasa.nightShift.map((item) => ({ ...item })),
    },
    hariLibur: {
      dayShift: DEFAULT_SITE_OVERTIME_CONFIG.hariLibur.dayShift.map((item) => ({ ...item })),
      nightShift: DEFAULT_SITE_OVERTIME_CONFIG.hariLibur.nightShift.map((item) => ({ ...item })),
    },
    hariKe6: {
      dayShift: DEFAULT_SITE_OVERTIME_CONFIG.hariKe6.dayShift.map((item) => ({ ...item })),
      nightShift: DEFAULT_SITE_OVERTIME_CONFIG.hariKe6.nightShift.map((item) => ({ ...item })),
    },
    hariKe7: {
      dayShift: DEFAULT_SITE_OVERTIME_CONFIG.hariKe7.dayShift.map((item) => ({ ...item })),
      nightShift: DEFAULT_SITE_OVERTIME_CONFIG.hariKe7.nightShift.map((item) => ({ ...item })),
    },
  }
}

export function parseTimeMinutes(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function intervalMinutes(interval: OvertimeInterval) {
  const start = parseTimeMinutes(interval.start)
  const end = parseTimeMinutes(interval.end)
  if (start == null || end == null || start === end) return 0
  return end > start ? end - start : end + 1440 - start
}

export function overtimeRuleTotalHours(rule: OvertimeDayRule, shift: OvertimeShiftKey) {
  return rule[shift].reduce((total, interval) => total + intervalMinutes(interval), 0) / 60
}

function normalizeIntervals(value: unknown, fallback: OvertimeInterval[]) {
  if (!Array.isArray(value) || value.length !== 2) return fallback.map((item) => ({ ...item }))
  const intervals = value.map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    return { start: String(row.start ?? ''), end: String(row.end ?? '') }
  })
  return intervals.every((item) => intervalMinutes(item) > 0)
    ? intervals
    : fallback.map((item) => ({ ...item }))
}

function normalizeShiftKeys(rule: OvertimeDayRule): OvertimeDayRule {
  const dayStart = parseTimeMinutes(rule.dayShift[0]?.start ?? '')
  const nightStart = parseTimeMinutes(rule.nightShift[0]?.start ?? '')
  return dayStart != null && nightStart != null && dayStart >= 12 * 60 && nightStart < 12 * 60
    ? { dayShift: rule.nightShift, nightShift: rule.dayShift }
    : rule
}

export function normalizeSiteOvertimeConfig(value: unknown): SiteOvertimeConfig {
  const fallback = cloneDefaults()
  if (!value || typeof value !== 'object') return fallback
  const source = value as Record<string, unknown>
  const result = {
    ...fallback,
    enabled: source.enabled === true,
    splPolicy: normalizeSplPolicy(source.splPolicy),
  }
  for (const dayKey of ['hariBiasa', 'hariLibur', 'hariKe6', 'hariKe7'] as const) {
    const day =
      source[dayKey] && typeof source[dayKey] === 'object'
        ? (source[dayKey] as Record<string, unknown>)
        : {}
    result[dayKey] = normalizeShiftKeys({
      dayShift: normalizeIntervals(day.dayShift, fallback[dayKey].dayShift),
      nightShift: normalizeIntervals(day.nightShift, fallback[dayKey].nightShift),
    })
  }
  return result
}

export function validateSiteOvertimeConfig(config: SiteOvertimeConfig) {
  const errors: string[] = []
  for (const dayKey of ['hariBiasa', 'hariLibur', 'hariKe6', 'hariKe7'] as const) {
    for (const shiftKey of ['dayShift', 'nightShift'] as const) {
      const intervals = config[dayKey][shiftKey]
      if (intervals.length !== 2) errors.push(`${dayKey}.${shiftKey} wajib memiliki 2 sesi.`)
      for (const interval of intervals) {
        if (intervalMinutes(interval) <= 0)
          errors.push(`${dayKey}.${shiftKey} memiliki rentang jam tidak valid.`)
      }
      const expanded = intervals
        .map(toBaseMinuteInterval)
        .filter((item): item is MinuteInterval => item != null)
      for (let left = 0; left < expanded.length; left += 1) {
        for (let right = left + 1; right < expanded.length; right += 1) {
          const a = expanded[left]
          const b = expanded[right]
          if (
            overlaps(a, b) ||
            overlaps(a, { start: b.start + 1440, end: b.end + 1440 }) ||
            overlaps({ start: a.start + 1440, end: a.end + 1440 }, b)
          )
            errors.push(`${dayKey}.${shiftKey} memiliki sesi yang tumpang tindih.`)
        }
      }
    }
  }
  return [...new Set(errors)]
}

export function classifyOvertimePolicyDay(params: {
  schedule: string[]
  dayIndex: number
  isHoliday: boolean
  nextScheduleCode?: string
  rosterType?: string
}): OvertimeDayKey {
  const current = params.schedule[params.dayIndex]
  if (params.isHoliday || current === 'OFF' || current === 'Libur') return 'hariLibur'

  if (params.rosterType === '13:1') {
    let workingDays = 0
    for (let i = 0; i <= params.dayIndex; i++) {
      const code = params.schedule[i]
      if (code === 'OFF' || code === 'Libur') {
        workingDays = 0
      } else {
        workingDays++
      }
    }
    if (workingDays > 0 && workingDays % 7 === 0) {
      return 'hariKe7'
    }
    if (workingDays > 0 && workingDays % 7 === 6) {
      return 'hariKe6'
    }
  }

  const next = params.schedule[params.dayIndex + 1] ?? params.nextScheduleCode
  return next === 'OFF' || next === 'Libur' ? 'hariKe6' : 'hariBiasa'
}

function toBaseMinuteInterval(interval: OvertimeInterval): MinuteInterval | null {
  const start = parseTimeMinutes(interval.start)
  const rawEnd = parseTimeMinutes(interval.end)
  if (start == null || rawEnd == null || start === rawEnd) return null
  return { start, end: rawEnd > start ? rawEnd : rawEnd + 1440 }
}

function overlaps(left: MinuteInterval, right: MinuteInterval) {
  return left.start < right.end && right.start < left.end
}

function intersect(left: MinuteInterval, right: MinuteInterval): MinuteInterval | null {
  const start = Math.max(left.start, right.start)
  const end = Math.min(left.end, right.end)
  return end > start ? { start, end } : null
}

function intervalOccurrences(intervals: OvertimeInterval[]) {
  return intervals.flatMap((interval) => {
    const base = toBaseMinuteInterval(interval)
    if (!base) return []
    return [-1440, 0, 1440].map((offset) => ({
      start: base.start + offset,
      end: base.end + offset,
    }))
  })
}

function alignedConfiguredIntervals(intervals: OvertimeInterval[], overnight: boolean) {
  const expanded = intervals
    .map(toBaseMinuteInterval)
    .filter((item): item is MinuteInterval => item != null)
    .map((item) => ({ ...item }))
  if (expanded.length !== 2) return []

  if (overnight) {
    const eveningStart = Math.max(...expanded.map((item) => item.start))
    for (const interval of expanded) {
      if (interval.start < eveningStart) {
        interval.start += 1440
        interval.end += 1440
      }
    }
  }

  expanded.sort((left, right) => left.start - right.start)
  return expanded
}

function configuredNonOvertimeGap(intervals: OvertimeInterval[], overnight: boolean) {
  const expanded = alignedConfiguredIntervals(intervals, overnight)
  if (expanded.length !== 2) return []
  return expanded[0].end < expanded[1].start
    ? [{ start: expanded[0].end, end: expanded[1].start }]
    : []
}

function configuredShiftEnvelope(intervals: OvertimeInterval[], overnight: boolean) {
  const expanded = alignedConfiguredIntervals(intervals, overnight)
  return expanded.length === 2
    ? [{ start: expanded[0].start, end: expanded[1].end }]
    : []
}

function mergeIntervals(intervals: MinuteInterval[]) {
  const sorted = intervals
    .filter((item) => item.end > item.start)
    .sort((left, right) => left.start - right.start || left.end - right.end)
  const merged: MinuteInterval[] = []
  for (const interval of sorted) {
    const last = merged.at(-1)
    if (!last || interval.start > last.end) {
      merged.push({
        start: interval.start,
        end: interval.end,
        sources: new Set(interval.sources),
      })
      continue
    }
    last.end = Math.max(last.end, interval.end)
    interval.sources?.forEach((source) => last.sources?.add(source))
  }
  return merged
}

function intersectSets(left: MinuteInterval[], right: MinuteInterval[]) {
  const result: MinuteInterval[] = []
  for (const a of left) {
    for (const b of right) {
      const match = intersect(a, b)
      if (match) result.push(match)
    }
  }
  return mergeIntervals(result)
}

function subtractIntervals(base: MinuteInterval[], exclusions: MinuteInterval[]) {
  let result = mergeIntervals(base)
  for (const exclusion of mergeIntervals(exclusions)) {
    result = result.flatMap((interval) => {
      const match = intersect(interval, exclusion)
      if (!match) return [interval]
      return [
        interval.start < match.start ? { start: interval.start, end: match.start } : null,
        match.end < interval.end ? { start: match.end, end: interval.end } : null,
      ].filter((item): item is MinuteInterval => item != null)
    })
  }
  return result
}

function totalMinutes(intervals: MinuteInterval[]) {
  return mergeIntervals(intervals).reduce((total, item) => total + item.end - item.start, 0)
}

function formatMinute(minute: number) {
  const normalized = ((minute % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}

function attendanceInterval(clockIn: string, clockOut: string): MinuteInterval | null {
  const start = parseTimeMinutes(clockIn)
  const rawEnd = parseTimeMinutes(clockOut)
  if (start == null || rawEnd == null || start === rawEnd) return null
  return { start, end: rawEnd > start ? rawEnd : rawEnd + 1440 }
}

const makassarFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Makassar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function zonedDateTimeParts(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(
    makassarFormatter.formatToParts(date).map((part) => [part.type, part.value])
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

function utcDayNumber(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}

function splInterval(window: ApprovedSplWindow, workDate: string): MinuteInterval | null {
  const start = zonedDateTimeParts(window.plannedStartAt)
  const end = zonedDateTimeParts(window.plannedEndAt)
  if (!start || !end) return null
  const startMinute = (utcDayNumber(start.date) - utcDayNumber(workDate)) * 1440 + start.minutes
  let endMinute = (utcDayNumber(end.date) - utcDayNumber(workDate)) * 1440 + end.minutes
  if (endMinute <= startMinute) endMinute += 1440
  return endMinute > startMinute ? { start: startMinute, end: endMinute } : null
}

export function calculateConfiguredOvertime(params: {
  config: SiteOvertimeConfig
  dayKey: OvertimeDayKey
  shiftCode: string
  workDate: string
  clockIn: string
  clockOut: string
  splWindows?: ApprovedSplWindow[]
}): OvertimeCalculationResult {
  if (!params.config.enabled) return { ...EMPTY_RESULT }
  const attendance = attendanceInterval(params.clockIn, params.clockOut)
  if (!attendance) return { ...EMPTY_RESULT }

  const overnight = params.shiftCode === 'NS'
  const shiftKey: OvertimeShiftKey = overnight ? 'nightShift' : 'dayShift'
  const fullAttendance = [attendance]
  const configuredIntervals = params.config[params.dayKey][shiftKey]
  const normalWork = configuredNonOvertimeGap(configuredIntervals, overnight)
  const shiftEnvelope = configuredShiftEnvelope(configuredIntervals, overnight)
  const outsideConfiguredShift =
    params.dayKey === 'hariLibur' ? fullAttendance : subtractIntervals(fullAttendance, shiftEnvelope)
  const autoConfigured = intervalOccurrences(configuredIntervals)
  const autoEligible = (params.dayKey === 'hariLibur' ? [] : intersectSets(fullAttendance, autoConfigured)).map((item) => ({
    ...item,
    sources: new Set<'auto' | 'spl'>(['auto']),
  }))

  const matchedSpl: Array<{
    interval: MinuteInterval
    splNumber: string
    category: ApprovedSplWindow['category']
    fixedMinutes: number
  }> = []
  for (const window of params.splWindows ?? []) {
    if (!['approved', 'closed'].includes(window.status.toLowerCase())) continue
    const interval = splInterval(window, params.workDate)
    if (!interval || interval.end - interval.start < params.config.splPolicy.minimumMinutes) continue
    const overlapsAttendance = intersect(interval, attendance)
    if (overlapsAttendance)
      matchedSpl.push({
        interval: overlapsAttendance,
        splNumber: window.splNumber,
        category: window.category,
        fixedMinutes: window.overtimeCreditMinutes ?? 0,
      })
  }
  const splEligible = intersectSets(
    fullAttendance,
    matchedSpl.flatMap((item) => {
      if (item.category === 'break' || item.category === 'off_day') return [item.interval]
      const outside = outsideConfiguredShift.map((candidate) => intersect(candidate, item.interval)).filter((match): match is MinuteInterval => match != null)
      return outside
    })
  ).map((item) => ({ ...item, sources: new Set<'auto' | 'spl'>(['spl']) }))
  const contributingSplNumbers = matchedSpl
    .filter(({ interval, category }) =>
      category === 'break' || category === 'off_day' || outsideConfiguredShift.some((candidate) => intersect(interval, candidate))
    )
    .map((item) => item.splNumber)
  const eligible = mergeIntervals([...autoEligible, ...splEligible])
  const unauthorized = subtractIntervals(outsideConfiguredShift, splEligible)
  const unauthorizedTotal = totalMinutes(unauthorized)
  const workingIntervals =
    params.dayKey === 'hariLibur' ? [] : intersectSets(fullAttendance, normalWork)
  const hasAuto = autoEligible.length > 0
  const hasSpl = splEligible.length > 0
  const fixedSplMinutes = Math.max(0, ...matchedSpl.map((item) => item.fixedMinutes))
  const calculatedTotalMinutes = fixedSplMinutes || totalMinutes(eligible)

  return {
    totalMinutes: calculatedTotalMinutes,
    totalHours: calculatedTotalMinutes / 60,
    autoMinutes: totalMinutes(autoEligible),
    splMinutes: totalMinutes(splEligible),
    unauthorizedMinutes:
      unauthorizedTotal >= params.config.splPolicy.minimumMinutes ? unauthorizedTotal : 0,
    source: hasAuto && hasSpl ? 'Auto + SPL' : hasAuto ? 'Auto' : hasSpl ? 'SPL' : 'None',
    splNumbers: [...new Set(contributingSplNumbers)],
    intervals: eligible.map((item) => ({
      startMinute: item.start,
      endMinute: item.end,
      start: formatMinute(item.start),
      end: formatMinute(item.end),
      source:
        item.sources?.has('auto') && item.sources.has('spl')
          ? 'Auto + SPL'
          : item.sources?.has('spl')
            ? 'SPL'
            : 'Auto',
    })),
    workingIntervals: workingIntervals.map((item) => ({
      startMinute: item.start,
      endMinute: item.end,
      start: formatMinute(item.start),
      end: formatMinute(item.end),
    })),
  }
}

export function legacyOvertimeResult(hours: number): OvertimeCalculationResult {
  const totalHours = Math.max(0, hours)
  return {
    ...EMPTY_RESULT,
    totalMinutes: Math.round(totalHours * 60),
    totalHours,
    source: totalHours > 0 ? 'Legacy' : 'None',
  }
}

export function calculateOvertime(
  params: Parameters<typeof calculateConfiguredOvertime>[0] & { legacyHours: number }
): OvertimeCalculationResult {
  if (!params.config.enabled) return legacyOvertimeResult(params.legacyHours)
  return calculateConfiguredOvertime(params)
}
