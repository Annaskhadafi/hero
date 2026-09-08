import { db } from '@/db'
import { sites } from '@/db/schema/hero'
import {
  timesheetSchedulingConfigs,
  timesheetSchedulingPlans,
  timesheetSchedulingPlansV2,
} from '@/db/schema/timesheet'
import {
  calculateAttendancePunctuality,
  inferShiftCodeForEvent,
  isClockTime,
  isOffScheduleCode,
  normalizeSiteAttendanceClockConfig,
  resolveConfiguredShiftClockIn,
} from '@/lib/timesheet/attendance-punctuality'
import {
  inferTimezoneFromLocation,
  normalizeIndonesiaTimezone,
  resolveTimezoneIana,
} from '@/lib/indonesia-timezone'
import { and, eq } from 'drizzle-orm'

export async function getSiteAttendanceClockConfig(siteId: number) {
  const [row] = await db
    .select({
      fieldBreakConfig: timesheetSchedulingConfigs.fieldBreakConfig,
      configTimezone: timesheetSchedulingConfigs.timezone,
      scheduleType: timesheetSchedulingConfigs.scheduleType,
      rosterType: timesheetSchedulingConfigs.rosterType,
      siteName: sites.name,
      siteLocation: sites.location,
      provinceName: sites.provinceName,
      regencyName: sites.regencyName,
      siteTimezone: sites.timezone,
    })
    .from(sites)
    .leftJoin(timesheetSchedulingConfigs, eq(timesheetSchedulingConfigs.siteId, sites.id))
    .where(eq(sites.id, siteId))
    .limit(1)

  const fbConfig =
    row?.fieldBreakConfig && typeof row.fieldBreakConfig === 'object'
      ? (row.fieldBreakConfig as Record<string, unknown>)
      : {}

  const inferredTimezone = inferTimezoneFromLocation(
    [row?.siteLocation, row?.provinceName, row?.regencyName, row?.siteName].filter(Boolean).join(' ')
  )

  const rawTimezone =
    row?.configTimezone || fbConfig.timezone || row?.siteTimezone || inferredTimezone
  const timezone = normalizeIndonesiaTimezone(rawTimezone).code

  return {
    ...normalizeSiteAttendanceClockConfig({
      ...fbConfig,
      timezone,
    }),
    scheduleType: row?.scheduleType || 'office',
    rosterType: row?.rosterType || '5:2',
  }
}

export async function getEmployeeScheduledCodeForDate(input: {
  employeeId: number
  siteId: number
  eventTime: Date
  timeZone?: string
}): Promise<string | null> {
  const iana = resolveTimezoneIana(input.timeZone)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(input.eventTime)
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const dayStr = parts.find((p) => p.type === 'day')?.value
  if (!year || !month || !dayStr) return null

  const period = `${year}-${month}`
  const dayIndex = Number(dayStr) - 1

  try {
    // 1. Try timesheetSchedulingPlansV2
    const [planV2] = await db
      .select({
        activeSchedule: timesheetSchedulingPlansV2.activeSchedule,
        draftSchedule: timesheetSchedulingPlansV2.draftSchedule,
      })
      .from(timesheetSchedulingPlansV2)
      .where(
        and(
          eq(timesheetSchedulingPlansV2.siteId, input.siteId),
          eq(timesheetSchedulingPlansV2.period, period)
        )
      )
      .limit(1)

    const v2Rows = (
      Array.isArray(planV2?.activeSchedule) && (planV2.activeSchedule as any[]).length > 0
        ? planV2.activeSchedule
        : planV2?.draftSchedule
    ) as Array<{ employeeId?: number; schedule?: string[] }> | undefined

    const empV2 = v2Rows?.find((r) => r.employeeId === input.employeeId)
    if (empV2 && Array.isArray(empV2.schedule) && empV2.schedule[dayIndex]) {
      return empV2.schedule[dayIndex]
    }

    // 2. Try legacy timesheetSchedulingPlans
    const [planV1] = await db
      .select({
        fixedSchedule: timesheetSchedulingPlans.fixedSchedule,
        draftSchedule: timesheetSchedulingPlans.draftSchedule,
      })
      .from(timesheetSchedulingPlans)
      .where(
        and(
          eq(timesheetSchedulingPlans.siteId, input.siteId),
          eq(timesheetSchedulingPlans.period, period)
        )
      )
      .limit(1)

    const v1Rows = (
      Array.isArray(planV1?.fixedSchedule) && (planV1.fixedSchedule as any[]).length > 0
        ? planV1.fixedSchedule
        : planV1?.draftSchedule
    ) as Array<{ employeeId?: number; schedule?: string[] }> | undefined

    const empV1 = v1Rows?.find((r) => r.employeeId === input.employeeId)
    if (empV1 && Array.isArray(empV1.schedule) && empV1.schedule[dayIndex]) {
      return empV1.schedule[dayIndex]
    }
  } catch {
    // ignore query failure
  }

  return null
}

export async function resolveSiteAttendancePunctuality(input: {
  siteId: number
  eventType: string
  eventTime: Date
  shiftCode?: string | null
  fallbackClockIn?: string | null
  employeeId?: number | null
}) {
  if (input.eventType !== 'checked-in') return null

  const config = await getSiteAttendanceClockConfig(input.siteId)
  let rawShift = input.shiftCode?.trim()

  // If shiftCode is not provided or 'auto', try looking up employee's roster schedule
  if ((!rawShift || rawShift === 'auto') && input.employeeId) {
    try {
      const scheduledCode = await getEmployeeScheduledCodeForDate({
        employeeId: input.employeeId,
        siteId: input.siteId,
        eventTime: input.eventTime,
        timeZone: config.timezone,
      })
      if (scheduledCode) {
        rawShift = scheduledCode
      }
    } catch {
      // ignore lookup error
    }
  }

  // If scheduled code is OFF / FB / LIBUR / leave, return null (not late)
  if (isOffScheduleCode(rawShift)) {
    return null
  }

  const shiftCode =
    rawShift && rawShift !== 'auto'
      ? rawShift
      : inferShiftCodeForEvent(input.eventTime, config, config.timezone)
  const scheduledClockIn =
    resolveConfiguredShiftClockIn(shiftCode, config) ??
    (isClockTime(input.fallbackClockIn) ? input.fallbackClockIn : null)

  return scheduledClockIn
    ? calculateAttendancePunctuality({
        eventTime: input.eventTime,
        shiftCode,
        scheduledClockIn,
        timeZone: config.timezone,
      })
    : null
}
