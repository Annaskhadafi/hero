import { db } from '@/db'
import { attendanceRecords } from '@/db/schema/hero'
import { and, desc, eq, gte, lte } from 'drizzle-orm'

export async function getRecentPunchesForNightShift(
  employeeId: number,
  past24h: Date,
  eventTime: Date
) {
  return await db
    .select({
      id: attendanceRecords.id,
      eventType: attendanceRecords.eventType,
      eventTime: attendanceRecords.eventTime,
    })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        gte(attendanceRecords.eventTime, past24h),
        lte(attendanceRecords.eventTime, eventTime)
      )
    )
    .orderBy(desc(attendanceRecords.eventTime))
}
