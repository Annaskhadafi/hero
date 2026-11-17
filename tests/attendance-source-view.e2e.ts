import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Attendance source view is read-only and reversible', { timeout: 300000 }, async ({ app, screen, browser }) => {
  await loginToHero(app, screen, browser, {
    targetUrl: '/dashboard/scheduling-timesheet/attendance',
  })
  await expect(browser).toHaveURL(/\/dashboard\/scheduling-timesheet\/attendance/, { timeout: 60000 })

  const openAttendance = screen.getByRole('button', { name: 'Lihat attendance' }).first()
  await expect(openAttendance).toBeVisible({ timeout: 30000 })
  await openAttendance.click()

  const sourceSwitch = screen.getByRole('switch', { name: 'Lihat Data Sumber' })

  await expect(sourceSwitch).toBeVisible({ timeout: 30000 })
  await app.screenshot('attendance-source-view-overrides')

  await sourceSwitch.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await app.screenshot('attendance-source-view-raw')

  await expect(screen.getByText(/Mode hanya baca/i)).toBeVisible({ timeout: 10000 })
  await expect(screen.getByText('Import Excel', { exact: true })).toHaveCount(0)
  await expect(screen.getByText(/Bulk Action Mode/i)).toHaveCount(0)
  await expect(screen.getByRole('button', { name: /Save Attendance/i })).toHaveCount(0)

  const monthInput = screen.getByLabel('Pilih bulan')
  await expect(monthInput).toBeVisible({ timeout: 10000 })
  const selectedMonth = await monthInput.inputValue()
  await monthInput.fill(selectedMonth)
  await expect(screen.getByText(/Data sumber attendance/i)).toBeVisible({ timeout: 10000 })

  await sourceSwitch.click()
  await new Promise((resolve) => setTimeout(resolve, 500))
  await expect(sourceSwitch).toBeVisible({ timeout: 10000 })
})

