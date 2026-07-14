import { isWeekend, isHoliday, type HolidayLike, normalizeRosterSection } from '@/lib/timesheet-scheduling'

export const scheduleV2Codes = ['', 'OFF', 'DS', 'NS', 'FB', 'ST'] as const

export type ScheduleV2Code = (typeof scheduleV2Codes)[number]

export type ScheduleV2Row = {
  employeeId: number
  schedule: ScheduleV2Code[]
  kimperLv?: boolean
  kimperTh?: boolean
  section?: string
  positionOnSite?: string
}

export type FieldBreakSchedulePlan = {
  employeeId: number
  fieldBreakDate?: string | null
  fieldBreakEndDate?: string | null
}

export type FieldBreakScheduleRange = {
  employeeId: number
  fieldBreakDate: string | null
  fieldBreakEndDate: string | null
}

export function getScheduleV2DayCount(period: string) {
  const [year, month] = period.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function createEmptyScheduleV2(
  employees: { id: number; section?: string | null; role?: string | null }[],
  period: string,
  holidays: HolidayLike[] = []
): ScheduleV2Row[] {
  const dayCount = getScheduleV2DayCount(period)
  
  return employees.map((employee) => {
    const rosterSection = normalizeRosterSection(employee.section || employee.role)
    const isOffice = rosterSection === 'Crew Office'
    
    const schedule = Array.from({ length: dayCount }, (_, i) => {
      const day = i + 1
      if (isOffice && (isWeekend(period, day) || isHoliday(period, day, holidays))) return 'OFF'
      return ''
    }) as ScheduleV2Code[]

    return {
      employeeId: employee.id,
      schedule,
    }
  })
}

export function cycleScheduleV2Code(code: ScheduleV2Code): ScheduleV2Code {
  const index = scheduleV2Codes.indexOf(code)
  return scheduleV2Codes[(index + 1) % scheduleV2Codes.length]
}

export function applyScheduleV2Code(
  rows: ScheduleV2Row[],
  employeeId: number,
  day: number,
  code: ScheduleV2Code,
  repeatWeeklyOff = true
) {
  return rows.map((row) => {
    if (row.employeeId !== employeeId) return row
    const schedule = [...row.schedule]
    for (
      let targetDay = day;
      targetDay <= schedule.length;
      targetDay += repeatWeeklyOff ? 7 : schedule.length + 1
    ) {
      schedule[targetDay - 1] = code
    }
    return { ...row, schedule }
  })
}

export function applyFieldBreakPlansToSchedule(
  rows: ScheduleV2Row[],
  plans: FieldBreakSchedulePlan[],
  period: string
) {
  const dayCount = getScheduleV2DayCount(period)
  const breaksByEmployee = new Map<number, FieldBreakSchedulePlan[]>()
  for (const plan of plans) {
    if (!plan.fieldBreakDate) continue
    breaksByEmployee.set(plan.employeeId, [...(breaksByEmployee.get(plan.employeeId) ?? []), plan])
  }

  return rows.map((row) => {
    const schedule = [...row.schedule]
    for (const plan of breaksByEmployee.get(row.employeeId) ?? []) {
      const from = plan.fieldBreakDate ?? ''
      const to = plan.fieldBreakEndDate || from
      for (let day = 1; day <= dayCount; day++) {
        const date = `${period}-${String(day).padStart(2, '0')}`
        if (date >= from && date <= to) schedule[day - 1] = 'FB'
      }
    }
    return { ...row, schedule }
  })
}

export function replaceFieldBreakPlansInSchedule(
  rows: ScheduleV2Row[],
  plans: FieldBreakSchedulePlan[],
  period: string
) {
  return applyFieldBreakPlansToSchedule(
    rows.map((row) =>
      plans.some((plan) => plan.employeeId === row.employeeId)
        ? { ...row, schedule: row.schedule.map((code) => (code === 'FB' ? '' : code)) }
        : row
    ),
    plans,
    period
  )
}

export function getFieldBreakScheduleRanges(rows: ScheduleV2Row[], period: string) {
  return rows.map<FieldBreakScheduleRange>((row) => {
    let bestStart = -1
    let bestEnd = -1
    let start = -1

    row.schedule.forEach((code, index) => {
      if (code === 'FB' && start < 0) start = index
      if (code !== 'FB' && start >= 0) {
        if (index - start > bestEnd - bestStart) [bestStart, bestEnd] = [start, index - 1]
        start = -1
      }
    })
    if (start >= 0 && row.schedule.length - start > bestEnd - bestStart) {
      [bestStart, bestEnd] = [start, row.schedule.length - 1]
    }

    return {
      employeeId: row.employeeId,
      fieldBreakDate: bestStart < 0 ? null : `${period}-${String(bestStart + 1).padStart(2, '0')}`,
      fieldBreakEndDate: bestEnd < 0 ? null : `${period}-${String(bestEnd + 1).padStart(2, '0')}`,
    }
  })
}

export function getScheduleV2Progress(rows: ScheduleV2Row[]) {
  const total = rows.reduce((sum, row) => sum + row.schedule.length, 0)
  const filled = rows.reduce(
    (sum, row) => sum + row.schedule.filter((code) => code !== '').length,
    0
  )
  return { filled, total, complete: total > 0 && filled === total }
}

export function isCompleteScheduleV2(rows: ScheduleV2Row[], employeeIds: number[], period: string) {
  const expectedIds = new Set(employeeIds)
  const dayCount = getScheduleV2DayCount(period)
  if (rows.length !== expectedIds.size) return false
  return rows.every(
    (row) =>
      expectedIds.has(row.employeeId) &&
      row.schedule.length === dayCount &&
      row.schedule.every((code) => code !== '' && scheduleV2Codes.includes(code))
  )
}

export function mergeActiveSchedulePlans<
  T extends { siteId: number; period: string },
  V extends { siteId: number; period: string; status: string; activeSchedule: ScheduleV2Row[] },
>(v1Plans: T[], v2Plans: V[], toPlan: (plan: V) => T) {
  const activeV2 = v2Plans.filter((plan) => plan.status === 'active' && plan.activeSchedule.length)
  const activeKeys = new Set(activeV2.map((plan) => `${plan.siteId}:${plan.period}`))
  return [
    ...v1Plans.filter((plan) => !activeKeys.has(`${plan.siteId}:${plan.period}`)),
    ...activeV2.map(toPlan),
  ]
}
