import { db } from '@/db'
import { attendanceRecords, sites } from '@/db/schema/hero'
import { timesheetAttendanceRealOverrides, timesheetSchedulingConfigs } from '@/db/schema/timesheet'
import { and, eq, gte, lt, ne } from 'drizzle-orm'
import { ensureSchedulingTimesheetTables } from '@/lib/timesheet/scheduling-infrastructure'
import { getSiteAttendanceClockConfig } from '@/lib/timesheet/site-attendance-punctuality'
import { selectAttendancePunches } from '@/lib/timesheet/attendance-selection'
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

export function wibDayBoundaries(
  date: Date,
  timezone = 'WIB'
): { startOfDay: Date; startOfNextDay: Date } {
  return getTimezoneDayBoundaries(date, timezone)
}

export function derivePeriodAndDay(
  eventTime: Date,
  timezone = 'WIB'
): { period: string; day: number } {
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

  const [siteRow] = await db
    .select({
      id: sites.id,
      geoLatitude: sites.geoLatitude,
      geoLongitude: sites.geoLongitude,
      geoRadiusMeters: sites.geoRadiusMeters,
    })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1)

  if (!siteRow) {
    console.warn(`[face-sync] Site ${siteId} does not exist in hero_sites. Skipping timesheet sync.`)
    return null
  }

  const siteTimezone = explicitTimezone || (await getSiteTimezone(siteId))
  const tzInfo = normalizeIndonesiaTimezone(siteTimezone)
  const siteClockConfig = await getSiteAttendanceClockConfig(siteId)

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
  const previousDayDate = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000)
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

  // Find yesterday's night check-in punch (MUST be a check-in event, local hour >= 15 or < 05)
  const prevCheckInPunches = prevSorted.filter((r) => !isCheckOutEvent(r.eventType))
  const prevNightCandidates = prevCheckInPunches.filter((r) => {
    const h = getTimezoneDateParts(r.eventTime, tzInfo.code).hours
    return h >= 15 || h < 5
  })
  const prevNightPunch = selectAttendancePunches(prevNightCandidates, {
    site: siteRow,
    scheduledClockIn: siteClockConfig.nightShiftClockIn,
    timeZone: tzInfo.iana,
  }).checkIn

  // Only proceed if yesterday did NOT have an earlier day-shift check-in (h between 5 and 15)
  const prevHasDayShiftIn = prevCheckInPunches.some((r) => {
    const h = getTimezoneDateParts(r.eventTime, tzInfo.code).hours
    return h >= 5 && h < 15
  })

  if (prevNightPunch && !prevHasDayShiftIn) {
    // Check if yesterday had a same-evening checkout punch >= 2h after prevNightPunch
    const prevSameEveningOut = prevSorted.filter(
      (r) =>
        isCheckOutEvent(r.eventType) &&
        r.id !== prevNightPunch.id &&
        r.eventTime.getTime() - prevNightPunch.eventTime.getTime() >= 2 * 60 * 60 * 1000
    )

    if (prevSameEveningOut.length === 0) {
      // Look for today's early-morning EXPLICIT checkout punches (< 10:00 local time)
      const morningCheckoutPunches = sortedRecords.filter(
        (r) => isCheckOutEvent(r.eventType) && getTimezoneDateParts(r.eventTime, tzInfo.code).hours < 10
      )

      if (morningCheckoutPunches.length > 0) {
        const morningCheckout = selectAttendancePunches(morningCheckoutPunches, {
          site: siteRow,
          timeZone: tzInfo.iana,
        }).checkOut!

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
            where: ne(timesheetAttendanceRealOverrides.source, 'manual'),
          })

        console.log(
          `[face-sync] ✓ Updated Prev Day Night Shift: site=${siteId}, period=${prevPeriod}, emp=${employeeId}, day=${prevDay}, in=${prevClockIn}, out=${prevClockOut}`
        )

        // Mark only the morning checkout punches as consumed by yesterday's shift
        for (const punch of morningCheckoutPunches) {
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
  const checkInPunches = todayOwnPunches.filter((r) => !isCheckOutEvent(r.eventType))
  const checkOutPunches = todayOwnPunches.filter((r) => isCheckOutEvent(r.eventType))

  let clockIn = ''
  let isNightShift = false
  let syncNote = todayOwnPunches[0].locationNote || ''

  if (checkInPunches.length > 0) {
    const dayCandidates = checkInPunches.filter((record) => {
      const hour = getTimezoneDateParts(record.eventTime, tzInfo.code).hours
      return hour >= 5 && hour < 15
    })
    const nightCandidates = checkInPunches.filter((record) => !dayCandidates.includes(record))
    const shiftCandidates = dayCandidates.length > 0 ? dayCandidates : nightCandidates
    const selectedCheckIn = selectAttendancePunches(shiftCandidates, {
      site: siteRow,
      scheduledClockIn:
        dayCandidates.length > 0
          ? siteClockConfig.dayShiftClockIn
          : siteClockConfig.nightShiftClockIn,
      timeZone: tzInfo.iana,
    }).checkIn
    if (selectedCheckIn) {
      const selectedCheckInHours = getTimezoneDateParts(selectedCheckIn.eventTime, tzInfo.code).hours
      clockIn = formatTimeHHMMInTimezone(selectedCheckIn.eventTime, tzInfo.code)
      isNightShift = selectedCheckInHours >= 15 || selectedCheckInHours < 5
      syncNote = selectedCheckIn.locationNote || syncNote
    }
  }

  let clockOut = ''

  if (isNightShift && checkInPunches.length > 0) {
    // Overnight shift handling: look for explicit checkout punches on next day 00:00 - 10:00 local time
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

    const explicitNextOut = overnightRecords.filter((r) => isCheckOutEvent(r.eventType))

    if (explicitNextOut.length > 0) {
      const lastOvernight = selectAttendancePunches(explicitNextOut, {
        site: siteRow,
        timeZone: tzInfo.iana,
      }).checkOut!
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
        (r) => !isCheckOutEvent(r.eventType) || getTimezoneDateParts(r.eventTime, tzInfo.code).hours >= 10
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
      // Only an explicit checkout closes the shift on same evening
      if (checkOutPunches.length > 0) {
        const selectedCheckOut = selectAttendancePunches(checkOutPunches, {
          site: siteRow,
          timeZone: tzInfo.iana,
        }).checkOut
        if (selectedCheckOut) clockOut = formatTimeHHMMInTimezone(selectedCheckOut.eventTime, tzInfo.code)
      }
    }
  } else {
    // Day Shift (or missing check-in where only check-outs exist)
    if (checkOutPunches.length > 0) {
      const selectedCheckOut = selectAttendancePunches(checkOutPunches, {
        site: siteRow,
        timeZone: tzInfo.iana,
      }).checkOut
      if (selectedCheckOut) clockOut = formatTimeHHMMInTimezone(selectedCheckOut.eventTime, tzInfo.code)
    }
  }

  // Compute work minutes
  const workMinutes = computeWorkMinutes(clockIn, clockOut)

  // Set validation flags
  const validationFlags: string[] = []
  if (!clockIn) {
    validationFlags.push('missing-check-in')
  }
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
      where: ne(timesheetAttendanceRealOverrides.source, 'manual'),
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
