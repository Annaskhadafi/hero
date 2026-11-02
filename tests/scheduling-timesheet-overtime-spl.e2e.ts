import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Attendance separates mandatory overtime and approved SPL documents', async ({ app, screen, browser }) => {
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance')
  const openAttendance = browser.locator('button[aria-label="Lihat attendance"]').first()
  await expect(openAttendance).toBeVisible({ timeout: 60000 })
  await openAttendance.click()
  await screen.getByRole('button', { name: 'Overtime', exact: true }).click()
  await app.screenshot('attendance-overtime-wajib')
  await screen.getByRole('button', { name: 'Overtime SPL', exact: true }).click()
  await app.screenshot('attendance-overtime-spl')
  const splCell = browser.locator('button[aria-label^="Lihat SPL "]').first()
  await expect(splCell).toBeVisible({ timeout: 10000 })
  await splCell.click()
  await expect(browser.locator('iframe[title^="SPL "]')).toBeVisible({ timeout: 30000 })
  await app.screenshot('attendance-dokumen-spl')
})
