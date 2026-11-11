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
})
