import { db } from '@/db'
import { sites } from '@/db/schema/hero'
import { timesheetSchedulingConfigs } from '@/db/schema/timesheet'
import {
  calculateAttendancePunctuality,
  inferShiftCodeForEvent,
  isClockTime,
  resolveConfiguredShiftClockIn,
  resolveSiteAttendanceClockConfig,
} from '@/lib/timesheet/attendance-punctuality'
import { eq } from 'drizzle-orm'

export { resolveSiteAttendanceClockConfig } from '@/lib/timesheet/attendance-punctuality'

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

  const clockConfig = resolveSiteAttendanceClockConfig(
    row
      ? {
          id: siteId,
          name: row.siteName,
          location: row.siteLocation,
          provinceName: row.provinceName,
          regencyName: row.regencyName,
          timezone: row.siteTimezone,
        }
      : null,
    row
      ? {
          siteId,
          timezone: row.configTimezone,
          fieldBreakConfig: row.fieldBreakConfig,
        }
      : null
  )

  return {
    ...clockConfig,
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
  const shiftCode =
    input.shiftCode?.trim() || inferShiftCodeForEvent(input.eventTime, config, config.timezone)
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
