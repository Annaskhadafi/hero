export type FieldBreakEmployee = {
  employeeId: number
  employeeName: string
  sectionName: string
  rosterSection: string
}

export type FieldBreakExistingPlan = {
  employeeId: number
  period: string
  onSiteDate?: string | null
  fieldBreakDate?: string | null
  fieldBreakEndDate?: string | null
  source?: string | null
  isLocked?: boolean | null
  notes?: string | null
}

export type GeneratedFieldBreakPlan = {
  employeeId: number
  employeeName: string
  sectionName: string
  rosterSection: string
  period: string
  onSiteDate: string
  dayCount: number
  fieldBreakDate: string
  fieldBreakEndDate: string
  source: 'auto' | 'manual'
  isLocked: boolean
  notes: string
}

export function getFieldBreakCapacity(employeeCount: number) {
  return Math.max(1, Math.floor(employeeCount / 6))
}

export function addMonths(value: string, months: number) {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  const day = date.getUTCDate()
  date.setUTCMonth(date.getUTCMonth() + months)
  if (date.getUTCDate() !== day) date.setUTCDate(0)
  return date.toISOString().slice(0, 10)
}

export function addDaysIso(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function monthPeriods(startPeriod: string, count: number) {
  const [year, month] = startPeriod.split('-').map(Number)
  if (!year || !month) return []
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - 1 + index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

export function isDateRangeOverlapping(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && startB <= endA
}

export function validateFieldBreakCapacity(
  plans: GeneratedFieldBreakPlan[],
  employeeCount?: number
) {
  const capacity = getFieldBreakCapacity(
    employeeCount ?? new Set(plans.map((plan) => plan.employeeId)).size
  )
  const violations: Array<{ date: string; count: number; capacity: number }> = []
  const counts = new Map<string, number>()

  for (const plan of plans) {
    let date = plan.fieldBreakDate
    while (date && date <= plan.fieldBreakEndDate) {
      counts.set(date, (counts.get(date) ?? 0) + 1)
      date = addDaysIso(date, 1)
    }
  }

  for (const [date, count] of Array.from(counts.entries())) {
    if (count > capacity) violations.push({ date, count, capacity })
  }

  return violations
}

export function generateFieldBreakYearPlans(input: {
  employees: FieldBreakEmployee[]
  startPeriod: string
  workMonths?: number
  breakDays?: number
  workWeeks?: number
  breakWeeks?: number
  existingPlans?: FieldBreakExistingPlan[]
}) {
  const workMonths = input.workMonths ?? 3
  const workWeeks = input.workWeeks ?? null
  const breakDays = input.breakWeeks ? input.breakWeeks * 7 : input.breakDays ?? 14
  const workDays = workWeeks ? workWeeks * 7 : workMonths * 30
  const periods = monthPeriods(input.startPeriod, 12)
  const firstDay = `${input.startPeriod}-01`
  const employees = [...input.employees].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  )
  const capacity = getFieldBreakCapacity(employees.length)
  const existingByEmployeePeriod = new Map(
    (input.existingPlans ?? []).map((plan) => [`${plan.employeeId}:${plan.period}`, plan])
  )
  const generated: GeneratedFieldBreakPlan[] = []
  const activeBreaks: Array<{ start: string; end: string }> = []

  employees.forEach((employee) => {
    // Get the manual onSiteDate from the first period if it exists
    const existingFirst = existingByEmployeePeriod.get(`${employee.employeeId}:${periods[0]}`)
    const onSiteDate = existingFirst?.onSiteDate && existingFirst.onSiteDate !== '' 
      ? existingFirst.onSiteDate 
      : null

    let shiftedStart = ''
    let shiftedEnd = ''

    if (onSiteDate) {
      const fieldBreakDate = workWeeks
        ? addDaysIso(onSiteDate, workDays)
        : addMonths(onSiteDate, workMonths)
      const fieldBreakEndDate = addDaysIso(fieldBreakDate, breakDays - 1)
      const maxFieldBreakDate = workWeeks
        ? addDaysIso(onSiteDate, (workWeeks + 4) * 7)
        : addMonths(onSiteDate, 4)

      // ponytail: linear collision shift is enough for yearly site rosters; replace with interval scheduler if customer adds many hard constraints.
      shiftedStart = fieldBreakDate
      shiftedEnd = fieldBreakEndDate
      while (
        activeBreaks.filter((item) =>
          isDateRangeOverlapping(shiftedStart, shiftedEnd, item.start, item.end)
        ).length >= capacity
      ) {
        const nextShiftStart = addDaysIso(shiftedStart, breakDays)
        if (nextShiftStart > maxFieldBreakDate) break
        shiftedStart = nextShiftStart
        shiftedEnd = addDaysIso(shiftedEnd, breakDays)
      }
      activeBreaks.push({ start: shiftedStart, end: shiftedEnd })
    }

    for (const period of periods) {
      const existing = existingByEmployeePeriod.get(`${employee.employeeId}:${period}`)
      if (existing?.isLocked) {
        generated.push({
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
          sectionName: employee.sectionName,
          rosterSection: employee.rosterSection,
          period,
          onSiteDate: existing.onSiteDate ?? '',
          dayCount: daysBetween(existing.onSiteDate, existing.fieldBreakDate) ?? workDays,
          fieldBreakDate: existing.fieldBreakDate ?? '',
          fieldBreakEndDate: existing.fieldBreakEndDate ?? '',
          source: 'manual',
          isLocked: true,
          notes: existing.notes ?? '',
        })
        continue
      }

      generated.push({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        sectionName: employee.sectionName,
        rosterSection: employee.rosterSection,
        period,
        onSiteDate: onSiteDate ?? '',
        dayCount: onSiteDate ? workDays : null,
        fieldBreakDate: shiftedStart,
        fieldBreakEndDate: shiftedEnd,
        source: onSiteDate ? 'auto' : 'manual',
        isLocked: false,
        notes: existing?.notes ?? '',
      })
    }
  })

  return { plans: generated, capacity }
}

function daysBetween(from?: string | null, to?: string | null) {
  if (!from || !to) return null
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T00:00:00`).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return Math.max(1, Math.round((end - start) / 86400000))
}
