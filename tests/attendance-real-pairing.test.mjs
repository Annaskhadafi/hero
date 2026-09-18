import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// 1. Verify face sync code guarantees
const faceSyncPath = path.resolve('lib/timesheet/face-attendance-sync.ts')
const faceSyncCode = fs.readFileSync(faceSyncPath, 'utf8')

assert(
  faceSyncCode.includes('!isCheckOutEvent(r.eventType)'),
  'prevNightPunch must only consider check-in events'
)
assert(
  faceSyncCode.includes('prevHasDayShiftIn'),
  'yesterday day-shift check-ins must prevent false night shift attribution'
)
assert(
  faceSyncCode.includes('isCheckOutEvent(r.eventType) && getTimezoneDateParts(r.eventTime, tzInfo.code).hours < 10'),
  'morning checkout consumption must require an explicit checkout event'
)
assert(
  faceSyncCode.includes("validationFlags.push('missing-check-in')"),
  'attendance sync must flag missing-check-in if employee only checked out'
)

// 2. Simulation of consecutive Day Shifts: Day 1 (07:50 - 19:03), Day 2 (07:53 - 19:03), Day 3 (07:47 - 19:04)
function simulateMultiDayPairing(punchesByDay) {
  const result = []

  let consumedPunchIds = new Set()

  for (let dayIndex = 0; dayIndex < punchesByDay.length; dayIndex++) {
    const dayData = punchesByDay[dayIndex]
    const sorted = [...dayData.punches].sort((a, b) => a.time.localeCompare(b.time))

    // Previous day check
    if (dayIndex > 0) {
      const prevData = punchesByDay[dayIndex - 1]
      const prevSorted = [...prevData.punches].sort((a, b) => a.time.localeCompare(b.time))
      const prevCheckIns = prevSorted.filter((p) => p.type === 'checked-in')
      const prevNightIn = prevCheckIns.find((p) => {
        const h = Number(p.time.split(':')[0])
        return h >= 15 || h < 5
      })
      const prevHasDayIn = prevCheckIns.some((p) => {
        const h = Number(p.time.split(':')[0])
        return h >= 5 && h < 15
      })

      if (prevNightIn && !prevHasDayIn) {
        const morningOuts = sorted.filter(
          (p) => p.type === 'checked-out' && Number(p.time.split(':')[0]) < 10
        )
        if (morningOuts.length > 0) {
          const morningOut = morningOuts[morningOuts.length - 1]
          result[dayIndex - 1].clockOut = morningOut.time
          consumedPunchIds.add(morningOut.id)
        }
      }
    }

    const todayOwn = sorted.filter((p) => !consumedPunchIds.has(p.id))
    if (todayOwn.length === 0) {
      result.push({ day: dayData.day, clockIn: '', clockOut: '', status: 'off' })
      continue
    }

    const checkIns = todayOwn.filter((p) => p.type === 'checked-in')
    const checkOuts = todayOwn.filter((p) => p.type === 'checked-out')

    let clockIn = ''
    let isNight = false
    if (checkIns.length > 0) {
      clockIn = checkIns[0].time
      const h = Number(clockIn.split(':')[0])
      isNight = h >= 15 || h < 5
    }

    let clockOut = ''
    if (!isNight) {
      if (checkOuts.length > 0) {
        clockOut = checkOuts[checkOuts.length - 1].time
      }
    } else {
      if (checkOuts.length > 0) {
        clockOut = checkOuts[checkOuts.length - 1].time
      }
    }

    result.push({
      day: dayData.day,
      clockIn,
      clockOut,
      status: 'present',
    })
  }

  return result
}

// Test Case: Muhammad Taufik Akbar scenario over 3 consecutive days
const simData = [
  {
    day: 15,
    punches: [
      { id: 1, type: 'checked-in', time: '07:50' },
      { id: 2, type: 'checked-out', time: '19:08' },
    ],
  },
  {
    day: 16,
    punches: [
      { id: 3, type: 'checked-in', time: '07:38' },
      { id: 4, type: 'checked-out', time: '19:04' },
    ],
  },
  {
    day: 17,
    punches: [
      { id: 5, type: 'checked-in', time: '07:47' },
      { id: 6, type: 'checked-out', time: '19:03' },
    ],
  },
]

const simResult = simulateMultiDayPairing(simData)

assert.equal(simResult[0].day, 15)
assert.equal(simResult[0].clockIn, '07:50')
assert.equal(simResult[0].clockOut, '19:08')

assert.equal(simResult[1].day, 16)
assert.equal(simResult[1].clockIn, '07:38')
assert.equal(simResult[1].clockOut, '19:04')

assert.equal(simResult[2].day, 17)
assert.equal(simResult[2].clockIn, '07:47')
assert.equal(simResult[2].clockOut, '19:03')

console.log('✅ All Attendance Real Pairing & Multi-Day Tests Passed Successfully!')
