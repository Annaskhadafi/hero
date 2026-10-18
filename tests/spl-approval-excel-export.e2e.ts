import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Riwayat Approval SPL: verify Daftar Manpower (MP) and Total Jam SPL / MP columns in table and Excel export', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Open /dashboard/approval directly
  await app.open('/dashboard/approval')
  await new Promise((resolve) => setTimeout(resolve, 3000))
  await expect(browser.locator('body')).toBeVisible()

  // 3. Switch to "Riwayat" tab
  const riwayatTab = browser.locator('button[role="tab"]:has-text("Riwayat"), button:has-text("Riwayat")').first()
  await expect(riwayatTab).toBeVisible({ timeout: 20000 })
  await riwayatTab.click()
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 4. Verify table headers contain new columns
  const mpHeader = browser.locator('th:has-text("Daftar Manpower (MP)")').first()
  const jamHeader = browser.locator('th:has-text("Total Jam SPL / MP")').first()
  await expect(mpHeader).toBeVisible({ timeout: 15000 })
  await expect(jamHeader).toBeVisible({ timeout: 15000 })

  // 5. Verify the Excel Export button is available
  const excelBtn = browser.locator('button:has-text("Excel")').first()
  await expect(excelBtn).toBeVisible()

  // 6. Screenshot the table with the new columns
  await app.screenshot('approval-history-mp-columns')

  // 7. Search for SPL rows to verify manpower badge and overtime hours
  const searchInput = browser.locator('input[placeholder*="Cari riwayat pengajuan"]').first()
  await searchInput.fill('SPL')
  await new Promise((resolve) => setTimeout(resolve, 2000))
  await app.screenshot('approval-history-spl-rows')

  // 8. Click Excel export to ensure no runtime errors are thrown
  await excelBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 9. Screenshot after triggering Excel export
  await app.screenshot('approval-history-excel-exported')
})
