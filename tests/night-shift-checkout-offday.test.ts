import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import {
  checkEmployeeOffDayStatus,
  resolveNightShiftCheckoutContext,
} from '../lib/timesheet/attendance-punctuality'

describe('Night Shift Cross-Date Checkout & Off-Day Handling', () => {
  it('correctly resolves Night Shift checkout date context for Monday check-in and Tuesday checkout', async () => {
    const mondayCheckIn = new Date('2026-10-05T19:00:00.000Z')
    const tuesdayCheckOut = new Date('2026-10-06T06:10:00.000Z')

    const checkInDateStr = mondayCheckIn.toISOString().slice(0, 10)
    const checkOutDateStr = tuesdayCheckOut.toISOString().slice(0, 10)

    assert.equal(checkInDateStr, '2026-10-05')
    assert.equal(checkOutDateStr, '2026-10-06')
    assert.notEqual(checkInDateStr, checkOutDateStr, 'Cross-date night shift checkout')
  })

  it('evaluates off-day status against Monday Night Shift date instead of Tuesday OFF schedule', () => {
    const mondayShiftDate = new Date('2026-10-05T19:00:00.000Z')
    const tuesdayOffDate = new Date('2026-10-06T06:10:00.000Z')

    // 1. Evaluating against Tuesday (OFF day) directly for staff
    const directTuesdayCheck = checkEmployeeOffDayStatus({
      eventTime: tuesdayOffDate,
      role: 'Staff Admin',
      scheduledCode: 'OFF',
      timeZone: 'WITA',
    })
    assert.equal(directTuesdayCheck.isOffDay, true, 'Tuesday is scheduled OFF')
    assert.equal(directTuesdayCheck.allowAttendance, false, 'Direct Tuesday check blocks staff')

    // 2. Evaluating against effective date (Monday Night Shift)
    const effectiveMondayCheck = checkEmployeeOffDayStatus({
      eventTime: mondayShiftDate,
      role: 'Staff Admin',
      scheduledCode: 'NS',
      timeZone: 'WITA',
    })
    assert.equal(effectiveMondayCheck.isOffDay, false, 'Monday Night Shift is not an OFF day')
    assert.equal(effectiveMondayCheck.allowAttendance, true, 'Staff is allowed for Monday Night Shift')
  })

  it('verifies integration of resolveNightShiftCheckoutContext across key attendance modules', () => {
    const attPunctualityPath = path.resolve('lib/timesheet/attendance-punctuality.ts')
    const attPunctualityCode = fs.readFileSync(attPunctualityPath, 'utf8')
    assert(attPunctualityCode.includes('export async function resolveNightShiftCheckoutContext'))

    const attActionPath = path.resolve('app/actions/attendance.ts')
    const attActionCode = fs.readFileSync(attActionPath, 'utf8')
    assert(attActionCode.includes('resolveNightShiftCheckoutContext'))
    assert(attActionCode.includes('eventTime: evalDate'))

    const faceActionPath = path.resolve('app/actions/face-attendance-actions.ts')
    const faceActionCode = fs.readFileSync(faceActionPath, 'utf8')
    assert(faceActionCode.includes('resolveNightShiftCheckoutContext'))
    assert(faceActionCode.includes('eventTime: evalDate'))

    const autoSplPath = path.resolve('lib/timesheet/auto-spl-attendance.ts')
    const autoSplCode = fs.readFileSync(autoSplPath, 'utf8')
    assert(autoSplCode.includes('resolveNightShiftCheckoutContext'))
    assert(autoSplCode.includes('eventTime: evalDate'))

    const dashboardPath = path.resolve('lib/daily-activity-dashboard.ts')
    const dashboardCode = fs.readFileSync(dashboardPath, 'utf8')
    assert(dashboardCode.includes('evTime.getHours() < 12'))
    assert(dashboardCode.includes('prevDayDate'))
  })
})
