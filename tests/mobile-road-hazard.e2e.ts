import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('mobile road hazard AI: in-vehicle dashcam mode with live map widget and snapshot reel', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials (71261 / Chitra#71261)
  await loginToHero(app, screen, browser, '/mobile/hse/road-hazard')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Open /mobile/hse/road-hazard
  await app.open('/mobile/hse/road-hazard')
  await new Promise((resolve) => setTimeout(resolve, 3500))
  await expect(browser.locator('body')).toBeVisible()

  // 3. Verify Header Title and Live AI Badge
  await expect(browser.locator('text=Road Hazard AI & Record').first()).toBeVisible()
  await expect(browser.locator('text=HSE & SAFETY AI').first()).toBeVisible()

  // 4. Verify Map is Closed by Default (Full Camera View)
  await expect(browser.locator('button[title*="Tampilkan Peta"], button[title*="Kamera Penuh"]').first()).toBeVisible()
  await app.screenshot('mobile-road-hazard-default-map-closed')

  // 5. Verify Speedometer & GPS HUD
  await expect(browser.locator('text=km/h').first()).toBeVisible()

  // 6. Verify Layout mode switcher buttons (Split, PiP, Cam, Map)
  await expect(browser.locator('button[title*="Split Mode"]').first()).toBeVisible()
  await expect(browser.locator('button[title*="PiP Mode"]').first()).toBeVisible()

  // 7. Verify Default Offline Mode with roadchitra.tflite, 30 FPS, & Download Banner
  const multiModeBtn = browser.locator('button[title*="Mode:"]').first()
  await expect(browser.locator('text=DEVICE').first()).toBeVisible()
  await expect(browser.locator('text=roadchitra').first()).toBeVisible()
  await expect(browser.locator('text=30 FPS').first()).toBeVisible()
  await app.screenshot('mobile-road-hazard-device-offline-default')

  // Verify Download Banner or Action for roadchitra.tflite
  const downloadBtn = browser.locator('button:has-text("Unduh roadchitra.tflite"), button:has-text("roadchitra.tflite")').first()
  if (await downloadBtn.isVisible()) {
    await app.screenshot('mobile-road-hazard-download-prompt')
    await downloadBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await app.screenshot('mobile-road-hazard-download-complete')
  }

  // Cycle to Server ONNX (roadchitra.onnx)
  await multiModeBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 800))
  await expect(browser.locator('text=ONNX').first()).toBeVisible()
  await expect(browser.locator('text=roadchitra').first()).toBeVisible()
  await app.screenshot('mobile-road-hazard-server-onnx-mode')

  // Cycle to Cloud API
  await multiModeBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 800))
  await expect(browser.locator('text=API').first()).toBeVisible()
  await app.screenshot('mobile-road-hazard-cloud-api-mode')

  // Cycle back to Device Offline
  await multiModeBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 800))
  await expect(browser.locator('text=DEVICE').first()).toBeVisible()
  await app.screenshot('mobile-road-hazard-device-offline-mode')

  // 8. Open Split Mode (Camera Top + OpenStreetMap Widget Bottom)
  const openSplitBtn = browser.locator('button[title*="Split Mode"]').first()
  await openSplitBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await expect(browser.locator('text=Live Route Map').first()).toBeVisible()
  await app.screenshot('mobile-road-hazard-live-split-map')

  // 9. Test PiP mode toggle & Fullscreen Dashcam
  const pipBtn = browser.locator('button[title*="PiP Mode"]').first()
  await pipBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await expect(browser.locator('text=PETA').first()).toBeVisible()
  await app.screenshot('mobile-road-hazard-pip-mode')

  // Test Fullscreen Dashcam toggle
  const fsBtn = browser.locator('button[title*="Fullscreen Dashcam"], button[title*="Layar Penuh"]').first()
  await fsBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Verify KEMBALI button is visible in Fullscreen mode
  await expect(browser.locator('button:has-text("KEMBALI")').first()).toBeVisible()
  await app.screenshot('mobile-road-hazard-fullscreen-dashcam')

  // Exit fullscreen via KEMBALI button
  const exitFsBtn = browser.locator('button:has-text("KEMBALI")').first()
  await exitFsBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Switch back to split mode
  const splitBtn = browser.locator('button[title*="Split Mode"]').first()
  await splitBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 10. Switch to Rekap Tab
  const rekapTabBtn = browser.locator('button:has-text("Rekap")').first()
  await rekapTabBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Verify KPI Cards & Actions (PDF, Excel, WhatsApp, Reset)
  await expect(browser.locator('text=Rekapitulasi Trip').first()).toBeVisible()
  await expect(browser.locator('text=Titik bahaya terdeteksi').first()).toBeVisible()
  await expect(browser.locator('text=Potensi rusak ban').first()).toBeVisible()
  await expect(browser.locator('button:has-text("PDF")').first()).toBeVisible()
  await expect(browser.locator('button:has-text("Excel")').first()).toBeVisible()
  await expect(browser.locator('button:has-text("Share WA")').first()).toBeVisible()
  await expect(browser.locator('button:has-text("Sesi Baru")').first()).toBeVisible()

  // Screenshot of Recap Screen
  await app.screenshot('mobile-road-hazard-recap-screen')

  // 11. Switch to Riwayat Tab
  const riwayatTabBtn = browser.locator('button:has-text("Riwayat")').first()
  await riwayatTabBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Verify History Search Input
  await expect(browser.locator('input[placeholder*="Cari kode sesi"]').first()).toBeVisible()

  // Screenshot of History Screen
  await app.screenshot('mobile-road-hazard-history-screen')
})
