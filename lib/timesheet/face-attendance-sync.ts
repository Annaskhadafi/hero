import { db } from '@/db'
import { attendanceRecords } from '@/db/schema/hero'
import { timesheetAttendanceRealOverrides } from '@/db/schema/timesheet'
import { and, eq, gte, lt } from 'drizzle-orm'
import { ensureSchedulingTimesheetTables } from '@/lib/timesheet/scheduling-infrastructure'

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

const WIB = 'Asia/Jakarta' // UTC+8

/**
 * Returns { year, month (1-based), day, hours, minutes } in WIB (UTC+8).
 */
function wibParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: WIB,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = fmt.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hours: get('hour'),
    minutes: get('minute'),
  }
}

/**
 * Returns [startOfDayWIB, startOfNextDayWIB] as UTC Date objects,
 * so DB queries for "today in WIB" are correct regardless of server TZ.
 */
function wibDayBoundaries(date: Date): { startOfDay: Date; startOfNextDay: Date } {
  const { year, month, day } = wibParts(date)
  // Construct WIB midnight as UTC: WIB midnight = UTC midnight - 8h
  const pad = (n: number) => String(n).padStart(2, '0')
  const startOfDay = new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00+08:00`)
  const startOfNextDay = new Date(startOfDay)
  startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1)
  return { startOfDay, startOfNextDay }
}


/**
 * Extracts YYYY-MM period and day number from a Date, in WIB (UTC+8).
 */
export function derivePeriodAndDay(eventTime: Date): { period: string; day: number } {
  const { year, month, day } = wibParts(eventTime)
  const period = `${year}-${String(month).padStart(2, '0')}`
  return { period, day }
}

/**
 * Formats a Date to HH:mm (24-hour) in WIB (UTC+8).
 */
export function formatTimeHHMM(date: Date): string {
  const { hours, minutes } = wibParts(date)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
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
 */
export async function syncFaceAttendanceToTimesheet(
  employeeId: number,
  siteId: number,
  eventDate: Date
): Promise<SyncResult | null> {
  // Ensure timesheet tables exist
  await ensureSchedulingTimesheetTables()

  console.log(
    `[face-sync] Syncing attendance: employee=${employeeId}, site=${siteId}, date=${eventDate.toISOString()}`
  )

  // Compute WIB day boundaries for DB query (eventDate is stored as UTC in DB)
  const { startOfDay, startOfNextDay } = wibDayBoundaries(eventDate)

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

  // Partition into check-ins and check-outs
  const checkIns = records.filter((r) => !isCheckOutEvent(r.eventType))
  const checkOuts = records.filter((r) => isCheckOutEvent(r.eventType))

  // Timesheet attendance uses earliest punch as clock-in and latest valid punch as clock-out.
  const firstPunch = sortedRecords[0]
  const clockIn = firstPunch ? formatTimeHHMM(firstPunch.eventTime) : ''

  // Determine if this punch is a Night Shift candidate (e.g. evening start >= 15:00 or early morning < 05:00)
  const firstPunchWibHours = firstPunch ? wibParts(firstPunch.eventTime).hours : 0
  const isNightShift = firstPunchWibHours >= 15 || firstPunchWibHours < 5

  let clockOut = ''

  // 1. Explicit check-out events on the same day
  if (checkOuts.length > 0) {
    const latestCheckOut = [...checkOuts].sort((a, b) => b.eventTime.getTime() - a.eventTime.getTime())[0]
    clockOut = formatTimeHHMM(latestCheckOut.eventTime)
  }
  // 2. Same-day punches at least 2 hours apart (for Day Shifts)
  else if (!isNightShift) {
    const punchesLater = sortedRecords.filter(
      (r) => r.eventTime.getTime() - firstPunch.eventTime.getTime() >= 2 * 60 * 60 * 1000
    )
    if (punchesLater.length > 0) {
      clockOut = formatTimeHHMM(punchesLater[punchesLater.length - 1].eventTime)
    }
  }

  // 3. Overnight shift handling for Night Shift: look for punches on next day 00:00 - 09:00 WIB
  if (isNightShift || (!clockOut && checkIns.length > 0)) {
    // 09:00 WIB next day = startOfNextDay + 9h
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
      clockOut = `${formatTimeHHMM(lastOvernight.eventTime)} (+1d)`
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

  // Derive period and day
  const { period, day } = derivePeriodAndDay(eventDate)

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
    `[face-sync] ✓ Upserted: site=${siteId}, period=${period}, emp=${employeeId}, day=${day}, in=${clockIn}, out=${clockOut}`
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
