import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Auto-approve SPL and Daily Activity requester step contract verification', () => {
  // 1. Check overtime-requests actions
  const overtimeActionsPath = path.join(process.cwd(), 'app/dashboard/overtime-requests/actions.ts')
  assert.ok(fs.existsSync(overtimeActionsPath), 'Overtime actions file exists')
  const overtimeContent = fs.readFileSync(overtimeActionsPath, 'utf8')

  assert.ok(
    overtimeContent.includes("stepLabel: 'Karyawan Sign'") &&
    overtimeContent.includes("status: 'approved'") &&
    overtimeContent.includes("status: 'pending'") &&
    overtimeContent.includes("stepLabel: 'Leader / Supervisor'") ||
    overtimeContent.includes("stepLabel: 'Leader / Pengawas'"),
    'Overtime actions auto-approves Step 1 (Karyawan Sign) and sets Step 2 (Leader) to pending'
  )
  assert.ok(
    overtimeContent.includes('Tanda tangan digital pemohon belum terdaftar'),
    'Overtime creation validates digital signature presence'
  )

  // 2. Check activity-hub actions
  const activityActionsPath = path.join(process.cwd(), 'app/dashboard/activity-hub/actions.ts')
  assert.ok(fs.existsSync(activityActionsPath), 'Activity hub actions file exists')
  const activityContent = fs.readFileSync(activityActionsPath, 'utf8')

  assert.ok(
    activityContent.includes("stepLabel: 'Karyawan Sign'") &&
    activityContent.includes("status: 'approved'") &&
    activityContent.includes("stepLabel: 'Leader / PJO'") &&
    activityContent.includes("status: 'pending'"),
    'Activity hub actions auto-approves Step 1 (Karyawan Sign) and sets Step 2 (Leader / PJO) to pending'
  )
  assert.ok(
    activityContent.includes('Tanda tangan digital pemohon belum terdaftar'),
    'Activity session creation validates digital signature presence'
  )

  // 3. Check auto-SPL attendance integration
  const autoSplHelperPath = path.join(process.cwd(), 'lib/timesheet/auto-spl-attendance.ts')
  assert.ok(fs.existsSync(autoSplHelperPath), 'Auto-SPL attendance helper exists')
  const autoSplContent = fs.readFileSync(autoSplHelperPath, 'utf8')
  assert.ok(autoSplContent.includes('checkAndAutoGenerateSplOnCheckout'), 'Helper exports checkAndAutoGenerateSplOnCheckout')
  assert.ok(autoSplContent.includes('attendance_auto'), 'Auto-SPL uses origin attendance_auto')

  // Check face attendance and regular attendance integration
  const faceAttendancePath = path.join(process.cwd(), 'app/actions/face-attendance-actions.ts')
  const faceAttendanceContent = fs.readFileSync(faceAttendancePath, 'utf8')
  assert.ok(faceAttendanceContent.includes('checkAndAutoGenerateSplOnCheckout'), 'Face attendance integrates checkAndAutoGenerateSplOnCheckout')

  const attendancePath = path.join(process.cwd(), 'app/actions/attendance.ts')
  const attendanceContent = fs.readFileSync(attendancePath, 'utf8')
  assert.ok(attendanceContent.includes('checkAndAutoGenerateSplOnCheckout'), 'Attendance actions integrates checkAndAutoGenerateSplOnCheckout')

  // 4. Check Daily Activity PDF QR conditional rendering
  const pdfRoutePath = path.join(process.cwd(), 'app/api/activity-sessions/[sessionId]/pdf/route.ts')
  const pdfRouteContent = fs.readFileSync(pdfRoutePath, 'utf8')
  assert.ok(pdfRouteContent.includes('const hasEvidence ='), 'PDF route computes hasEvidence')
  assert.ok(pdfRouteContent.includes('if (hasEvidence)'), 'PDF route only renders QR code when hasEvidence is true')

  // 5. Check desktop modal optional fields
  const modalPath = path.join(process.cwd(), 'components/daily-activity-create-modal.tsx')
  const modalContent = fs.readFileSync(modalPath, 'utf8')
  assert.ok(!modalContent.includes('Photo Evidence pada item'), 'Desktop create modal no longer throws mandatory photo error')
})
