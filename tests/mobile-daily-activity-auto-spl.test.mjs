import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Mobile Daily Activity to SPL auto-generation integration contracts', () => {
  const historyPath = path.join(process.cwd(), 'components/mobile/mobile-daily-activity-history.tsx')
  const historyContent = fs.readFileSync(historyPath, 'utf8')
  assert.ok(historyContent.includes('BUAT SPL LEMBUR'), 'Mobile history renders BUAT SPL LEMBUR button')
  assert.ok(historyContent.includes('BUAT SPL TAMBAHAN'), 'Mobile history renders BUAT SPL TAMBAHAN when SPL exists')
  assert.ok(historyContent.includes('/mobile/overtime?tab=history&splNumber='), 'Mobile history links directly to Mobile SPL module')

  const clientPath = path.join(process.cwd(), 'components/mobile/mobile-daily-activity-client.tsx')
  const clientContent = fs.readFileSync(clientPath, 'utf8')
  assert.ok(clientContent.includes('DailyActivityCreateSplModal'), 'Mobile DAR client renders DailyActivityCreateSplModal')
  assert.ok(clientContent.includes('splModuleBasePath="/mobile/overtime"'), 'Mobile DAR client passes mobile overtime base path')
  assert.ok(clientContent.includes('mapMobileDarToEmployeeActivityRow'), 'Mobile DAR client maps DAR session into EmployeeActivityRow')
  assert.ok(clientContent.includes('mobile-review-btn-buat-spl'), 'Mobile DAR review modal exposes BUAT SPL button')

  const approvalClientPath = path.join(process.cwd(), 'components/mobile/mobile-daily-activity-approval-client.tsx')
  const approvalClientContent = fs.readFileSync(approvalClientPath, 'utf8')
  assert.ok(approvalClientContent.includes('DailyActivityCreateSplModal'), 'Mobile approval client renders DailyActivityCreateSplModal')
  assert.ok(approvalClientContent.includes('mobile-approval-btn-buat-spl'), 'Mobile approval client exposes BUAT SPL button')

  const overtimePagePath = path.join(process.cwd(), 'app/mobile/overtime/page.tsx')
  const overtimePageContent = fs.readFileSync(overtimePagePath, 'utf8')
  assert.ok(overtimePageContent.includes('initialQuery={query.splNumber || \'\'}'), 'Mobile overtime page passes splNumber query to MobileSplHistory')

  const splHistoryPath = path.join(process.cwd(), 'components/mobile/mobile-spl-history.tsx')
  const splHistoryContent = fs.readFileSync(splHistoryPath, 'utf8')
  assert.ok(splHistoryContent.includes('initialQuery'), 'MobileSplHistory accepts initialQuery for deep-linking')

  const daActionsPath = path.join(process.cwd(), 'app/dashboard/daily-activity/actions.ts')
  const daActionsContent = fs.readFileSync(daActionsPath, 'utf8')
  assert.ok(daActionsContent.includes("revalidatePath('/mobile/activity')"), 'Revalidates /mobile/activity after SPL creation')
  assert.ok(daActionsContent.includes("revalidatePath('/mobile/overtime')"), 'Revalidates /mobile/overtime after SPL creation')
})

test('Mobile DAR mapper normalizes Asia/Makassar timestamps, cross-midnight items, and employee metadata', async () => {
  const mapperPath = path.join(process.cwd(), 'lib/daily-activity-spl-mapper.ts')
  assert.ok(fs.existsSync(mapperPath), 'lib/daily-activity-spl-mapper.ts exists')

  const mod = await import('../lib/daily-activity-spl-mapper.ts')
  const { mapMobileDarToEmployeeActivityRow, formatTimestampToHHmm, normalizeMobileDateToYmd } = mod

  // UTC 14:30 == 22:30 WITA (Asia/Makassar, +08:00)
  assert.equal(formatTimestampToHHmm('2026-11-11T14:30:00.000Z'), '22:30')
  assert.equal(formatTimestampToHHmm('17:45:00'), '17:45')
  assert.equal(normalizeMobileDateToYmd('2026-11-11T22:30:00.000Z'), '2026-11-12')

  const row = mapMobileDarToEmployeeActivityRow(
    {
      id: 901,
      sessionId: 901,
      sessionCode: 'DAS-20261111-71261-1',
      workDate: '2026-11-11T00:00:00+08:00',
      shiftCode: '1',
      status: 'submitted',
      title: 'Overtime Tire Inspection',
      items: [
        {
          id: 5001,
          snapshotLabel: 'Inspeksi Ban Unit HD785',
          unitNumber: 'DT-785',
          remark: 'Penggantian ban posisi 3 di luar jam shift',
          actualPoints: 15,
          startedAt: '2026-11-11T17:30:00+08:00',
          endedAt: '2026-11-11T20:45:00+08:00',
          snapshotPayload: JSON.stringify({ photoUrl: '/api/uploads/activity-photos/test.jpg' }),
        },
      ],
    },
    {
      id: 42,
      name: 'Mochamad Annas Khadafi',
      employeeSn: '71261',
      jobTitle: 'Leader',
      department: 'Central Services',
      siteId: 1,
      siteName: 'Balikpapan',
    }
  )

  assert.equal(row.sessionId, 901)
  assert.equal(row.employeeDbId, 42)
  assert.equal(row.employeeId, '71261')
  assert.equal(row.rawWorkDate, '2026-11-11')
  assert.equal(row.shift, 'Pagi')
  assert.equal(row.tasks.length, 1)
  assert.equal(row.tasks[0].id, 5001)
  assert.equal(row.tasks[0].startedAt, '17:30')
  assert.equal(row.tasks[0].endedAt, '20:45')
  assert.equal(row.tasks[0].unitNumber, 'DT-785')
  assert.equal(row.tasks[0].photoUrl, '/api/uploads/activity-photos/test.jpg')
})
