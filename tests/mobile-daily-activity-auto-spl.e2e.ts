import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('verifies Mobile Daily Activity to SPL auto-generation, prefilled modal, and Mobile SPL module linking', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Set mobile viewport (iPhone 12/13/14 dimensions) and authenticate
  await browser.setViewport({ width: 390, height: 844 })
  await loginToHero(app, screen, browser, '/mobile/activity?tab=history')
  await new Promise((resolve) => setTimeout(resolve, 3500))

  // Ensure Riwayat DAR tab is active
  const historyTab = browser.locator('button[role="tab"]:has-text("Riwayat")').first()
  if (await historyTab.isVisible().catch(() => false)) {
    await historyTab.click()
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  // Screenshot 1: Mobile Daily Activity Riwayat Tab
  await app.screenshot('01-mobile-dar-history-tab')

  // 2. Filter to non-draft DARs (DAS-) via search box and expand the first DAR card
  const searchBox = browser.locator('input[placeholder*="Cari nomor DAR"]').first()
  if (await searchBox.isVisible().catch(() => false)) {
    await searchBox.fill('DAS-')
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const submittedOrApprovedSummary = browser
    .locator('details:has-text("DAS-") summary')
    .first()
  await expect(submittedOrApprovedSummary).toBeVisible({ timeout: 15000 })
  await submittedOrApprovedSummary.click()
  await new Promise((resolve) => setTimeout(resolve, 1200))

  // Locate BUAT SPL LEMBUR / BUAT SPL TAMBAHAN button inside the opened DAR card
  const buatSplBtn = browser
    .locator('details[open] button[data-testid^="mobile-buat-spl-"], details[open] button:has-text("BUAT SPL LEMBUR"), details[open] button:has-text("BUAT SPL TAMBAHAN")')
    .first()
  await expect(buatSplBtn).toBeVisible({ timeout: 15000 })

  // Screenshot 2: Expanded Mobile DAR Card showing BUAT SPL button
  await app.screenshot('02-mobile-dar-card-expanded')

  // 3. Click BUAT SPL button to open pre-filled SPL modal
  await buatSplBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const splModal = browser
    .locator('div[role="dialog"]:has-text("Buat SPL Lembur dari Aktivitas Harian")')
    .first()
  await expect(splModal).toBeVisible({ timeout: 15000 })

  const submitSplBtn = browser.locator('button:has-text("Terbitkan & Simpan SPL")').first()
  await expect(submitSplBtn).toBeVisible({ timeout: 10000 })

  // Screenshot 3: Pre-filled SPL Modal on Mobile viewport
  await app.screenshot('03-mobile-spl-prefilled-modal')

  // 4. Submit SPL generation
  await submitSplBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 4000))

  const successHeading = browser.locator('text=Surat Perintah Lembur Berhasil Diterbitkan!').first()
  await expect(successHeading).toBeVisible({ timeout: 20000 })

  // Screenshot 4: Success screen with SPL number & Buka di Modul SPL link
  await app.screenshot('04-mobile-spl-created-success')

  // 5. Navigate to Mobile SPL Module (/mobile/overtime?tab=history&splNumber=...)
  const bukaModulSplBtn = browser.locator('a:has-text("Buka di Modul SPL")').first()
  await expect(bukaModulSplBtn).toBeVisible({ timeout: 10000 })
  await bukaModulSplBtn.click()

  // Wait until /mobile/overtime finishes rendering (no Compiling...)
  const splMobileHeader = browser.locator('h1:has-text("SPL Mobile")').first()
  await expect(splMobileHeader).toBeVisible({ timeout: 25000 })
  const historyHeading = browser.locator('h2:has-text("Riwayat Seluruh SPL")').first()
  await expect(historyHeading).toBeVisible({ timeout: 15000 })
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Screenshot 5: Mobile SPL History filtered to the generated SPL
  await app.screenshot('05-mobile-overtime-spl-linked')
})
