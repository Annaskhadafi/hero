export type SplOrigin = 'employee_request' | 'leader_command'
export type SplRequestKind = 'base' | 'extension'
export type SplCategory = 'break' | 'off_day' | 'after_mandatory_ot'

export type SplPolicyConfig = {
  enabled: boolean
  allowBreak: boolean
  allowOffDay: boolean
  allowAfterMandatoryOt: boolean
  dayShiftBreak: { start: string; end: string }
  nightShiftBreak: { start: string; end: string }
  submissionGraceDays: number
  minimumMinutes: number
  replacementOffMaxDays: number
}

export const DEFAULT_SPL_POLICY: SplPolicyConfig = {
  enabled: true,
  allowBreak: true,
  allowOffDay: true,
  allowAfterMandatoryOt: true,
  dayShiftBreak: { start: '12:00', end: '13:00' },
  nightShiftBreak: { start: '00:00', end: '01:00' },
  submissionGraceDays: 2,
  minimumMinutes: 60,
  replacementOffMaxDays: 30,
}

function validTime(value: unknown, fallback: string) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback
}

function boundedInt(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value)
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback
}

export function normalizeSplPolicy(value: unknown): SplPolicyConfig {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const dayBreak = source.dayShiftBreak as Record<string, unknown> | undefined
  const nightBreak = source.nightShiftBreak as Record<string, unknown> | undefined
  return {
    enabled: source.enabled !== false,
    allowBreak: source.allowBreak !== false,
    allowOffDay: source.allowOffDay !== false,
    allowAfterMandatoryOt: source.allowAfterMandatoryOt !== false,
    dayShiftBreak: {
      start: validTime(dayBreak?.start, DEFAULT_SPL_POLICY.dayShiftBreak.start),
      end: validTime(dayBreak?.end, DEFAULT_SPL_POLICY.dayShiftBreak.end),
    },
    nightShiftBreak: {
      start: validTime(nightBreak?.start, DEFAULT_SPL_POLICY.nightShiftBreak.start),
      end: validTime(nightBreak?.end, DEFAULT_SPL_POLICY.nightShiftBreak.end),
    },
    submissionGraceDays: boundedInt(source.submissionGraceDays, 2, 0, 14),
    minimumMinutes: boundedInt(source.minimumMinutes, 60, 15, 720),
    replacementOffMaxDays: boundedInt(source.replacementOffMaxDays, 30, 1, 90),
  }
}

function timeMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function localMinutes(value: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return Number(map.hour) * 60 + Number(map.minute)
}

function overlaps(start: number, end: number, windowStart: number, windowEnd: number) {
  const normalizedEnd = end <= start ? end + 1440 : end
  const normalizedWindowEnd = windowEnd <= windowStart ? windowEnd + 1440 : windowEnd
  return start < normalizedWindowEnd && windowStart < normalizedEnd
}

export function classifySplCategory(input: {
  scheduleCode: string
  shiftCode: string
  plannedStartAt: Date
  plannedEndAt: Date
  mandatoryOvertimeEnd?: string
  policy: SplPolicyConfig
}): SplCategory {
  if (['OFF', 'Libur'].includes(input.scheduleCode)) return 'off_day'
  const start = localMinutes(input.plannedStartAt)
  const end = localMinutes(input.plannedEndAt)
  const breakWindow = input.shiftCode === 'NS' ? input.policy.nightShiftBreak : input.policy.dayShiftBreak
  if (overlaps(start, end, timeMinutes(breakWindow.start), timeMinutes(breakWindow.end))) return 'break'
  return 'after_mandatory_ot'
}

export function validateSplRequestWindow(input: {
  now: Date
  workDate: Date
  plannedStartAt: Date
  plannedEndAt: Date
  policy: SplPolicyConfig
}) {
  if (!input.policy.enabled) return 'Pengajuan SPL belum diaktifkan untuk site ini.'
  const durationMinutes = Math.round(
    (input.plannedEndAt.getTime() - input.plannedStartAt.getTime()) / 60_000
  )
  if (durationMinutes < input.policy.minimumMinutes)
    return `Durasi SPL minimal ${input.policy.minimumMinutes} menit.`
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(input.workDate)
  const dateMap = Object.fromEntries(dateParts.map((part) => [part.type, part.value]))
  const deadline = new Date(
    Date.UTC(
      Number(dateMap.year),
      Number(dateMap.month) - 1,
      Number(dateMap.day) + input.policy.submissionGraceDays,
      15,
      59,
      59,
      999
    )
  )
  if (input.now > deadline) return `Pengajuan melewati batas H+${input.policy.submissionGraceDays}.`
  return null
}

export function sixOneOffCreditMinutes(workStreakDays: number) {
  return workStreakDays >= 13 ? 11 * 60 : 6 * 60
}

export function splCategoryAllowed(category: SplCategory, policy: SplPolicyConfig) {
  return category === 'break'
    ? policy.allowBreak
    : category === 'off_day'
      ? policy.allowOffDay
      : policy.allowAfterMandatoryOt
}
