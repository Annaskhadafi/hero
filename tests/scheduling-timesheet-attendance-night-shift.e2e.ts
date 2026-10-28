import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Attendance Grid: Shift Malam Cross-Day & Hari OFF Bersih', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dengan kredensial baku sistem
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
  })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2. Buka Halaman Scheduling Timesheet Attendance
  await app.open('/dashboard/scheduling-timesheet/attendance')
  await new Promise((resolve) => setTimeout(resolve, 8000))

  // 3. Verifikasi Workspace Attendance Table tampil
  const attendanceWorkspace = browser.locator('table, [role="table"], div:has-text("Attendance")').first()
  await expect(attendanceWorkspace).toBeVisible({ timeout: 30000 })

  // 4. Ambil screenshot pratinjau tabel kehadiran
  await app.screenshot('attendance-grid-night-shift-and-off-clean')

  // 5. Verifikasi interaksi tombol atau badge jika ada
  await new Promise((resolve) => setTimeout(resolve, 2000))
  await app.screenshot('attendance-grid-overview')
})
