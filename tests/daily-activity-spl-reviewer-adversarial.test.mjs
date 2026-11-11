import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Reviewer Adversarial Check: cross-midnight duration and same-time edge cases', () => {
  // Helper functions mimicking the revised logic in components/daily-activity-create-spl-modal.tsx
  function parseTimeToMinutes(t) {
    if (!t || t === '-') return null
    const [hhStr, mmStr = '0'] = t.split(':')
    const hh = parseInt(hhStr, 10)
    const mm = parseInt(mmStr, 10)
    if (isNaN(hh) || isNaN(mm)) return null
    return hh * 60 + mm
  }

  function computeDuration(startTime, endTime) {
    if (!startTime || !endTime || startTime === endTime) return 0
    const sh = parseTimeToMinutes(startTime)
    const eh = parseTimeToMinutes(endTime)
    if (sh === null || eh === null) return 0
    let diffMinutes = eh - sh
    if (diffMinutes < 0) diffMinutes += 24 * 60
    return Math.round((diffMinutes / 60) * 10) / 10
  }

  // 1. Same-time start and end should be 0, NOT 24
  assert.equal(computeDuration('17:00', '17:00'), 0, 'Same start and end time yields 0 hours')
  assert.equal(computeDuration('00:00', '00:00'), 0, '00:00 to 00:00 yields 0 hours')

  // 2. Normal day shift overtime
  assert.equal(computeDuration('17:00', '21:00'), 4.0, '17:00 to 21:00 yields 4.0 hours')
  assert.equal(computeDuration('16:30', '20:45'), 4.3, '16:30 to 20:45 yields 4.3 hours')

  // 3. Cross-midnight night shift overtime
  assert.equal(computeDuration('23:00', '07:00'), 8.0, '23:00 to 07:00 yields 8.0 hours')
  assert.equal(computeDuration('22:00', '02:30'), 4.5, '22:00 to 02:30 yields 4.5 hours')
})

test('Reviewer Adversarial Check: cross-midnight candidate task timeline extraction', () => {
  function parseTimeToMinutes(t) {
    if (!t || t === '-') return null
    const [hhStr, mmStr = '0'] = t.split(':')
    const hh = parseInt(hhStr, 10)
    const mm = parseInt(mmStr, 10)
    if (isNaN(hh) || isNaN(mm)) return null
    return hh * 60 + mm
  }

  function minutesToTimeString(totalMinutes) {
    const norm = ((totalMinutes % 1440) + 1440) % 1440
    const hh = Math.floor(norm / 60)
    const mm = norm % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  // Candidate tasks where task 2 crosses midnight
  const candidateTasks = [
    { label: 'Inspeksi Ban HD', startedAt: '22:00', endedAt: '23:30' },
    { label: 'Pergantian OTR Tire', startedAt: '23:30', endedAt: '01:30' },
  ]

  let minTimelineStart = Infinity
  let maxTimelineEnd = -Infinity

  for (const t of candidateTasks) {
    const sMin = parseTimeToMinutes(t.startedAt)
    const eMin = parseTimeToMinutes(t.endedAt)
    if (sMin !== null) {
      let effectiveEnd = eMin
      if (effectiveEnd !== null && effectiveEnd < sMin) {
        effectiveEnd += 1440
      }
      if (sMin < minTimelineStart) minTimelineStart = sMin
      if (effectiveEnd !== null && effectiveEnd > maxTimelineEnd) {
        maxTimelineEnd = effectiveEnd
      }
    }
  }

  const startTime = minutesToTimeString(minTimelineStart)
  const endTime = minutesToTimeString(maxTimelineEnd)

  assert.equal(startTime, '22:00', 'Timeline start is 22:00')
  assert.equal(endTime, '01:30', 'Timeline end is 01:30 (not 23:30 from naive string sort)')
})

test('Reviewer Adversarial Check: metaPayload JSON roundtrip for overtime-requests compatibility', () => {
  const task = {
    label: 'Pergantian Ban Loader',
    unitNumber: 'LD-880',
    startedAt: '17:30',
    endedAt: '20:30',
    points: 15,
    remarks: 'Pekerjaan mendesak sebelum shift pagi',
    photoUrl: '/api/uploads/loader-tire.jpg',
  }

  const diffMinutes = 180

  const metaPayload = {
    code: '',
    name: task.label || 'Pekerjaan Lembur Operasional',
    unitNumber: task.unitNumber || '-',
    tireCount: 1,
    materialUsed: '',
    startTime: task.startedAt,
    endTime: task.endedAt,
    duration: String(diffMinutes),
    remark: task.remarks,
    photos: task.photoUrl ? [task.photoUrl] : [],
    photoUrl: task.photoUrl || null,
  }

  const serialized = JSON.stringify(metaPayload)
  assert.ok(serialized.startsWith('{'), 'Serialized lineDescription starts with {')

  // Simulate parsing in app/dashboard/overtime-requests/page.tsx:373
  const parsed = JSON.parse(serialized)
  assert.equal(parsed.name, 'Pergantian Ban Loader')
  assert.equal(parsed.unitNumber, 'LD-880')
  assert.equal(parsed.startTime, '17:30')
  assert.equal(parsed.endTime, '20:30')
  assert.equal(parsed.duration, '180')
  assert.equal(parsed.photoUrl, '/api/uploads/loader-tire.jpg')
  assert.deepEqual(parsed.photos, ['/api/uploads/loader-tire.jpg'])
})

test('Reviewer Adversarial Check: server action does not insert invalid columns to DB', () => {
  const actionsFilePath = path.join(process.cwd(), 'app/dashboard/daily-activity/actions.ts')
  const content = fs.readFileSync(actionsFilePath, 'utf8')

  // Verify photoUrl is NOT passed directly as a column to overtimeCommandLetterItems
  assert.ok(
    !content.includes('await db.insert(overtimeCommandLetterItems).values({\n        overtimeCommandLetterId: insertedSpl.id,\n        lineLabel: t.label || \'Pekerjaan Lembur Operasional\',\n        lineDescription: t.remarks || `Pekerjaan lembur lapangan: ${t.label}`,\n        targetUnit: t.unitNumber || \'-\',\n        estimatedMinutes: diffMinutes,\n        plannedPoints: t.points || 10,\n        photoUrl:'),
    'photoUrl column is not inserted directly into overtimeCommandLetterItems'
  )

  // Verify metaPayload is JSON stringified in lineDescription
  assert.ok(
    content.includes('lineDescription: JSON.stringify(metaPayload)'),
    'Line item metadata is serialized into lineDescription JSON string'
  )

  // Verify overtimeCreditMinutes is populated on participant
  assert.ok(
    content.includes('overtimeCreditMinutes: durationMinutes'),
    'overtimeCreditMinutes is populated for timesheet & payroll integration'
  )

  // Verify requesterEmployeeId is targetEmp.id
  assert.ok(
    content.includes('const requesterEmployeeId = targetEmp.id'),
    'Applicant/Serviceman is correctly assigned to targetEmp.id'
  )

  // Verify guaranteed unique nextNumber resolution
  assert.ok(
    content.includes('while (true)') && content.includes('where(eq(overtimeCommandLetters.splNumber, nextNumber))'),
    'Next SPL number resolution verifies uniqueness against database to prevent collisions'
  )

  // Verify assignedEmployeeId is populated on overtimeCommandLetterItems
  assert.ok(
    content.includes('assignedEmployeeId: targetEmp.id'),
    'assignedEmployeeId is populated on overtimeCommandLetterItems for conflict detection'
  )

  // Verify hierarchical target employee resolution
  assert.ok(
    content.includes('if (input.employeeDbId') && content.includes('if (!targetEmp && input.employeeSn') && content.includes('if (!targetEmp && input.employeeName'),
    'Target employee is resolved hierarchically (DbId -> Sn -> Name -> currentEmp) rather than flat OR'
  )

  // Verify server-side validation against identical start and end time
  assert.ok(
    content.includes('if (cleanStart === cleanEnd)'),
    'Server action validates that start time and end time cannot be identical'
  )

  // Verify strict less-than check for cross-midnight
  assert.ok(
    content.includes('if (plannedEndAt < plannedStartAt)'),
    'Server action uses strict less-than check for cross-midnight rollover'
  )
})

test('Reviewer Adversarial Check: timezone date consistency in daily-activity-dashboard', () => {
  // Simulate the issue where a timestamp in +07:00 or +08:00 was parsed with toISOString()
  const workDateStr = '2026-11-12'
  const parsedWorkDate = new Date(`${workDateStr}T00:00:00+07:00`)

  // Naive toISOString() shifts by -7h into previous day (2026-11-11)
  const naiveDateStr = parsedWorkDate.toISOString().split('T')[0]
  assert.equal(naiveDateStr, '2026-11-11', 'Proves naive toISOString creates day boundary shift')

  // Normalized formatter with site timezone (Asia/Makassar or Asia/Jakarta) preserves exact workDate
  function normalizeDateToYmdString(dateInput) {
    if (!dateInput) return 'nodate'
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      return dateInput.trim()
    }
    const d = new Date(dateInput)
    if (Number.isNaN(d.getTime())) return 'nodate'
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(d)
  }

  const accurateDateStr = normalizeDateToYmdString(parsedWorkDate)
  assert.equal(accurateDateStr, '2026-11-12', 'normalizeDateToYmdString preserves the actual work date')

  // Verify lib/daily-activity-dashboard.ts uses normalizeDateToYmdString for splDateStr
  const dashboardFilePath = path.join(process.cwd(), 'lib/daily-activity-dashboard.ts')
  const dashboardContent = fs.readFileSync(dashboardFilePath, 'utf8')
  assert.ok(
    dashboardContent.includes('const splDateStr = normalizeDateToYmdString(spl.workDate)'),
    'lib/daily-activity-dashboard.ts maps SPL work date with normalizeDateToYmdString'
  )
  assert.ok(
    dashboardContent.includes("rawWorkDate: sDateStr !== 'nodate' ? sDateStr : undefined"),
    'lib/daily-activity-dashboard.ts passes normalized local date as rawWorkDate'
  )
})

test('Reviewer Adversarial Check: single task equal start/end duration edge case', () => {
  // If task has startedAt: '17:00' and endedAt: '17:00'
  function computeTaskMinutes(startedAt, endedAt) {
    let diffMinutes = 60
    if (startedAt && endedAt && startedAt !== '-' && endedAt !== '-') {
      const [sh, sm] = startedAt.split(':').map((v) => parseInt(v, 10))
      const [eh, em] = endedAt.split(':').map((v) => parseInt(v, 10))
      if (!isNaN(sh) && !isNaN(eh)) {
        let mins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))
        if (mins < 0) mins += 24 * 60
        diffMinutes = mins > 0 ? mins : 30
      }
    }
    return diffMinutes
  }

  assert.equal(computeTaskMinutes('17:00', '17:00'), 30, 'Equal start/end defaults to safe 30 mins, never 1440 mins')
  assert.equal(computeTaskMinutes('17:00', '19:00'), 120, '17:00 to 19:00 is 120 mins')
  assert.equal(computeTaskMinutes('23:00', '01:00'), 120, '23:00 to 01:00 cross-midnight is 120 mins')
})
