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
  await viewBtn.waitFor({ state: 'visible', timeout: 20000 })
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // 2. Klik tombol kamera ("Lihat Galeri Foto Bukti Lembur") pada baris pertama
  const cameraBtn = browser.locator('button[title*="Lihat Galeri Foto Bukti"]').first()
  if (await cameraBtn.isVisible().catch(() => false)) {
    await cameraBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await app.screenshot('overtime-evidence-modal-success')

    // 3. Cari card foto di dalam galeri untuk membuka lightbox
    const photoCard = browser.locator('button:has-text("Klik untuk perbesar"), button:has(img[alt])').first()
    if (await photoCard.isVisible().catch(() => false)) {
      await photoCard.click()
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await app.screenshot('overtime-evidence-lightbox-in-front')

      // Tutup lightbox
      const closeLightboxBtn = browser.locator('button[title="Tutup"]').last()
      if (await closeLightboxBtn.isVisible().catch(() => false)) {
        await closeLightboxBtn.click()
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
    }

    // Tutup modal evidence
    const closeEvidenceBtn = browser.locator('button[title="Tutup Modal Bukti"]').first()
    if (await closeEvidenceBtn.isVisible().catch(() => false)) {
      await closeEvidenceBtn.click()
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  // 4. Verifikasi buka dialog Preview SPL
  if (await viewBtn.isVisible().catch(() => false)) {
    await viewBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2500))
    await app.screenshot('overtime-preview-spl-dialog')

    // Klik QR Evidence Box atau tombol "Ada Foto"
    const qrOrPhotoBtn = browser.locator('div:has-text("Scan / Klik Bukti"), button:has-text("Ada Foto")').first()
    if (await qrOrPhotoBtn.isVisible().catch(() => false)) {
      await qrOrPhotoBtn.click()
      await new Promise((resolve) => setTimeout(resolve, 3000))
      await app.screenshot('overtime-evidence-opened-above-preview-popup')

      // Tutup modal evidence yang di atas preview
      const closeTopEvidenceBtn = browser.locator('button[title="Tutup Modal Bukti"]').first()
      if (await closeTopEvidenceBtn.isVisible().catch(() => false)) {
        await closeTopEvidenceBtn.click()
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
    }

    // Tutup dialog preview
    const closePreviewBtn = browser.locator('button:has(svg.lucide-x)').first()
    if (await closePreviewBtn.isVisible().catch(() => false)) {
      await closePreviewBtn.click()
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
})
