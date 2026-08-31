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
import { eq } from 'drizzle-orm'

export async function getSiteAttendanceClockConfig(siteId: number) {
  const [row] = await db
    .select({
      fieldBreakConfig: timesheetSchedulingConfigs.fieldBreakConfig,
      configTimezone: timesheetSchedulingConfigs.timezone,
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
  const timezone = row?.configTimezone || row?.siteTimezone || fbConfig.timezone || 'WITA'

  return normalizeSiteAttendanceClockConfig({
    ...fbConfig,
    timezone,
  })
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
