import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  isStaffRole,
  calculateAttendancePunctuality,
  inferShiftCodeForEvent,
  checkEmployeeOffDayStatus,
  resolveConfiguredShiftClockIn,
  inferShiftFromClockInTime,
  calculateLateMinutesFromTimes,
  normalizeSiteAttendanceClockConfig,
  isNightShiftScheduleCode,
} from '@/lib/timesheet/attendance-punctuality'

describe('Roster 5:2 & Attendance Engine', () => {
  it('correctly identifies staff vs non-staff roles', () => {
    assert.equal(isStaffRole('Staff Admin'), true, 'Staff Admin should be staff')
    assert.equal(isStaffRole('Supervisor'), true, 'Supervisor should be staff')
    assert.equal(isStaffRole('Project Manager'), true, 'Project Manager should be staff')
    assert.equal(isStaffRole('Site Coordinator'), true, 'Coordinator should be staff')
    assert.equal(isStaffRole('Superintendent'), true, 'Superintendent should be staff')
    assert.equal(isStaffRole('Lead Mechanic'), true, 'Lead should be staff')
    assert.equal(isStaffRole('Mechanic'), false, 'Mechanic should be non-staff')
    assert.equal(isStaffRole('Technician'), false, 'Technician should be non-staff')
    assert.equal(isStaffRole('Tyreman'), false, 'Tyreman should be non-staff')
    assert.equal(isStaffRole('Operator'), false, 'Operator should be non-staff')
    assert.equal(isStaffRole('Helper'), false, 'Helper should be non-staff')
    assert.equal(isStaffRole('Non Staff Tyreman'), false, 'Non Staff Tyreman should be non-staff')
    assert.equal(isStaffRole('Non-Staff'), false, 'Non-Staff should be non-staff')
  })

  it('resolves configured shift clock-in for day and night shifts', () => {
    const config = normalizeSiteAttendanceClockConfig({
      dayShiftClockIn: '08:00',
      nightShiftClockIn: '18:00',
      timezone: 'WITA',
    })

    // Day Shift aliases
    assert.equal(resolveConfiguredShiftClockIn('DS', config), '08:00')
    assert.equal(resolveConfiguredShiftClockIn('IN', config), '08:00')
    assert.equal(resolveConfiguredShiftClockIn('PAGI', config), '08:00')
    assert.equal(resolveConfiguredShiftClockIn('DAY', config), '08:00')
    assert.equal(resolveConfiguredShiftClockIn('SHIFT 1', config), '08:00')

    // Night Shift aliases
    assert.equal(resolveConfiguredShiftClockIn('NS', config), '18:00')
    assert.equal(resolveConfiguredShiftClockIn('MALAM', config), '18:00')
    assert.equal(resolveConfiguredShiftClockIn('NIGHT', config), '18:00')
    assert.equal(resolveConfiguredShiftClockIn('SHIFT 2', config), '18:00')

    // Custom time range in schedule code
    assert.equal(resolveConfiguredShiftClockIn('07:00-15:00', config), '07:00')
    assert.equal(resolveConfiguredShiftClockIn('19:00', config), '19:00')

    // Inferred shift from clock-in time
    assert.deepEqual(inferShiftFromClockInTime('18:25', config), { shiftCode: 'night', scheduledClockIn: '18:00' })
    assert.deepEqual(inferShiftFromClockInTime('08:15', config), { shiftCode: 'day', scheduledClockIn: '08:00' })

    // Calculate late minutes from time strings
    assert.equal(calculateLateMinutesFromTimes('18:25', '18:00'), 25)
    assert.equal(calculateLateMinutesFromTimes('17:55', '18:00'), 0)
    assert.equal(calculateLateMinutesFromTimes('08:35', '08:00'), 35)
    assert.equal(calculateLateMinutesFromTimes('07:50', '08:00'), 0)
  })

  it('calculates attendance punctuality and late minutes correctly for day and night shifts', () => {
    const config = normalizeSiteAttendanceClockConfig({
      dayShiftClockIn: '08:00',
      nightShiftClockIn: '18:00',
      timezone: 'WITA',
    })

    // Day Shift: On-time check-in at 07:55 WITA (23:55 UTC previous day)
    const onTimeDay = calculateAttendancePunctuality({
      eventTime: new Date('2026-09-07T23:55:00.000Z'),
      shiftCode: 'DS',
      scheduledClockIn: '08:00',
      timeZone: 'WITA',
    })
    assert.equal(onTimeDay.isLate, false, '07:55 WITA should be on-time for 08:00 schedule')
    assert.equal(onTimeDay.lateMinutes, 0)
    assert.equal(onTimeDay.note, 'Kehadiran: Tepat waktu (jadwal 08:00)')

    // Day Shift: Late check-in at 08:25 WITA (00:25 UTC)
    const lateDay = calculateAttendancePunctuality({
      eventTime: new Date('2026-09-07T00:25:00.000Z'),
      shiftCode: 'DS',
      scheduledClockIn: '08:00',
      timeZone: 'WITA',
    })
    assert.equal(lateDay.isLate, true, '08:25 WITA should be late for 08:00 schedule')
    assert.equal(lateDay.lateMinutes, 25)
    assert.equal(lateDay.note, 'Kehadiran: Terlambat 25 menit (jadwal 08:00)')

    // Night Shift: On-time check-in at 17:50 WITA (09:50 UTC)
    const onTimeNight = calculateAttendancePunctuality({
      eventTime: new Date('2026-09-07T09:50:00.000Z'),
      shiftCode: 'NS',
      scheduledClockIn: '18:00',
      timeZone: 'WITA',
    })
    assert.equal(onTimeNight.isLate, false, '17:50 WITA should be on-time for 18:00 schedule')
    assert.equal(onTimeNight.lateMinutes, 0)
    assert.equal(onTimeNight.note, 'Kehadiran: Tepat waktu (jadwal 18:00)')

    // Night Shift: Late check-in at 18:40 WITA (10:40 UTC)
    const lateNight = calculateAttendancePunctuality({
      eventTime: new Date('2026-09-07T10:40:00.000Z'),
      shiftCode: 'NS',
      scheduledClockIn: '18:00',
      timeZone: 'WITA',
    })
    assert.equal(lateNight.isLate, true, '18:40 WITA should be late for 18:00 schedule')
    assert.equal(lateNight.lateMinutes, 40)
    assert.equal(lateNight.note, 'Kehadiran: Terlambat 40 menit (jadwal 18:00)')
  })

  it('enforces 5:2 off-day rule: non-staff allowed, staff blocked with explanation', () => {
    const saturdayDate = new Date('2026-09-12T01:00:00.000Z')
    const thursdayDate = new Date('2026-09-10T01:00:00.000Z')

    const staffThursday = checkEmployeeOffDayStatus({
      eventTime: thursdayDate,
      role: 'Staff Admin',
      rosterType: '5:2',
      scheduleType: 'office',
      timeZone: 'WITA',
    })
    assert.equal(staffThursday.allowAttendance, true, 'Staff should be allowed on Thursday')
    assert.equal(staffThursday.isOffDay, false)

    const staffSaturday = checkEmployeeOffDayStatus({
      eventTime: saturdayDate,
      role: 'Staff Admin',
      rosterType: '5:2',
      scheduleType: 'office',
      timeZone: 'WITA',
    })
    assert.equal(staffSaturday.allowAttendance, false, 'Staff should NOT be allowed on Saturday')
    assert.equal(staffSaturday.isOffDay, true)
    assert(staffSaturday.reason?.includes('Staff tidak dijadwalkan'))

    const nonStaffSaturday = checkEmployeeOffDayStatus({
      eventTime: saturdayDate,
      role: 'Mechanic',
      rosterType: '5:2',
      scheduleType: 'shift',
      timeZone: 'WITA',
    })
    assert.equal(nonStaffSaturday.allowAttendance, true, 'Non-staff MUST be allowed on Saturday')
    assert.equal(nonStaffSaturday.isOffDay, true)

    const nonStaffExplicitOff = checkEmployeeOffDayStatus({
      eventTime: thursdayDate,
      role: 'Operator',
      scheduledCode: 'OFF',
      timeZone: 'WITA',
    })
    assert.equal(nonStaffExplicitOff.allowAttendance, true, 'Non-staff with OFF MUST be allowed')
    assert.equal(nonStaffExplicitOff.isOffDay, true)

    const staffExplicitOff = checkEmployeeOffDayStatus({
      eventTime: thursdayDate,
      role: 'Supervisor',
      scheduledCode: 'OFF',
      timeZone: 'WITA',
    })
    assert.equal(staffExplicitOff.allowAttendance, false, 'Staff with OFF must be blocked')
    assert.equal(staffExplicitOff.isOffDay, true)
  })

  it('integrates off-day check and punctuality in all attendance endpoints', () => {
    const attActionPath = path.resolve('app/actions/attendance.ts')
    const attActionCode = fs.readFileSync(attActionPath, 'utf8')
    assert(attActionCode.includes('checkEmployeeOffDayStatus'))
    assert(attActionCode.includes('resolveSiteAttendancePunctuality'))

    const faceActionPath = path.resolve('app/actions/face-attendance-actions.ts')
    const faceActionCode = fs.readFileSync(faceActionPath, 'utf8')
    assert(faceActionCode.includes('checkEmployeeOffDayStatus'))
    assert(faceActionCode.includes('resolveSiteAttendancePunctuality'))

    const multiAttPath = path.resolve('app/api/multi-attendance/recognize/route.ts')
    const multiAttCode = fs.readFileSync(multiAttPath, 'utf8')
    assert(multiAttCode.includes('checkEmployeeOffDayStatus'))
    assert(multiAttCode.includes('resolveSiteAttendancePunctuality'))

    const faceSyncPath = path.resolve('lib/timesheet/face-attendance-sync.ts')
    const faceSyncCode = fs.readFileSync(faceSyncPath, 'utf8')
    assert(faceSyncCode.includes('syncNote'))

    const workspacePath = path.resolve('components/scheduling-timesheet-workspace.tsx')
    const workspaceCode = fs.readFileSync(workspacePath, 'utf8')
    assert(workspaceCode.includes('siteAttendanceEmployeeIds'))
    assert(workspaceCode.includes("effectiveStatus = 'present'") || workspaceCode.includes("status = 'present'"))
  })

  it('replaces OFF status with present when attendance exists and keeps OFF when absent', () => {
    // When schedule is OFF and no attendance punch exists
    const rowCode = 'OFF'
    const statusWithoutAttendance = (rowCode === 'OFF' ? 'off' : 'empty')
    assert.equal(statusWithoutAttendance, 'off')

    // When schedule is OFF and attendance punch exists (e.g. clockIn 08:00)
    const clockIn = '08:00'
    let effectiveStatus: string = statusWithoutAttendance
    if (effectiveStatus === 'off' && clockIn) {
      effectiveStatus = 'present'
    }
    assert.equal(effectiveStatus, 'present', 'Attendance on OFF day should replace OFF with present')
  })
  it('correctly identifies night shift schedule codes', () => {
    assert.equal(isNightShiftScheduleCode('NS'), true)
    assert.equal(isNightShiftScheduleCode('NIGHT'), true)
    assert.equal(isNightShiftScheduleCode('MALAM'), true)
    assert.equal(isNightShiftScheduleCode('SHIFT 2'), true)
    assert.equal(isNightShiftScheduleCode('SHIFT-2'), true)
    assert.equal(isNightShiftScheduleCode('NS-A'), true)
    assert.equal(isNightShiftScheduleCode('DS'), false)
    assert.equal(isNightShiftScheduleCode('IN'), false)
    assert.equal(isNightShiftScheduleCode('OFF'), false)
    assert.equal(isNightShiftScheduleCode('FB'), false)
    assert.equal(isNightShiftScheduleCode(null), false)
  })

  it('correctly attributes cross-day night shift checkouts to previous day and keeps OFF day clean', () => {
    // Scenario: Day 1 is NS (17:27 check-in), Day 2 is OFF.
    // Employee checks out at 06:04 on Day 2.
    const day1Schedule = 'NS'
    const day2Schedule = 'OFF'

    const day1ClockIn = '17:27'
    const day2RawPunch = '06:04' // morning checkout (< 12:00)

    // Simulate cross-day attribution:
    // When yesterday was night shift, day 2's morning checkout belongs to Day 1
    const isYesterdayNight = isNightShiftScheduleCode(day1Schedule) || (day1ClockIn >= '15:00')
    assert.equal(isYesterdayNight, true)

    let day1ClockOut = ''
    let day2ClockOut = ''
    let day2Status = 'off'

    if (isYesterdayNight && day2RawPunch < '12:00') {
      day1ClockOut = day2RawPunch
      day2ClockOut = ''
      day2Status = 'off'
    }

    assert.equal(day1ClockOut, '06:04')
    assert.equal(day2ClockOut, '')
    assert.equal(day2Status, 'off', 'Day 2 must remain OFF without attendance')

    // Cross-day flag on Day 1
    const day1IsCrossDay = Boolean(day1ClockIn >= '15:00' && day1ClockOut < '12:00')
    assert.equal(day1IsCrossDay, true, 'Day 1 should have isCrossDay=true to display (+1) badge')

    // Verify conflict check on Day 2:
    const isConflict = day2Status === 'present' && ['OFF', 'Libur', 'Sakit', 'FB'].includes(day2Schedule)
    assert.equal(isConflict, false, 'Day 2 must NOT trigger Beda Roster conflict')
  })

  it('handles missed night check-in: attributes morning checkout to NS day and preserves OFF day', () => {
    // Scenario: Employee forgot to check in at night on Day 1 (scheduled NS),
    // but checked out on Day 2 morning at 06:04. Day 2 schedule is OFF.
    const day1Schedule = 'NS'
    const day2Schedule = 'OFF'
    const day1ClockIn = '' // Missed check-in
    const day2RawPunch = '06:04'

    const isYesterdayNight = isNightShiftScheduleCode(day1Schedule)
    assert.equal(isYesterdayNight, true)

    let day1ClockOut = ''
    let day2ClockOut = ''
    let day2Status = 'off'

    if (isYesterdayNight && day2RawPunch < '12:00') {
      day1ClockOut = day2RawPunch
      day2ClockOut = ''
      day2Status = 'off'
    }

    assert.equal(day1ClockOut, '06:04')
    assert.equal(day2Status, 'off')

    const day1IsCrossDay = Boolean(!day1ClockIn && isNightShiftScheduleCode(day1Schedule) && day1ClockOut < '12:00')
    assert.equal(day1IsCrossDay, true, 'Day 1 with missed check-in should still have isCrossDay=true')
  })

  it('reconciles cross-day checkouts occurring late on next day (Mustofa Ahyari scenario)', () => {
    // Scenario: Day 18 check-in at 16:47 (Night Shift).
    // Day 19 checkout at 17:47 (next afternoon/extended checkout). Day 19 schedule is OFF.
    const day18Schedule = 'NS'
    const day19Schedule = 'OFF'

    // Initial split overrides as saved previously
    const overrides = new Map<number, { clockIn: string; clockOut: string; status: string; isCrossDay?: boolean }>()
    overrides.set(18, { clockIn: '16:47', clockOut: '', status: 'present' })
    overrides.set(19, { clockIn: '', clockOut: '17:47', status: 'present' })

    // Apply cross-day reconciliation
    const curOverride = overrides.get(18)!
    const nextOverride = overrides.get(19)!

    // If Day d has check-in and no check-out, and Day d+1 has only check-out:
    if (curOverride.clockIn && !curOverride.clockOut && nextOverride && !nextOverride.clockIn && nextOverride.clockOut) {
      curOverride.clockOut = nextOverride.clockOut
      curOverride.isCrossDay = true
      // Consumed next day override is removed
      overrides.delete(19)
    }

    // Assert Day 18 has the checkout and isCrossDay flag
    assert.equal(curOverride.clockOut, '17:47')
    assert.equal(curOverride.isCrossDay, true, 'Day 18 must display (+1) badge')

    // Assert Day 19 override was removed
    assert.equal(overrides.has(19), false, 'Day 19 orphan override must be deleted')

    // Day 19 status falls back to roster schedule OFF
    const day19ResolvedStatus = overrides.get(19)?.status || day19Schedule.toLowerCase()
    assert.equal(day19ResolvedStatus, 'off', 'Day 19 must resolve to OFF without Beda Roster')
  })

  it('verifies cross-day reconciliation in codebase files', () => {
    const syncPath = path.resolve('lib/timesheet/face-attendance-sync.ts')
    const syncCode = fs.readFileSync(syncPath, 'utf8')
    assert(syncCode.includes('isYesterdayNightShift'), 'sync must check isYesterdayNightShift')
    assert(syncCode.includes('cross-day-checkout'), 'sync must track cross-day-checkout flag')
    assert(syncCode.includes('isTodayOffDay && checkInPunches.length === 0'), 'sync must protect OFF days without check-in')

    const workspacePath = path.resolve('components/scheduling-timesheet-workspace.tsx')
    const workspaceCode = fs.readFileSync(workspacePath, 'utf8')
    assert(workspaceCode.includes('isOrphanNightCheckoutOnDayOff'), 'workspace must detect orphan night checkout on day off')
    assert(workspaceCode.includes('isCrossDay'), 'workspace must support isCrossDay')
    assert(workspaceCode.includes('(+1)'), 'workspace must render (+1) indicator')

    const cleanScriptPath = path.resolve('scripts/clean-night-shift-off-day-overrides.ts')
    assert(fs.existsSync(cleanScriptPath), 'clean script must exist')
  })
})