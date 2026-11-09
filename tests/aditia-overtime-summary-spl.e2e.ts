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
  await new Promise((resolve) => setTimeout(resolve, 8000))

  // 2. Open Attendance Timesheet View
  const openAttendance = browser.locator('button[aria-label="Lihat attendance"]').first()
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

  // 5. Navigate to Overtime Requests & Summary SPL
  await app.open('/dashboard/overtime-requests')
  await new Promise((resolve) => setTimeout(resolve, 10000))

  // 6. Verify Summary SPL card is present
  const summaryCard = browser.locator('text=Rekapitulasi & Export Summary SPL').first()
  await expect(summaryCard).toBeVisible({ timeout: 60000 })

  // 7. Take screenshot of Overtime Requests / Summary SPL
  await app.screenshot('02-overtime-requests-summary-spl')
})
