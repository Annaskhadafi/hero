import { db } from '@/db'
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
    .select({ fieldBreakConfig: timesheetSchedulingConfigs.fieldBreakConfig })
    .from(timesheetSchedulingConfigs)
    .where(eq(timesheetSchedulingConfigs.siteId, siteId))
    .limit(1)

  return normalizeSiteAttendanceClockConfig(row?.fieldBreakConfig)
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
  const shiftCode = input.shiftCode?.trim() || inferShiftCodeForEvent(input.eventTime, config)
  const scheduledClockIn =
    resolveConfiguredShiftClockIn(shiftCode, config) ??
    (isClockTime(input.fallbackClockIn) ? input.fallbackClockIn : null)

  return scheduledClockIn
    ? calculateAttendancePunctuality({
        eventTime: input.eventTime,
        shiftCode,
        scheduledClockIn,
      })
    : null
}
