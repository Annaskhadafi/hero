import { db } from '@/db'
import { sites } from '@/db/schema/hero'
import { timesheetSchedulingConfigs } from '@/db/schema/timesheet'
import {
  calculateAttendancePunctuality,
  inferShiftCodeForEvent,
  isClockTime,
  normalizeSiteAttendanceClockConfig,
  resolveConfiguredShiftClockIn,
} from '@/lib/timesheet/attendance-punctuality'
import {
  inferTimezoneFromLocation,
  normalizeIndonesiaTimezone,
} from '@/lib/indonesia-timezone'
import { eq } from 'drizzle-orm'

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

export async function resolveSiteAttendancePunctuality(input: {
  siteId: number
  eventType: string
  eventTime: Date
  shiftCode?: string | null
  fallbackClockIn?: string | null
}) {
  if (input.eventType !== 'checked-in') return null

  const config = await getSiteAttendanceClockConfig(input.siteId)
  const rawShift = input.shiftCode?.trim()
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
