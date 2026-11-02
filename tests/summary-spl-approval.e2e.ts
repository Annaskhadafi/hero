import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Fitur Pilihan Per-Site pada Summary SPL Desktop', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate using system standard credentials
  await loginToHero(app, screen, browser)
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2. Open /dashboard/overtime-requests
  await app.open('/dashboard/overtime-requests')
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // 3. Verifikasi Dedicated Card Summary SPL
  const summaryHeader = browser.locator('text=Rekapitulasi & Export Summary SPL').first()
  await expect(summaryHeader).toBeVisible({ timeout: 30000 })

  // Screenshot 1: Overview Card Summary SPL Desktop dengan filter Site default
  await app.screenshot('01-desktop-summary-spl-overview')

  // 4. Verifikasi & Interaksi Dropdown Pilihan Site
  const siteSelectTrigger = browser
    .locator('button:has-text("Pilih Site"), button[aria-haspopup="dialog"]:has-text("Site")')
    .first()
  await expect(siteSelectTrigger).toBeVisible({ timeout: 15000 })

  await siteSelectTrigger.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Pilih opsi site (misal opsi pertama setelah dialog terbuka)
  const siteOption = browser.locator('[role="option"], button[role="option"]').first()
  if (await siteOption.isVisible()) {
    await siteOption.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Screenshot 2: Pilihan Site Aktif
  await app.screenshot('02-desktop-summary-spl-site-filtered')

  // 5. Verifikasi Cascading Dropdown Karyawan sesuai Site
  const employeeSelectTrigger = browser
    .locator('button:has-text("Pilih Karyawan"), button[aria-haspopup="dialog"]:has-text("Karyawan")')
    .first()
  await expect(employeeSelectTrigger).toBeVisible({ timeout: 15000 })

  await employeeSelectTrigger.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Screenshot 3: Dropdown Karyawan yang tersaring (cascaded) sesuai Site
  await app.screenshot('03-desktop-summary-spl-employee-cascaded')

  // Pilih karyawan spesifik di urutan kedua (bukan 'Semua Karyawan') jika ada
  const employeeOptions = browser.locator('[role="option"], button[role="option"]')
  const count = await employeeOptions.count()
  if (count > 1) {
    await employeeOptions.nth(1).click()
  } else if (count > 0) {
    await employeeOptions.first().click()
  }
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Screenshot 4: Filter Karyawan terpilih & Tombol Preview PDF aktif
  await app.screenshot('04-desktop-summary-spl-employee-selected')

  // 6. Test Tombol Reset Filter
  const resetButton = browser.locator('button:has-text("Reset")').first()
  if (await resetButton.isVisible()) {
    await resetButton.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Screenshot 5: Kondisi setelah Reset Filter
  await app.screenshot('05-desktop-summary-spl-reset')
})
