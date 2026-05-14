import { db } from '@/db'
import { attendanceRecords } from '@/db/schema/hero'
import { timesheetAttendanceRealOverrides } from '@/db/schema/timesheet'
import { and, eq, gte, lt } from 'drizzle-orm'

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
 * Extracts YYYY-MM period and day number from a Date.
 */
export function derivePeriodAndDay(eventTime: Date): { period: string; day: number } {
  const year = eventTime.getFullYear()
  const month = String(eventTime.getMonth() + 1).padStart(2, '0')
  const period = `${year}-${month}`
  const day = eventTime.getDate()
  return { period, day }
}

/**
 * Formats a Date to HH:mm (24-hour).
 */
export function formatTimeHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
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
  // Compute date range: start of day to start of next day
  const startOfDay = new Date(eventDate)
  startOfDay.setHours(0, 0, 0, 0)

  const startOfNextDay = new Date(startOfDay)
  startOfNextDay.setDate(startOfNextDay.getDate() + 1)

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

  // Partition into check-ins and check-outs
  const checkIns = records.filter((r) => !isCheckOutEvent(r.eventType))
  const checkOuts = records.filter((r) => isCheckOutEvent(r.eventType))

  // Compute earliest check-in
  let clockIn = ''
  if (checkIns.length > 0) {
    const earliest = checkIns.reduce((min, r) => (r.eventTime < min.eventTime ? r : min))
    clockIn = formatTimeHHMM(earliest.eventTime)
  }

  // Compute latest check-out (same day)
  let clockOut = ''
  if (checkOuts.length > 0) {
    const latest = checkOuts.reduce((max, r) => (r.eventTime > max.eventTime ? r : max))
    clockOut = formatTimeHHMM(latest.eventTime)
  }

  // Overnight shift handling: if no check-out today, look at next day 00:00-06:00
  if (checkIns.length > 0 && checkOuts.length === 0) {
    const nextDayCutoff = new Date(startOfNextDay)
    nextDayCutoff.setHours(6, 0, 0, 0)

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

    const overnightCheckOuts = overnightRecords.filter((r) => isCheckOutEvent(r.eventType))
    if (overnightCheckOuts.length > 0) {
      const latest = overnightCheckOuts.reduce((max, r) => (r.eventTime > max.eventTime ? r : max))
      clockOut = formatTimeHHMM(latest.eventTime)
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
