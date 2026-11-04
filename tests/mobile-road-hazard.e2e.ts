import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('mobile road hazard AI: in-vehicle dashcam mode with live map widget and snapshot reel', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials (71261 / Chitra#71261)
  await loginToHero(app, screen, browser)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Open /mobile/hse/road-hazard
  await app.open('/mobile/hse/road-hazard')
  await new Promise((resolve) => setTimeout(resolve, 3500))
  await expect(browser.locator('body')).toBeVisible()

  // 3. Verify Header Title and Live AI Badge
  await expect(browser.locator('text=Road Hazard AI & Record').first()).toBeVisible()
  await expect(browser.locator('text=HSE & SAFETY AI').first()).toBeVisible()

  // 4. Verify Live Map Widget presence (OpenStreetMap)
  await expect(browser.locator('text=Live Route Map').first()).toBeVisible()

  // 5. Verify Speedometer & GPS HUD
  await expect(browser.locator('text=km/h').first()).toBeVisible()

  // 6. Verify Layout mode switcher buttons (Split, PiP, Cam, Map)
  await expect(browser.locator('button[title*="Split Mode"]').first()).toBeVisible()
  await expect(browser.locator('button[title*="PiP Mode"]').first()).toBeVisible()

  // 7. Take screenshot of Live Split View (Camera Top + OpenStreetMap Widget Bottom)
  await app.screenshot('mobile-road-hazard-live-split-map')

  // 8. Test PiP mode toggle & Fullscreen Dashcam
  const pipBtn = browser.locator('button[title*="PiP Mode"]').first()
  await pipBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await expect(browser.locator('text=WIDGET MAPS').first()).toBeVisible()
  await app.screenshot('mobile-road-hazard-pip-mode')

  // Test Fullscreen Dashcam toggle
  const fsBtn = browser.locator('button[title*="Fullscreen Dashcam"], button[title*="Layar Penuh"]').first()
  await fsBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await app.screenshot('mobile-road-hazard-fullscreen-dashcam')

  // Exit fullscreen
  const exitFsBtn = browser.locator('button[title*="Keluar Fullscreen"]').first()
  if (await exitFsBtn.count() > 0) {
    await exitFsBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  // Switch back to split mode
  const splitBtn = browser.locator('button[title*="Split Mode"]').first()
  await splitBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 9. Switch to Rekap Tab
  const rekapTabBtn = browser.locator('button:has-text("Rekap")').first()
  await rekapTabBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Verify KPI Cards & Actions
  await expect(browser.locator('text=Rekapitulasi Trip').first()).toBeVisible()
  await expect(browser.locator('text=Titik bahaya terdeteksi').first()).toBeVisible()
  await expect(browser.locator('text=Potensi rusak ban').first()).toBeVisible()
  await expect(browser.locator('button:has-text("Download PDF Resmi")').first()).toBeVisible()
  await expect(browser.locator('button:has-text("Simpan Sesi")').first()).toBeVisible()

  // Screenshot of Recap Screen
  await app.screenshot('mobile-road-hazard-recap-screen')

  // 10. Switch to Riwayat Tab
  const riwayatTabBtn = browser.locator('button:has-text("Riwayat")').first()
  await riwayatTabBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Verify History Search Input
  await expect(browser.locator('input[placeholder*="Cari kode sesi"]').first()).toBeVisible()

  // Screenshot of History Screen
  await app.screenshot('mobile-road-hazard-history-screen')
})
