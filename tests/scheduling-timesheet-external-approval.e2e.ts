import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Opsi Approval Eksternal (2, 3, 4 TTD) Overtime Record', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dan buka list attendance
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/scheduling-timesheet/attendance',
  })

  // 2. Buka salah satu attendance untuk masuk ke SchedulingTimesheetWorkspace
  const openAttendance = browser.locator('button[aria-label="Lihat attendance"]').first()
  await expect(openAttendance).toBeVisible({ timeout: 60000 })
  await openAttendance.click()

  // 3. Masuk ke tab Overtime
  const overtimeTabBtn = screen.getByRole('button', { name: 'Overtime', exact: true })
  await expect(overtimeTabBtn).toBeVisible({ timeout: 30000 })
  await overtimeTabBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))
  await app.screenshot('timesheet-overtime-tab-overview')

  // 4. Verifikasi toggle Eksternal summary tampil
  const toggleExternal = browser.locator('#toggle-external-pdf-summary').first()
  await expect(toggleExternal).toBeVisible({ timeout: 15000 })

  // 5. Aktifkan toggle Eksternal
  await toggleExternal.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await app.screenshot('timesheet-external-approval-active')

  // 6. Buka dropdown pilihan format approval eksternal
  const approvalDropdownBtn = browser.locator('#btn-external-signature-count-summary').first()
  await expect(approvalDropdownBtn).toBeVisible({ timeout: 10000 })
  await approvalDropdownBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await app.screenshot('timesheet-external-approval-dropdown-options')

  // 7. Verifikasi pilihan 2 Approval, 3 Approval, 4 Approval tampil di dropdown
  await expect(browser.locator('[role="menuitem"]:has-text("2 Approval")').first()).toBeVisible({ timeout: 10000 })
  await expect(browser.locator('[role="menuitem"]:has-text("3 Approval")').first()).toBeVisible({ timeout: 10000 })
  await expect(browser.locator('[role="menuitem"]:has-text("4 Approval")').first()).toBeVisible({ timeout: 10000 })
  await app.screenshot('timesheet-external-approval-verified')
})
