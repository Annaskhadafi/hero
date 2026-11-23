import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('mobile birthday celebration popup shows personalized self greeting and coworker announcements', { timeout: 240_000 }, async ({ app, browser, screen }) => {
  // 1. Atur viewport ke ukuran smartphone (iPhone 390x844) sebelum navigasi
  await browser.setViewport({ width: 390, height: 844 })

  // 2. Login dengan kredensial standar ke HERO Mobile
  await loginToHero(app, screen, browser, '/mobile/profile?preview_birthday=self')
  await app.open('/mobile/profile?preview_birthday=self')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 3. Verifikasi popup perayaan personal di Mobile
  const modal = browser.locator('[data-testid="birthday-celebration-modal"]')
  await expect(modal).toBeVisible({ timeout: 25_000 })
  await expect(browser.locator('text=Selamat Ulang Tahun!')).toBeVisible()

  // Ambil screenshot bukti visual perayaan personal Mobile
  await app.screenshot('003-birthday-popup-mobile-self')

  // Klik tombol Terima Kasih di Mobile
  const thankYouBtn = browser.locator('button:has-text("Terima Kasih Banyak! 🎉")').first()
  if (await thankYouBtn.isVisible()) {
    await thankYouBtn.click()
  }
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 4. Skenario Mobile Rekan Kerja Se-Lokasi di Halaman Mobile Notifications
  await app.open('/mobile/notifications?preview_birthday=colleagues')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Verifikasi popup rekan kerja muncul di Mobile
  await expect(modal).toBeVisible({ timeout: 25_000 })
  await expect(browser.locator('text=Rekan Kita Berulang Tahun Hari Ini! 🎂')).toBeVisible()
  await expect(browser.locator('text=Ahmad Fauzi')).toBeVisible()

  // Ambil screenshot bukti visual rekan kerja di Mobile
  await app.screenshot('004-birthday-popup-mobile-colleagues')

  // Klik tombol Tutup di Mobile
  const closeBtn = browser.locator('button:has-text("Tutup / Mengerti")').first()
  if (await closeBtn.isVisible()) {
    await closeBtn.click()
  }
  await new Promise((resolve) => setTimeout(resolve, 1500))
})
