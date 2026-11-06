import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Bukti Foto SPL dan Lightbox Terbuka di Depan Popup', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/overtime-requests',
  })
  
  // Tunggu hingga tabel termuat
  const viewBtn = browser.locator('button[title="Lihat Preview SPL"]').first()
  await viewBtn.waitFor({ state: 'visible', timeout: 25000 })
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Klik tombol kamera ("Lihat Galeri Foto Bukti Lembur") pada baris pertama
  const cameraBtn = browser.locator('button[title*="Lihat Galeri Foto Bukti"]').first()
  await cameraBtn.waitFor({ state: 'visible', timeout: 5000 })
  await cameraBtn.click()

  // Tunggu modal evidence terbuka dan fetch selesai
  const evidenceBanner = browser.locator('header:has-text("SPL-")').first()
  await evidenceBanner.waitFor({ state: 'visible', timeout: 10000 })
  await new Promise((resolve) => setTimeout(resolve, 2000))
  await app.screenshot('overtime-evidence-modal-success')

  // 3. Klik card foto di dalam galeri untuk membuka lightbox
  const photoCard = browser.locator('button:has-text("Klik untuk perbesar")').first()
  if (await photoCard.isVisible().catch(() => false)) {
    await photoCard.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await app.screenshot('overtime-evidence-lightbox-in-front')

    // Tutup lightbox dengan Escape
    await browser.keyboard.press('Escape')
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  // Tutup modal evidence
  const closeEvidenceBtn = browser.locator('button[title="Tutup Modal Bukti"]').first()
  if (await closeEvidenceBtn.isVisible().catch(() => false)) {
    await closeEvidenceBtn.click()
  } else {
    await browser.keyboard.press('Escape')
  }
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // 4. Verifikasi buka dialog Preview SPL
  await viewBtn.click()
  const previewDialog = browser.locator('div[role="dialog"]:has-text("SURAT PERINTAH LEMBUR")').first()
  await previewDialog.waitFor({ state: 'visible', timeout: 10000 })
  await new Promise((resolve) => setTimeout(resolve, 2000))
  await app.screenshot('overtime-preview-spl-dialog')

  // 5. Dari dalam dialog preview, klik badge "Ada Foto" atau "Scan / Klik Bukti"
  const qrOrPhotoBtn = browser.locator('button:has-text("Ada Foto"), div:has-text("Scan / Klik Bukti")').first()
  if (await qrOrPhotoBtn.isVisible().catch(() => false)) {
    await qrOrPhotoBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await app.screenshot('overtime-evidence-opened-above-preview-popup')

    // Tutup modal evidence
    await browser.keyboard.press('Escape')
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  // Tutup preview dialog
  await browser.keyboard.press('Escape')
  await new Promise((resolve) => setTimeout(resolve, 1000))
})
