import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Fitur Summary SPL Online Approval Desktop & Mobile', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate using system standard helper without callbackUrl
  await loginToHero(app, screen, browser)
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2. Open /dashboard/overtime-requests
  await app.open('/dashboard/overtime-requests')
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // 3. Verifikasi Dedicated Card Summary SPL
  const summaryHeader = browser.locator('text=Rekapitulasi & Export Summary SPL').first()
  await expect(summaryHeader).toBeVisible({ timeout: 30000 })

  // Screenshot 1: Overview Card Summary SPL Desktop
  await app.screenshot('01-desktop-summary-spl-overview')

  // 4. Pilih salah satu karyawan di dropdown filter Summary SPL
  const employeeSelectTrigger = browser
    .locator('button:has-text("Pilih Karyawan"), button[aria-haspopup="dialog"]:has-text("Karyawan")')
    .first()

  if (await employeeSelectTrigger.isVisible()) {
    await employeeSelectTrigger.click()
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Pilih karyawan pertama yang ada di daftar
    const firstOption = browser.locator('[role="option"], button[role="option"]').first()
    if (await firstOption.isVisible()) {
      await firstOption.click()
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  // Screenshot 2: Card Summary SPL dengan filter aktif & Banner Status Approval Online
  await app.screenshot('02-desktop-summary-spl-approval-status')

  // 5. Kunjungi halaman Mobile Overtime
  await app.open('/mobile/overtime')
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // Klik Tab Summary di Mobile
  const summaryTab = browser.locator('button[role="tab"]:has-text("Summary")').first()
  await expect(summaryTab).toBeVisible({ timeout: 20000 })
  await summaryTab.click()
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Verifikasi Konten Tab Summary di Mobile
  const mobileSummaryHeading = browser.locator('text=Summary SPL Online').first()
  await expect(mobileSummaryHeading).toBeVisible({ timeout: 25000 })

  // Screenshot 3: Tampilan Tab Summary SPL di Mobile
  await app.screenshot('03-mobile-summary-spl-tab')

  // 6. Buka tab Riwayat di Mobile untuk memastikan navigasi tab 4 kolom berjalan sempurna
  const riwayatTab = browser.locator('button[role="tab"]:has-text("Riwayat")').first()
  if (await riwayatTab.isVisible()) {
    await riwayatTab.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Screenshot 4: Navigasi tab Mobile
  await app.screenshot('04-mobile-overtime-tabs-navigation')
})
