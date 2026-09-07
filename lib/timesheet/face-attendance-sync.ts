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
  inferTimezoneFromLocation,
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
 * Resolves the configured timezone code for a site from scheduling configs, sites table, or site name.
 */
export async function getSiteTimezone(siteId: number): Promise<string> {
  const [row] = await db
    .select({
      siteName: sites.name,
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

  return (
    row?.configTz ||
    row?.siteTz ||
    (fbConfig.timezone as string | undefined) ||
    inferTimezoneFromLocation(row?.siteName) ||
    'WITA'
  )
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

  const cleanIn = clockIn.replace(/\s*\(\+1d\)/gi, '').trim()
  const cleanOut = clockOut.replace(/\s*\(\+1d\)/gi, '').trim()

  const [inH, inM] = cleanIn.split(':').map(Number)
  const [outH, outM] = cleanOut.split(':').map(Number)

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
 * Correctly attributes morning checkouts (< 10:00) to yesterday's Night Shift (date of entry).
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

  const sortedRecords = [...records].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime())

  // Track punch IDs on Day T that are consumed as checkout for Day T-1's Night Shift
  const consumedPunchIds = new Set<number>()

  // 1. Check if yesterday (Day T-1) had a Night Shift that was waiting for today's early morning checkout
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

  // Find yesterday's night check-in punch (local hour >= 15 or < 05)
  const prevNightPunch = prevSorted.find((r) => {
    const h = getTimezoneDateParts(r.eventTime, tzInfo.code).hours
    return h >= 15 || h < 5
  })

  if (prevNightPunch) {
    // Check if yesterday had a same-evening checkout punch >= 2h after prevNightPunch
    const prevSameEveningOut = prevSorted.filter(
      (r) =>
        r.id !== prevNightPunch.id &&
        r.eventTime.getTime() - prevNightPunch.eventTime.getTime() >= 2 * 60 * 60 * 1000
    )

    if (prevSameEveningOut.length === 0) {
      // Look for today's early-morning punch (< 10:00 local time)
      const morningPunches = sortedRecords.filter(
        (r) => getTimezoneDateParts(r.eventTime, tzInfo.code).hours < 10
      )

      if (morningPunches.length > 0) {
        // Find the best morning checkout punch (prefer explicit check-out event, else latest morning punch)
        const explicitOut = morningPunches.filter((r) => isCheckOutEvent(r.eventType))
        const morningCheckout =
          explicitOut.length > 0
            ? explicitOut[explicitOut.length - 1]
            : morningPunches[morningPunches.length - 1]

        const prevClockIn = formatTimeHHMMInTimezone(prevNightPunch.eventTime, tzInfo.code)
        const prevClockOut = formatTimeHHMMInTimezone(morningCheckout.eventTime, tzInfo.code)
        const prevWorkMinutes = computeWorkMinutes(prevClockIn, prevClockOut)
        const { period: prevPeriod, day: prevDay } = derivePeriodAndDayInTimezone(
          previousDayDate,
          tzInfo.code
        )

        const prevNote = prevNightPunch.locationNote || ''

        // Upsert yesterday's completed night shift record
        await db
          .insert(timesheetAttendanceRealOverrides)
          .values({
            siteId,
            period: prevPeriod,
            employeeId,
            day: prevDay,
            status: 'present',
            clockIn: prevClockIn,
            clockOut: prevClockOut,
            note: prevNote,
            source: 'attendance',
            validationFlags: [],
            workMinutes: prevWorkMinutes,
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
              status: 'present',
              clockIn: prevClockIn,
              clockOut: prevClockOut,
              note: prevNote,
              source: 'attendance',
              validationFlags: [],
              workMinutes: prevWorkMinutes,
              updatedAt: new Date(),
            },
          })

        console.log(
          `[face-sync] ✓ Updated Prev Day Night Shift: site=${siteId}, period=${prevPeriod}, emp=${employeeId}, day=${prevDay}, in=${prevClockIn}, out=${prevClockOut}`
        )

        // Mark all morning punches up to the morning checkout as consumed by yesterday's shift
        for (const punch of morningPunches) {
          if (punch.eventTime.getTime() <= morningCheckout.eventTime.getTime()) {
            consumedPunchIds.add(punch.id)
          }
        }
      }
    }
  }

  // 2. Evaluate Today's (Day T) own shift punches (excluding any punches consumed by yesterday's night shift)
  const todayOwnPunches = sortedRecords.filter((r) => !consumedPunchIds.has(r.id))

  const { period, day } = derivePeriodAndDayInTimezone(eventDate, tzInfo.code)

  if (todayOwnPunches.length === 0) {
    // Today has no active shift punches of its own (all punches today were just yesterday's morning checkout)
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
    console.log(
      `[face-sync] ✓ Cleaned Today (all punches consumed by yesterday night shift): site=${siteId}, period=${period}, emp=${employeeId}, day=${day}`
    )
    return null
  }

  // 3. Process Today's own shift
  const firstPunch = todayOwnPunches[0]
  const firstPunchLocalHours = getTimezoneDateParts(firstPunch.eventTime, tzInfo.code).hours
  const clockIn = formatTimeHHMMInTimezone(firstPunch.eventTime, tzInfo.code)
  const isNightShift = firstPunchLocalHours >= 15 || firstPunchLocalHours < 5

  let clockOut = ''

  if (isNightShift) {
    // Overnight shift handling: look for checkout punches on next day 00:00 - 10:00 local time
    const nextDayCutoff = new Date(startOfNextDay.getTime() + 10 * 60 * 60 * 1000)
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
      const sortedOvernight = [...overnightRecords].sort(
        (a, b) => a.eventTime.getTime() - b.eventTime.getTime()
      )
      const explicitNextOut = sortedOvernight.filter((r) => isCheckOutEvent(r.eventType))
      const lastOvernight =
        explicitNextOut.length > 0
          ? explicitNextOut[explicitNextOut.length - 1]
          : sortedOvernight[sortedOvernight.length - 1]
      clockOut = formatTimeHHMMInTimezone(lastOvernight.eventTime, tzInfo.code)

      // Ensure Day T+1 override does not retain orphan attendance if it has no own shift punches (>= 10:00)
      const nextDayDate = new Date(startOfNextDay.getTime() + 12 * 60 * 60 * 1000)
      const nextBoundaries = getTimezoneDayBoundaries(nextDayDate, tzInfo.code)
      const nextDayFullRecords = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, employeeId),
            eq(attendanceRecords.siteId, siteId),
            gte(attendanceRecords.eventTime, nextBoundaries.startOfDay),
            lt(attendanceRecords.eventTime, nextBoundaries.startOfNextDay)
          )
        )
      const nextDayOwnPunches = nextDayFullRecords.filter(
        (r) => getTimezoneDateParts(r.eventTime, tzInfo.code).hours >= 10
      )
      const { period: nextPeriod, day: nextDay } = derivePeriodAndDayInTimezone(
        nextDayDate,
        tzInfo.code
      )
      if (nextDayOwnPunches.length === 0) {
        await db
          .delete(timesheetAttendanceRealOverrides)
          .where(
            and(
              eq(timesheetAttendanceRealOverrides.siteId, siteId),
              eq(timesheetAttendanceRealOverrides.period, nextPeriod),
              eq(timesheetAttendanceRealOverrides.employeeId, employeeId),
              eq(timesheetAttendanceRealOverrides.day, nextDay),
              eq(timesheetAttendanceRealOverrides.source, 'attendance')
            )
          )
      }
    } else {
      // Check same-evening punch at least 2 hours apart
      const sameDayPunches = todayOwnPunches.filter(
        (r) => r.eventTime.getTime() - firstPunch.eventTime.getTime() >= 2 * 60 * 60 * 1000
      )
      if (sameDayPunches.length > 0) {
        clockOut = formatTimeHHMMInTimezone(
          sameDayPunches[sameDayPunches.length - 1].eventTime,
          tzInfo.code
        )
      }
    }
  } else {
    // Day Shift handling
    const checkOutPunches = todayOwnPunches.filter(
      (r) =>
        isCheckOutEvent(r.eventType) ||
        r.eventTime.getTime() - firstPunch.eventTime.getTime() >= 2 * 60 * 60 * 1000
    )
    if (checkOutPunches.length > 0) {
      clockOut = formatTimeHHMMInTimezone(
        checkOutPunches[checkOutPunches.length - 1].eventTime,
        tzInfo.code
      )
    }
  }

  // Compute work minutes
  const workMinutes = computeWorkMinutes(clockIn, clockOut)

  // Set validation flags
  const validationFlags: string[] = []
  if (!clockOut) {
    validationFlags.push('missing-check-out')
  }

  // GPS flag propagation: scan locationNote for [gps-unavailable]
  for (const record of todayOwnPunches) {
    if (record.locationNote?.includes('[gps-unavailable]')) {
      if (!validationFlags.includes('gps-unavailable')) {
        validationFlags.push('gps-unavailable')
      }
      break
    }
  }

  const status = 'present'
  const syncNote = firstPunch.locationNote || ''

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
      note: syncNote,
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
        note: syncNote,
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
