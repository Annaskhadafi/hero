import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm'
import { db } from '@/db'
import {
  attendanceRecords,
  employees,
  notificationEvents,
  notificationPushSubscriptions,
  sites,
  timesheetSchedulingPlans,
  timesheetSchedulingPlansV2,
  timesheetFieldBreakPlans,
} from '@/db/schema/hero'
import {
  createNotificationEventForEmployee,
  sendPushNotification,
} from '@/lib/push-notifications'
import { getSiteAttendanceClockConfig } from '@/lib/timesheet/site-attendance-punctuality'
import { getTimezoneDateParts } from '@/lib/indonesia-timezone'
import { format, addMonths, getDaysInMonth } from 'date-fns'

export type AttendanceReminderTickResult = {
  success: boolean
  timestamp: string
  checkInRemindersSent: number
  checkOutRemindersSent: number
  skippedAlreadyAbsen: number
  skippedOffOrHoliday: number
  skippedNoSubscription: number
  errors: string[]
}

const OFF_OR_LEAVE_CODES = new Set([
  'OFF',
  'LIBUR',
  'L',
  'FB',
  'SAKIT',
  'S',
  'IZIN',
  'I',
  'CUTI',
  'C',
  'AL',
  'ALPHA',
  'A',
  'DISPENSASI',
])

function isHolidayOrOff(code?: string | null): boolean {
  if (!code) return false
  const upper = code.trim().toUpperCase()
  return OFF_OR_LEAVE_CODES.has(upper)
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((val) => Number(val) || 0)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export type ReminderAction =
  | { type: 'check-in'; scheduledTime: string; targetMinutes: number }
  | { type: 'check-out'; scheduledTime: string; targetMinutes: number }
  | { type: 'none'; reason: string }

export function resolveAttendanceReminderAction(input: {
  currentMinutes: number
  scheduledInMinutes: number
  scheduledOutMinutes: number
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  isHolidayOrOff: boolean
}): ReminderAction {
  if (input.isHolidayOrOff) {
    return { type: 'none', reason: 'holiday_or_off' }
  }

  // 1. Check-In Window: 10 minutes before shift in (tolerance: ±5 min)
  const targetIn = input.scheduledInMinutes - 10
  const diffIn = input.currentMinutes - targetIn
  if (diffIn >= -5 && diffIn <= 5) {
    if (input.hasCheckedIn) {
      return { type: 'none', reason: 'already_checked_in' }
    }
    return {
      type: 'check-in',
      scheduledTime: minutesToTime(input.scheduledInMinutes),
      targetMinutes: targetIn,
    }
  }

  // 2. Check-Out Window: 10 minutes after shift out (tolerance: ±5 min)
  const targetOut = input.scheduledOutMinutes + 10
  const diffOut = input.currentMinutes - targetOut
  if (diffOut >= -5 && diffOut <= 5) {
    if (!input.hasCheckedIn) {
      return { type: 'none', reason: 'not_checked_in_today' }
    }
    if (input.hasCheckedOut) {
      return { type: 'none', reason: 'already_checked_out' }
    }
    return {
      type: 'check-out',
      scheduledTime: minutesToTime(input.scheduledOutMinutes),
      targetMinutes: targetOut,
    }
  }

  return { type: 'none', reason: 'outside_window' }
}

export async function runAttendanceReminderTick(
  referenceDate = new Date()
): Promise<AttendanceReminderTickResult> {
  const result: AttendanceReminderTickResult = {
    success: true,
    timestamp: referenceDate.toISOString(),
    checkInRemindersSent: 0,
    checkOutRemindersSent: 0,
    skippedAlreadyAbsen: 0,
    skippedOffOrHoliday: 0,
    skippedNoSubscription: 0,
    errors: [],
  }

  try {
    // 1. Ambil seluruh subscription push yang aktif untuk mendapatkan daftar karyawan
    const activeSubscriptions = await db
      .select({
        employeeId: notificationPushSubscriptions.employeeId,
      })
      .from(notificationPushSubscriptions)
      .groupBy(notificationPushSubscriptions.employeeId)

    if (activeSubscriptions.length === 0) {
      return result
    }

    const employeeIdsWithPush = activeSubscriptions.map((s) => s.employeeId)

    // 2. Ambil data karyawan aktif yang memiliki push subscription
    const candidateEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeSn: employees.employeeSn,
        siteId: employees.siteId,
        isActive: employees.isActive,
      })
      .from(employees)
      .where(
        and(
          inArray(employees.id, employeeIdsWithPush),
          eq(employees.isActive, true)
        )
      )

    // Cache site configurations to avoid redundant DB queries per employee
    const siteConfigCache = new Map<number, Awaited<ReturnType<typeof getSiteAttendanceClockConfig>>>()

    for (const emp of candidateEmployees) {
      try {
        const siteId = emp.siteId || 1
        let siteConfig = siteConfigCache.get(siteId)
        if (!siteConfig) {
          siteConfig = await getSiteAttendanceClockConfig(siteId).catch(() => ({
            dayShiftClockIn: '08:00',
            nightShiftClockIn: '18:00',
            staffDayShiftClockOut: '17:00',
            staffNightShiftClockOut: '06:00',
            timezone: 'WITA' as const,
            scheduleType: 'office',
            rosterType: '5:2',
          }))
          siteConfigCache.set(siteId, siteConfig)
        }

        const timezone = siteConfig.timezone || 'WITA'
        const localTime = getTimezoneDateParts(referenceDate, timezone)
        const todayStr = `${localTime.year}-${String(localTime.month).padStart(2, '0')}-${String(localTime.day).padStart(2, '0')}`
        const currentMinutes = localTime.hours * 60 + localTime.minutes

        // Resolve today's roster code
        const period = todayStr.slice(0, 7)
        const [v2Plan, legacyPlan, fbPlans] = await Promise.all([
          db
            .select({
              status: timesheetSchedulingPlansV2.status,
              activeSchedule: timesheetSchedulingPlansV2.activeSchedule,
            })
            .from(timesheetSchedulingPlansV2)
            .where(
              and(
                eq(timesheetSchedulingPlansV2.siteId, siteId),
                eq(timesheetSchedulingPlansV2.period, period)
              )
            )
            .limit(1)
            .catch(() => []),
          db
            .select({
              fixedSchedule: timesheetSchedulingPlans.fixedSchedule,
            })
            .from(timesheetSchedulingPlans)
            .where(
              and(
                eq(timesheetSchedulingPlans.siteId, siteId),
                eq(timesheetSchedulingPlans.period, period)
              )
            )
            .limit(1)
            .catch(() => []),
          db
            .select({
              fieldBreakDate: timesheetFieldBreakPlans.fieldBreakDate,
              fieldBreakEndDate: timesheetFieldBreakPlans.fieldBreakEndDate,
            })
            .from(timesheetFieldBreakPlans)
            .where(
              and(
                eq(timesheetFieldBreakPlans.siteId, siteId),
                eq(timesheetFieldBreakPlans.employeeId, emp.id)
              )
            )
            .catch(() => []),
        ])

        const isFieldBreak = fbPlans.some((fb) => {
          const start = String(fb.fieldBreakDate)
          const end = String(fb.fieldBreakEndDate || fb.fieldBreakDate)
          return todayStr >= start && todayStr <= end
        })

        if (isFieldBreak) {
          result.skippedOffOrHoliday += 1
          continue
        }

        const activeScheduleList =
          v2Plan[0]?.status === 'active'
            ? (v2Plan[0].activeSchedule as Array<{ employeeId: number; schedule: string[] }>)
            : []
        const legacyScheduleList = (legacyPlan[0]?.fixedSchedule as Array<{ employeeId: number; schedule: string[] }>) || []

        const empScheduleRow =
          activeScheduleList.find((item) => item.employeeId === emp.id) ??
          legacyScheduleList.find((item) => item.employeeId === emp.id)

        const dayIndex = localTime.day - 1
        const rawCode = empScheduleRow?.schedule?.[dayIndex]?.trim().toUpperCase() || 'IN'

        if (isHolidayOrOff(rawCode)) {
          result.skippedOffOrHoliday += 1
          continue
        }

        // Determine scheduled clock times
        const isNight = rawCode.includes('NIGHT') || rawCode === 'NS' || rawCode === 'MALAM'
        const scheduledInStr = isNight
          ? siteConfig.nightShiftClockIn || '18:00'
          : siteConfig.dayShiftClockIn || '08:00'
        const scheduledOutStr = isNight
          ? siteConfig.staffNightShiftClockOut || '06:00'
          : siteConfig.staffDayShiftClockOut || '17:00'

        const scheduledInMinutes = timeToMinutes(scheduledInStr)
        const scheduledOutMinutes = timeToMinutes(scheduledOutStr)

        // Query today's attendance logs for this employee
        const dayStart = new Date(Date.UTC(localTime.year, localTime.month - 1, localTime.day, 0, 0, 0))
        const dayEnd = new Date(Date.UTC(localTime.year, localTime.month - 1, localTime.day, 23, 59, 59))

        const todayLogs = await db
          .select({
            eventType: attendanceRecords.eventType,
            eventTime: attendanceRecords.eventTime,
          })
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeId, emp.id),
              gte(attendanceRecords.eventTime, dayStart),
              lte(attendanceRecords.eventTime, dayEnd)
            )
          )
          .catch(() => [])

        const hasCheckedIn = todayLogs.some((l) => l.eventType === 'checked-in')
        const hasCheckedOut = todayLogs.some((l) => l.eventType === 'checked-out')

        // ─── 1. PENGINGAT ABSEN MASUK (10 MENIT SEBELUM JAM MASUK) ───
        // Target: scheduledInMinutes - 10
        // Window aktif: 15 menit s/d 5 menit sebelum jam masuk (selisih ±5 menit)
        const targetInMinutes = scheduledInMinutes - 10
        const inWindowDiff = currentMinutes - targetInMinutes
        const isInCheckInWindow = inWindowDiff >= -5 && inWindowDiff <= 5

        if (isInCheckInWindow) {
          if (hasCheckedIn) {
            result.skippedAlreadyAbsen += 1
          } else {
            const eventTag = `att_rem_in_${emp.id}_${todayStr}`
            const existingNotification = await db
              .select({ id: notificationEvents.id })
              .from(notificationEvents)
              .where(eq(notificationEvents.eventType, eventTag))
              .limit(1)

            if (existingNotification.length === 0) {
              const eventTitle = '🐾 Meooow! Waktunya Absen Masuk'
              const eventBody = `Halo ${emp.name}, 10 menit lagi jam masuk shift (${scheduledInStr}). Yuk segera Check In di HERO! Meow~ 🐱`

              const event = await createNotificationEventForEmployee({
                employeeId: emp.id,
                eventType: eventTag,
                category: 'shift_reminders',
                title: eventTitle,
                body: eventBody,
                url: '/mobile/attendance',
              })

              await sendPushNotification({
                employeeId: emp.id,
                category: 'shift_reminders',
                title: eventTitle,
                body: eventBody,
                url: '/mobile/attendance',
                sound: '/sounds/cat-meow.mp3',
                vibrate: [100, 50, 100, 50, 200],
                tag: eventTag,
                notificationEventId: event?.id,
              })

              result.checkInRemindersSent += 1
            }
          }
        }

        // ─── 2. PENGINGAT ABSEN PULANG (10 MENIT SETELAH JAM PULANG) ───
        // Target: scheduledOutMinutes + 10
        // Window aktif: 5 menit s/d 15 menit setelah jam pulang (selisih ±5 menit)
        const targetOutMinutes = scheduledOutMinutes + 10
        const outWindowDiff = currentMinutes - targetOutMinutes
        const isInCheckOutWindow = outWindowDiff >= -5 && outWindowDiff <= 5

        if (isInCheckOutWindow) {
          if (!hasCheckedIn) {
            // Belum pernah check in hari ini, tidak perlu diingatkan check out
          } else if (hasCheckedOut) {
            result.skippedAlreadyAbsen += 1
          } else {
            const eventTag = `att_rem_out_${emp.id}_${todayStr}`
            const existingNotification = await db
              .select({ id: notificationEvents.id })
              .from(notificationEvents)
              .where(eq(notificationEvents.eventType, eventTag))
              .limit(1)

            if (existingNotification.length === 0) {
              const eventTitle = '🐾 Meooow! Waktunya Check Out'
              const eventBody = `Halo ${emp.name}, jam kerja Anda sudah selesai 10 menit lalu (${scheduledOutStr}). Jangan lupa Check Out di HERO ya! Meow~ 🐱`

              const event = await createNotificationEventForEmployee({
                employeeId: emp.id,
                eventType: eventTag,
                category: 'shift_reminders',
                title: eventTitle,
                body: eventBody,
                url: '/mobile/attendance',
              })

              await sendPushNotification({
                employeeId: emp.id,
                category: 'shift_reminders',
                title: eventTitle,
                body: eventBody,
                url: '/mobile/attendance',
                sound: '/sounds/cat-meow.mp3',
                vibrate: [100, 50, 100, 50, 200],
                tag: eventTag,
                notificationEventId: event?.id,
              })

              result.checkOutRemindersSent += 1
            }
          }
        }
      } catch (empErr: any) {
        result.errors.push(`Employee ${emp.id}: ${empErr?.message || String(empErr)}`)
      }
    }
  } catch (err: any) {
    result.success = false
    result.errors.push(err?.message || String(err))
  }

  return result
}
