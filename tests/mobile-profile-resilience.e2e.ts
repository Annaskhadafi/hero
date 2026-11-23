import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('mobile profile page loads cleanly without React error 441 and displays employee profile', { timeout: 240_000 }, async ({ app, browser, screen }) => {
  // 1. Atur viewport ke ukuran smartphone (iPhone 390x844)
  await browser.setViewport({ width: 390, height: 844 })

  // 2. Login dengan kredensial standar dan buka halaman mobile profile
  await loginToHero(app, screen, browser, '/mobile/profile')
  await app.open('/mobile/profile')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 3. Verifikasi halaman profil mobile terbuka sukses tanpa pesan error boundary
  const errorBoundaryTitle1 = browser.locator('text=Gagal memuat profil')
  const errorBoundaryTitle2 = browser.locator('text=Gagal memuat halaman')
  await expect(errorBoundaryTitle1).not.toBeVisible()
  await expect(errorBoundaryTitle2).not.toBeVisible()

  const profileHeader = browser.locator('text=Employee Profile')
  await expect(profileHeader).toBeVisible({ timeout: 20_000 })

  const totalPointsLabel = browser.locator('text=Total Points')
  await expect(totalPointsLabel).toBeVisible()

  // 4. Ambil screenshot bukti visual profil mobile normal & sehat
  await app.screenshot('001-mobile-profile-healthy')
})
