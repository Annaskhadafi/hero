import { db } from '@/db'
import {
  timesheetAttendanceRealOverrides,
  timesheetSchedulingPlans,
  timesheetSchedulingPlansV2,
} from '@/db/schema/timesheet'
import { employees, sites } from '@/db/schema/hero'
import { and, eq, ne } from 'drizzle-orm'
import { isNightShiftScheduleCode } from '@/lib/timesheet/attendance-punctuality'
import { computeWorkMinutes } from '@/lib/timesheet/face-attendance-sync'

async function getScheduleMap(siteId: number, period: string) {
  const map = new Map<number, string[]>()

  // V2
  const v2Plans = await db
    .select({
      status: timesheetSchedulingPlansV2.status,
      activeSchedule: timesheetSchedulingPlansV2.activeSchedule,
      draftSchedule: timesheetSchedulingPlansV2.draftSchedule,
    })
    .from(timesheetSchedulingPlansV2)
    .where(
      and(
        eq(timesheetSchedulingPlansV2.siteId, siteId),
        eq(timesheetSchedulingPlansV2.period, period)
      )
    )

  for (const plan of v2Plans) {
    const list =
      plan.status === 'active' && plan.activeSchedule && plan.activeSchedule.length > 0
        ? plan.activeSchedule
        : plan.draftSchedule || []
    for (const row of list) {
      if (!map.has(row.employeeId)) {
        map.set(row.employeeId, row.schedule)
      }
    }
  }

  // V1
  const v1Plans = await db
    .select({
      fixedSchedule: timesheetSchedulingPlans.fixedSchedule,
      draftSchedule: timesheetSchedulingPlans.draftSchedule,
    })
    .from(timesheetSchedulingPlans)
    .where(
      and(
        eq(timesheetSchedulingPlans.siteId, siteId),
        eq(timesheetSchedulingPlans.period, period)
      )
    )

  for (const plan of v1Plans) {
    const list =
      plan.fixedSchedule && plan.fixedSchedule.length > 0
        ? plan.fixedSchedule
        : plan.draftSchedule || []
    for (const row of list) {
      if (!map.has(row.employeeId)) {
        map.set(row.employeeId, row.schedule)
      }
    }
  }

  return map
}

export async function cleanNightShiftOffDayOverrides() {
  console.log('--- Cleaning orphan Night Shift checkouts on OFF days ---')

  // Find all attendance overrides where clockIn is empty and clockOut exists and source is attendance
  const candidateOverrides = await db
    .select()
    .from(timesheetAttendanceRealOverrides)
    .where(
      and(
        eq(timesheetAttendanceRealOverrides.clockIn, ''),
        ne(timesheetAttendanceRealOverrides.clockOut, ''),
        eq(timesheetAttendanceRealOverrides.source, 'attendance')
      )
    )

  console.log(`Found ${candidateOverrides.length} candidate orphan checkouts to inspect.`)

  let cleanedCount = 0
  let pairedCount = 0

  // Cache schedules by `${siteId}:${period}`
  const schedulesCache = new Map<string, Map<number, string[]>>()

  for (const override of candidateOverrides) {
    // Only check morning checkouts (< 12:00)
    const outParts = override.clockOut.split(':')
    const outHour = Number(outParts[0])
    if (isNaN(outHour) || outHour >= 12) continue

    const cacheKey = `${override.siteId}:${override.period}`
    let scheduleMap = schedulesCache.get(cacheKey)
    if (!scheduleMap) {
      scheduleMap = await getScheduleMap(override.siteId, override.period)
      schedulesCache.set(cacheKey, scheduleMap)
    }

    const empSchedule = scheduleMap.get(override.employeeId)
    const curDaySchedule = empSchedule ? empSchedule[override.day - 1] : null
    const isOffDay = ['OFF', 'LIBUR', 'FB', 'SAKIT', 'AL'].includes(
      (curDaySchedule || '').trim().toUpperCase()
    )

    if (override.day <= 1) {
      // Day 1: cannot pair with previous day in this month
      if (isOffDay) {
        await db
          .delete(timesheetAttendanceRealOverrides)
          .where(eq(timesheetAttendanceRealOverrides.id, override.id))
        cleanedCount++
      }
      continue
    }

    const prevDaySchedule = empSchedule ? empSchedule[override.day - 2] : null
    const prevIsNightSchedule = isNightShiftScheduleCode(prevDaySchedule)

    // Check yesterday's override in DB
    const [prevOverride] = await db
      .select()
      .from(timesheetAttendanceRealOverrides)
      .where(
        and(
          eq(timesheetAttendanceRealOverrides.siteId, override.siteId),
          eq(timesheetAttendanceRealOverrides.period, override.period),
          eq(timesheetAttendanceRealOverrides.employeeId, override.employeeId),
          eq(timesheetAttendanceRealOverrides.day, override.day - 1)
        )
      )

    const prevHasNightIn =
      prevOverride && prevOverride.clockIn && prevOverride.clockIn >= '15:00'

    if (prevIsNightSchedule || prevHasNightIn) {
      // 1. If yesterday's override has no clockOut, assign this checkout to yesterday
      if (prevOverride && !prevOverride.clockOut) {
        const workMinutes = computeWorkMinutes(prevOverride.clockIn, override.clockOut)
        const flags = Array.isArray(prevOverride.validationFlags)
          ? [...prevOverride.validationFlags]
          : []
        if (!flags.includes('cross-day-checkout')) flags.push('cross-day-checkout')

        await db
          .update(timesheetAttendanceRealOverrides)
          .set({
            clockOut: override.clockOut,
            workMinutes,
            validationFlags: flags,
            updatedAt: new Date(),
          })
          .where(eq(timesheetAttendanceRealOverrides.id, prevOverride.id))
        pairedCount++
      } else if (prevOverride) {
        const flags = Array.isArray(prevOverride.validationFlags)
          ? [...prevOverride.validationFlags]
          : []
        if (!flags.includes('cross-day-checkout')) {
          flags.push('cross-day-checkout')
          await db
            .update(timesheetAttendanceRealOverrides)
            .set({ validationFlags: flags, updatedAt: new Date() })
            .where(eq(timesheetAttendanceRealOverrides.id, prevOverride.id))
        }
      }

      // 2. Delete the orphan checkout on the OFF day
      if (isOffDay || !curDaySchedule) {
        await db
          .delete(timesheetAttendanceRealOverrides)
          .where(eq(timesheetAttendanceRealOverrides.id, override.id))
        cleanedCount++
        console.log(
          `[clean] Removed orphan checkout from Day ${override.day} (OFF day) for emp=${override.employeeId}, site=${override.siteId}, period=${override.period}, time=${override.clockOut}`
        )
      }
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Paired to previous night shift: ${pairedCount}`)
  console.log(`Cleaned orphan OFF day overrides: ${cleanedCount}`)
}

if (process.argv[1]?.includes('clean-night-shift-off-day-overrides')) {
  cleanNightShiftOffDayOverrides()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
