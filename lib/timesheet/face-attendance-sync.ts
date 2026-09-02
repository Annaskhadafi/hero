import { db } from '@/db'
import { attendanceRecords, sites } from '@/db/schema/hero'
import { timesheetAttendanceRealOverrides, timesheetSchedulingConfigs } from '@/db/schema/timesheet'
import { and, eq, gte, lt } from 'drizzle-orm'
import { ensureSchedulingTimesheetTables } from '@/lib/timesheet/scheduling-infrastructure'
import {
  derivePeriodAndDayInTimezone,
  formatTimeHHMMInTimezone,
  getTimezoneDateParts,
  getTimezoneDayBoundaries,
  normalizeIndonesiaTimezone,
} from '@/lib/indonesia-timezone'

export interface SyncResult {
  employeeId: number
  siteId: number
  period: string
  day: number
  clockIn: string
  clockOut: string
  status: 'present' | 'empty'
  workMinutes: number | null
  validationFlags: string[]
}

/**
 * Returns true if eventType contains 'out', 'pulang', or 'checkout' (case-insensitive).
 */
export function isCheckOutEvent(eventType: string): boolean {
  const lower = eventType.toLowerCase()
  return lower.includes('out') || lower.includes('pulang') || lower.includes('checkout')
}

/**
 * Resolves the configured timezone code for a site from scheduling configs or sites table.
 */
export async function getSiteTimezone(siteId: number): Promise<string> {
  const [row] = await db
    .select({
      siteTz: sites.timezone,
      configTz: timesheetSchedulingConfigs.timezone,
      fieldBreakConfig: timesheetSchedulingConfigs.fieldBreakConfig,
    })
    .from(sites)
    .leftJoin(timesheetSchedulingConfigs, eq(timesheetSchedulingConfigs.siteId, sites.id))
    .where(eq(sites.id, siteId))
    .limit(1)

  const fbConfig =
    row?.fieldBreakConfig && typeof row.fieldBreakConfig === 'object'
      ? (row.fieldBreakConfig as Record<string, unknown>)
      : {}

  return row?.configTz || row?.siteTz || (fbConfig.timezone as string | undefined) || 'WITA'
}

/**
 * Backward compatibility helpers
 */
export function wibParts(date: Date, timezone = 'WIB') {
  const { year, month, day, hours, minutes } = getTimezoneDateParts(date, timezone)
  return { year, month, day, hours, minutes }
}

export function wibDayBoundaries(date: Date, timezone = 'WIB'): { startOfDay: Date; startOfNextDay: Date } {
  return getTimezoneDayBoundaries(date, timezone)
}

export function derivePeriodAndDay(eventTime: Date, timezone = 'WIB'): { period: string; day: number } {
  return derivePeriodAndDayInTimezone(eventTime, timezone)
}

export function formatTimeHHMM(date: Date, timezone = 'WIB'): string {
  return formatTimeHHMMInTimezone(date, timezone)
}

/**
 * Computes positive minute difference between clockIn and clockOut (HH:mm strings).
 * Handles overnight: if clockOut < clockIn, adds 1440 minutes (24h).
 * Returns null if either is empty.
 */
export function computeWorkMinutes(clockIn: string, clockOut: string): number | null {
  if (!clockIn || !clockOut) return null

  const [inH, inM] = clockIn.split(':').map(Number)
  const [outH, outM] = clockOut.split(':').map(Number)

  if (!Number.isFinite(inH) || !Number.isFinite(inM)) return null
  if (!Number.isFinite(outH) || !Number.isFinite(outM)) return null

  const inMinutes = inH * 60 + inM
  const outMinutes = outH * 60 + outM

  let diff = outMinutes - inMinutes
  if (diff < 0) {
    diff += 1440 // overnight shift
  }

  return diff
}

/**
 * Queries all attendance records for a given employee+site on the given date,
 * partitions into check-ins/check-outs, computes earliest check-in and latest check-out,
 * sets validationFlags, and upserts into timesheetAttendanceRealOverrides with source: 'attendance'.
 * Automatically respects the site's local timezone (WIB, WITA, or WIT).
 */
export async function syncFaceAttendanceToTimesheet(
  employeeId: number,
  siteId: number,
  eventDate: Date,
  explicitTimezone?: string
): Promise<SyncResult | null> {
  // Ensure timesheet tables exist
  await ensureSchedulingTimesheetTables()

  const siteTimezone = explicitTimezone || (await getSiteTimezone(siteId))
  const tzInfo = normalizeIndonesiaTimezone(siteTimezone)

  console.log(
    `[face-sync] Syncing attendance: employee=${employeeId}, site=${siteId}, date=${eventDate.toISOString()}, tz=${tzInfo.code}`
  )

  // Compute site local day boundaries for DB query (eventDate is stored as UTC in DB)
  const { startOfDay, startOfNextDay } = getTimezoneDayBoundaries(eventDate, tzInfo.code)

  // Query all attendance records for this employee+site+day
  const records = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.siteId, siteId),
        gte(attendanceRecords.eventTime, startOfDay),
        lt(attendanceRecords.eventTime, startOfNextDay)
      )
    )

  if (records.length === 0) {
    return null
  }

  const sortedRecords = [...records].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime())

  // Check if today's earliest punch is an early-morning checkout (< 09:00 local time) belonging to yesterday's Night Shift
  const firstPunch = sortedRecords[0]
  const firstPunchLocalHours = firstPunch ? getTimezoneDateParts(firstPunch.eventTime, tzInfo.code).hours : 0
  const isEarlyMorningPunch = firstPunchLocalHours < 9

  if (isEarlyMorningPunch) {
    const previousDayDate = new Date(startOfDay.getTime() - 12 * 60 * 60 * 1000)
    const prevBoundaries = getTimezoneDayBoundaries(previousDayDate, tzInfo.code)
    const prevRecords = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.siteId, siteId),
          gte(attendanceRecords.eventTime, prevBoundaries.startOfDay),
          lt(attendanceRecords.eventTime, prevBoundaries.startOfNextDay)
        )
      )
    const prevSorted = [...prevRecords].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime())
    const prevFirstPunch = prevSorted[0]
    const prevFirstPunchHours = prevFirstPunch
      ? getTimezoneDateParts(prevFirstPunch.eventTime, tzInfo.code).hours
      : 0
    const prevHasNightCheckIn = prevFirstPunchHours >= 15

    if (prevHasNightCheckIn) {
      // Sync previous day so it gets updated with today's early morning checkout
      await syncFaceAttendanceToTimesheet(employeeId, siteId, previousDayDate, tzInfo.code)

      // If today has NO punches at or after 09:00 local time, all punches today are just yesterday's Night Shift checkout
      const punchesAfterMorning = sortedRecords.filter(
        (r) => getTimezoneDateParts(r.eventTime, tzInfo.code).hours >= 9
      )
      if (punchesAfterMorning.length === 0) {
        const { period, day } = derivePeriodAndDayInTimezone(eventDate, tzInfo.code)
        await db
          .delete(timesheetAttendanceRealOverrides)
          .where(
            and(
              eq(timesheetAttendanceRealOverrides.siteId, siteId),
              eq(timesheetAttendanceRealOverrides.period, period),
              eq(timesheetAttendanceRealOverrides.employeeId, employeeId),
              eq(timesheetAttendanceRealOverrides.day, day),
              eq(timesheetAttendanceRealOverrides.source, 'attendance')
            )
          )
        return null
      }
    }
  }

  // Partition into check-ins and check-outs
  const checkIns = records.filter((r) => !isCheckOutEvent(r.eventType))
  const checkOuts = records.filter((r) => isCheckOutEvent(r.eventType))

  // Timesheet attendance uses earliest punch as clock-in and latest valid punch as clock-out in site timezone.
  const clockIn = firstPunch ? formatTimeHHMMInTimezone(firstPunch.eventTime, tzInfo.code) : ''

  // Determine if this punch is a Night Shift candidate (e.g. evening start >= 15:00 or early morning < 05:00)
  const isNightShift = firstPunchLocalHours >= 15 || firstPunchLocalHours < 5

  let clockOut = ''

  // 1. Explicit check-out events on the same day
  if (checkOuts.length > 0) {
    const latestCheckOut = [...checkOuts].sort((a, b) => b.eventTime.getTime() - a.eventTime.getTime())[0]
    clockOut = formatTimeHHMMInTimezone(latestCheckOut.eventTime, tzInfo.code)
  }
  // 2. Same-day punches at least 2 hours apart (for Day Shifts)
  else if (!isNightShift) {
    const punchesLater = sortedRecords.filter(
      (r) => r.eventTime.getTime() - firstPunch.eventTime.getTime() >= 2 * 60 * 60 * 1000
    )
    if (punchesLater.length > 0) {
      clockOut = formatTimeHHMMInTimezone(punchesLater[punchesLater.length - 1].eventTime, tzInfo.code)
    }
  }

  // 3. Overnight shift handling for Night Shift: look for punches on next day 00:00 - 09:00 local time
  if (isNightShift || (!clockOut && checkIns.length > 0)) {
    // 09:00 next day = startOfNextDay + 9h
    const nextDayCutoff = new Date(startOfNextDay.getTime() + 9 * 60 * 60 * 1000)

    const overnightRecords = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.siteId, siteId),
          gte(attendanceRecords.eventTime, startOfNextDay),
          lt(attendanceRecords.eventTime, nextDayCutoff)
        )
      )

    if (overnightRecords.length > 0) {
      const sortedOvernight = [...overnightRecords].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime())
      const lastOvernight = sortedOvernight[sortedOvernight.length - 1]
      clockOut = `${formatTimeHHMMInTimezone(lastOvernight.eventTime, tzInfo.code)} (+1d)`
    }
  }

  // Compute work minutes
  const workMinutes = computeWorkMinutes(clockIn, clockOut)

  // Set validation flags (AFTER overnight resolution)
  const validationFlags: string[] = []
  if (checkIns.length > 0 && checkOuts.length === 0 && !clockOut) {
    validationFlags.push('missing-check-out')
  }
  if (checkOuts.length > 0 && checkIns.length === 0) {
    validationFlags.push('missing-check-in')
  }

  // GPS flag propagation: scan locationNote for [gps-unavailable]
  for (const record of records) {
    if (record.locationNote?.includes('[gps-unavailable]')) {
      if (!validationFlags.includes('gps-unavailable')) {
        validationFlags.push('gps-unavailable')
      }
      break
    }
  }

  // Derive period and day in site timezone
  const { period, day } = derivePeriodAndDayInTimezone(eventDate, tzInfo.code)

  // Determine status
  const status = 'present'

  // Upsert into timesheetAttendanceRealOverrides
  await db
    .insert(timesheetAttendanceRealOverrides)
    .values({
      siteId,
      period,
      employeeId,
      day,
      status,
      clockIn,
      clockOut,
      note: '',
      source: 'attendance',
      validationFlags,
      workMinutes,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        timesheetAttendanceRealOverrides.siteId,
        timesheetAttendanceRealOverrides.period,
        timesheetAttendanceRealOverrides.employeeId,
        timesheetAttendanceRealOverrides.day,
      ],
      set: {
        status,
        clockIn,
        clockOut,
        source: 'attendance',
        validationFlags,
        workMinutes,
        updatedAt: new Date(),
      },
    })

  console.log(
    `[face-sync] ✓ Upserted: site=${siteId}, period=${period}, emp=${employeeId}, day=${day}, in=${clockIn}, out=${clockOut} (${tzInfo.code})`
  )

  return {
    employeeId,
    siteId,
    period,
    day,
    clockIn,
    clockOut,
    status,
    workMinutes,
    validationFlags,
  }
}

/**
 * Re-evaluates and syncs all attendance records for a site under its configured timezone.
 * Used when a site's timezone is switched (e.g. from WITA to WIB) to immediately
 * update all clock-in / clock-out times, day assignments, and timesheet records.
 */
export async function resyncSiteAttendanceToTimesheet(
  siteId: number,
  period?: string
): Promise<{ processedDays: number; syncedCount: number }> {
  await ensureSchedulingTimesheetTables()
  const siteTimezone = await getSiteTimezone(siteId)
  const tzInfo = normalizeIndonesiaTimezone(siteTimezone)

  const records = await db
    .select({
      employeeId: attendanceRecords.employeeId,
      eventTime: attendanceRecords.eventTime,
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.siteId, siteId))
    .orderBy(attendanceRecords.eventTime)

  if (records.length === 0) {
    return { processedDays: 0, syncedCount: 0 }
  }

  const processedKeys = new Set<string>()
  let syncedCount = 0

  for (const record of records) {
    const { period: recPeriod, day } = derivePeriodAndDayInTimezone(record.eventTime, tzInfo.code)
    if (period && recPeriod !== period) continue

    const key = `${record.employeeId}:${recPeriod}:${day}`
    if (processedKeys.has(key)) continue
    processedKeys.add(key)

    const res = await syncFaceAttendanceToTimesheet(
      record.employeeId,
      siteId,
      record.eventTime,
      tzInfo.code
    )
    if (res) syncedCount++
  }

  console.log(
    `[face-sync] Re-synced ${syncedCount} attendance day-records for site=${siteId} to timezone ${tzInfo.code}`
  )

  return {
    processedDays: processedKeys.size,
    syncedCount,
  }
}
