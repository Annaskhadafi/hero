import { db } from '../db'
import { timesheetAttendanceRealOverrides } from '../db/schema/timesheet'
import { eq, and, sql } from 'drizzle-orm'

function computeWorkMinutes(clockIn: string, clockOut: string): number {
  const [inH, inM] = clockIn.split(':').map(Number)
  const [outH, outM] = clockOut.split(':').map(Number)
  let diff = outH * 60 + outM - (inH * 60 + inM)
  if (diff < 0) {
    diff += 1440 // overnight shift
  }
  return diff
}

async function run() {
  console.log('--- RECONCILING CROSS-DAY ATTENDANCE OVERRIDES ---')

  const allOverrides = await db
    .select()
    .from(timesheetAttendanceRealOverrides)
    .where(sql`source = 'attendance'`)

  // Group by employeeId and period
  const byEmpPeriod = new Map<string, typeof allOverrides>()
  for (const o of allOverrides) {
    const k = `${o.siteId}_${o.period}_${o.employeeId}`
    if (!byEmpPeriod.has(k)) byEmpPeriod.set(k, [])
    byEmpPeriod.get(k)!.push(o)
  }

  let reconciledCount = 0

  for (const [groupKey, list] of byEmpPeriod.entries()) {
    list.sort((a, b) => a.day - b.day)
    for (let i = 0; i < list.length; i++) {
      const cur = list[i]
      const next = list.find((item) => item.day === cur.day + 1)

      // Split scenario: Day d has check-in but no check-out, Day d+1 has check-out but no check-in
      if (cur.clockIn && !cur.clockOut && next && !next.clockIn && next.clockOut) {
        const [siteIdStr, period, employeeIdStr] = groupKey.split('_')
        const siteId = Number(siteIdStr)
        const employeeId = Number(employeeIdStr)

        const workMinutes = computeWorkMinutes(cur.clockIn, next.clockOut)
        const mergedFlags = Array.from(
          new Set([...(cur.validationFlags || []).filter((f) => f !== 'missing-check-out'), 'cross-day-checkout'])
        )
        const mergedNote = cur.note || next.note || 'Cross-Day Attendance Reconciled'

        // 1. Update Day d
        await db
          .update(timesheetAttendanceRealOverrides)
          .set({
            clockOut: next.clockOut,
            workMinutes,
            validationFlags: mergedFlags,
            note: mergedNote,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(timesheetAttendanceRealOverrides.siteId, siteId),
              eq(timesheetAttendanceRealOverrides.period, period),
              eq(timesheetAttendanceRealOverrides.employeeId, employeeId),
              eq(timesheetAttendanceRealOverrides.day, cur.day)
            )
          )

        // 2. Delete orphan Day d+1
        await db
          .delete(timesheetAttendanceRealOverrides)
          .where(
            and(
              eq(timesheetAttendanceRealOverrides.siteId, siteId),
              eq(timesheetAttendanceRealOverrides.period, period),
              eq(timesheetAttendanceRealOverrides.employeeId, employeeId),
              eq(timesheetAttendanceRealOverrides.day, next.day)
            )
          )

        console.log(
          `[reconcile] ✓ Reconciled Site ${siteId}, Period ${period}, Emp ${employeeId}: Day ${cur.day} (${cur.clockIn} -> ${next.clockOut}) [consumed Day ${next.day}]`
        )
        reconciledCount++
      }
    }
  }

  console.log(`--- DONE: Reconciled ${reconciledCount} split attendance records. ---`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
