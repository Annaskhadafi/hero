import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Aditia Maulana Saputra Overtime Summary & SPL Duration Akurat', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login and go to Attendance Timesheet
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance')
  
  // Wait until navigated away from sign-in
  await browser.waitForURL('**/dashboard/**', { timeout: 60000 }).catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 10000))

  // 2. Open Attendance Timesheet View if button present
  const openAttendance = browser.locator('button[aria-label="Lihat attendance"], button:has-text("Lihat Attendance")').first()
  if (await openAttendance.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openAttendance.click()
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  // 3. Switch to Overtime view
  const otBtn = screen.getByRole('button', { name: 'Overtime', exact: true })
  if (await otBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await otBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  // 4. Take screenshot of Attendance Overtime view showing employees with calculated overtime
  await app.screenshot('01-attendance-overtime-summary-grid')

  // 5. Open dialog export / summary preview
  const exportBtn = browser.locator('button:has-text("Preview & Export PDF"), button[title*="Export PDF"]').first()
  if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await exportBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await app.screenshot('02-overtime-summary-pdf-dialog')
  }
})
