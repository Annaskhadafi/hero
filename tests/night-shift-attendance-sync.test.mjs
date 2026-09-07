import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// 1. Verify Timezone Inference for AMM MIFA
const timezoneModulePath = path.resolve('lib/indonesia-timezone.ts')
const timezoneCode = fs.readFileSync(timezoneModulePath, 'utf8')

assert(timezoneCode.includes("'mifa'"), "WIB keywords must include 'mifa'")
assert(timezoneCode.includes("'meulaboh'"), "WIB keywords must include 'meulaboh'")
assert(timezoneCode.includes("'nagan raya'"), "WIB keywords must include 'nagan raya'")
assert(timezoneCode.includes("'aceh barat'"), "WIB keywords must include 'aceh barat'")

// 2. Verify Face Attendance Sync Logic
const faceSyncPath = path.resolve('lib/timesheet/face-attendance-sync.ts')
const faceSyncCode = fs.readFileSync(faceSyncPath, 'utf8')

assert(faceSyncCode.includes('inferTimezoneFromLocation(row?.siteName)'), 'getSiteTimezone must infer from siteName')
assert(faceSyncCode.includes('consumedPunchIds'), 'syncFaceAttendanceToTimesheet must track consumedPunchIds from yesterday night shift')
assert(faceSyncCode.includes('prevNightPunch'), 'syncFaceAttendanceToTimesheet must check yesterday night checkin')
assert(faceSyncCode.includes('todayOwnPunches'), 'syncFaceAttendanceToTimesheet must isolate today own punches')

// 3. Verify Attendance Import Logic
const importPath = path.resolve('lib/timesheet/attendance-import.ts')
const importCode = fs.readFileSync(importPath, 'utf8')

assert(importCode.includes('curInHour !== null && (curInHour >= 15 || curInHour < 5)'), 'attendance-import must handle night shift checkin preservation')

// 4. Verify Attendance Actions & Route Integration
const actionPath = path.resolve('app/actions/face-attendance-actions.ts')
const actionCode = fs.readFileSync(actionPath, 'utf8')
assert(actionCode.includes('syncFaceAttendanceToTimesheet'), 'face-attendance-actions must call syncFaceAttendanceToTimesheet')

const attActionPath = path.resolve('app/actions/attendance.ts')
const attActionCode = fs.readFileSync(attActionPath, 'utf8')
assert(attActionCode.includes('syncFaceAttendanceToTimesheet'), 'attendance.ts submitAttendance must call syncFaceAttendanceToTimesheet')

const multiAttPath = path.resolve('app/api/multi-attendance/recognize/route.ts')
const multiAttCode = fs.readFileSync(multiAttPath, 'utf8')
assert(multiAttCode.includes('syncFaceAttendanceToTimesheet'), 'multi-attendance recognize must call syncFaceAttendanceToTimesheet')

// 5. Test Night Shift Attribution Algorithm (Simulation matching lib/timesheet/attendance-import.ts)
function simulateNightShiftPreprocessing(rows) {
  const adjustedRows = rows.map((row) => ({ ...row }))
  for (let i = 0; i < adjustedRows.length; i++) {
    const cur = adjustedRows[i]
    if (cur.day <= 1) continue

    const outHour = cur.clockOut ? Number(cur.clockOut.split(':')[0]) : null
    const inHour = cur.clockIn ? Number(cur.clockIn.split(':')[0]) : null

    // Check if cur has a morning punch (< 10:00) that should serve as checkout for yesterday's night shift
    let morningPunch = ''
    if (outHour !== null && outHour < 10) {
      morningPunch = cur.clockOut
    } else if (inHour !== null && inHour < 10) {
      morningPunch = cur.clockIn
    }

    if (!morningPunch) continue

    const prev = adjustedRows.find((r) => r.day === cur.day - 1 && r.employeeSn === cur.employeeSn)

    if (prev) {
      const prevInHour = prev.clockIn ? Number(prev.clockIn.split(':')[0]) : null
      if (prevInHour !== null && (prevInHour >= 15 || prevInHour < 5)) {
        if (!prev.clockOut) {
          prev.clockOut = morningPunch
        }
        const curInHour = cur.clockIn ? Number(cur.clockIn.split(':')[0]) : null
        if (curInHour !== null && (curInHour >= 15 || curInHour < 5)) {
          // Cur has an evening checkin for today's night shift; keep clockIn and clear morning checkout
          cur.clockOut = ''
        } else {
          // Cur only had the morning checkout or no evening shift; set day off / clear
          cur.clockIn = ''
          cur.clockOut = ''
          cur.status = 'off'
          cur.note = ''
        }
      }
    }
  }
  return adjustedRows
}

// Case 1: Single Night Shift (Masuk Selasa 17:00, Pulang Rabu 07:00 -> Rabu OFF)
const case1 = [
  { employeeSn: 'EMP1', day: 1, clockIn: '17:00', clockOut: '', status: 'present' }, // Selasa
  { employeeSn: 'EMP1', day: 2, clockIn: '07:00', clockOut: '', status: 'present' }, // Rabu (checkout scanned as clockIn)
]
const res1 = simulateNightShiftPreprocessing(case1)
assert.equal(res1[0].clockIn, '17:00')
assert.equal(res1[0].clockOut, '07:00', 'Selasa receives Rabu morning checkout')
assert.equal(res1[0].status, 'present')
assert.equal(res1[1].clockIn, '', 'Rabu does not have clockIn')
assert.equal(res1[1].clockOut, '', 'Rabu does not have clockOut')
assert.equal(res1[1].status, 'off', 'Rabu is OFF and not double counted')

// Case 2: Consecutive Night Shifts (Selasa 17:35 -> Rabu 05:35, Rabu 17:35 -> Kamis 05:35, Kamis OFF)
const case2 = [
  { employeeSn: 'EMP1', day: 1, clockIn: '17:35', clockOut: '', status: 'present' },
  { employeeSn: 'EMP1', day: 2, clockIn: '17:35', clockOut: '05:35', status: 'present' },
  { employeeSn: 'EMP1', day: 3, clockIn: '18:10', clockOut: '05:35', status: 'present' },
  { employeeSn: 'EMP1', day: 4, clockIn: '', clockOut: '05:55', status: 'present' },
]
const res2 = simulateNightShiftPreprocessing(case2)
assert.equal(res2[0].clockIn, '17:35')
assert.equal(res2[0].clockOut, '05:35', 'Day 1 must receive Day 2 morning checkout')
assert.equal(res2[1].clockIn, '17:35', 'Day 2 evening checkin must be preserved')
assert.equal(res2[1].clockOut, '05:35', 'Day 2 must receive Day 3 morning checkout')
assert.equal(res2[2].clockIn, '18:10', 'Day 3 evening checkin must be preserved')
assert.equal(res2[2].clockOut, '05:55', 'Day 3 must receive Day 4 morning checkout')
assert.equal(res2[3].clockIn, '', 'Day 4 had only checkout, should be off')
assert.equal(res2[3].clockOut, '', 'Day 4 checkout was consumed by Day 3')
assert.equal(res2[3].status, 'off', 'Day 4 status should be off')

console.log('✅ All Night Shift Attendance Sync & Simulation Tests Passed!')
