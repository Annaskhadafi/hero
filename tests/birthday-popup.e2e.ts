import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('birthday celebration popup shows personalized self greeting and colleague announcements', { timeout: 240_000 }, async ({ app, browser, screen }) => {
  // 1. Login dengan kredensial standar ke HERO
  await loginToHero(app, screen, browser, '/dashboard/profile')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2. Skenario Bintang Utama (User yang berulang tahun hari ini)
  await browser.evaluate(() => {
    window.location.href = '/dashboard/profile?preview_birthday=self'
  })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Verifikasi popup perayaan ulang tahun diri sendiri
  const modal = browser.locator('[data-testid="birthday-celebration-modal"]')
  await expect(modal).toBeVisible({ timeout: 25_000 })
  await expect(browser.locator('text=Selamat Ulang Tahun!')).toBeVisible()
  await expect(browser.locator('text=Special Birthday Celebration')).toBeVisible()

  // Ambil screenshot bukti visual perayaan personal
  await app.screenshot('birthday-popup-self-celebration')

  // Klik tombol Terima Kasih
  const thankYouBtn = browser.locator('button:has-text("Terima Kasih Banyak! 🎉")').first()
  if (await thankYouBtn.isVisible()) {
    await thankYouBtn.click()
  }
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 3. Skenario Rekan Kerja Se-Lokasi Berulang Tahun
  await browser.evaluate(() => {
    window.location.href = '/dashboard/profile?preview_birthday=colleagues'
  })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Verifikasi popup rekan se-lokasi muncul
  await expect(modal).toBeVisible({ timeout: 25_000 })
  await expect(browser.locator('text=Rekan Kita Berulang Tahun Hari Ini! 🎂')).toBeVisible()
  await expect(browser.locator('text=Ahmad Fauzi')).toBeVisible()
  await expect(browser.locator('text=Siti Rahmawati')).toBeVisible()

  // Ambil screenshot bukti visual perayaan rekan kerja se-lokasi
  await app.screenshot('birthday-popup-colleagues-celebration')

  // Klik tombol Tutup
  const closeBtn = browser.locator('button:has-text("Tutup / Mengerti")').first()
  if (await closeBtn.isVisible()) {
    await closeBtn.click()
  }
  await new Promise((resolve) => setTimeout(resolve, 1500))
})

