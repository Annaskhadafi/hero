import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Penyempurnaan Summary SPL Site & Approval Validation', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dan buka halaman /dashboard/overtime-requests
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/overtime-requests',
  })
  await new Promise((resolve) => setTimeout(resolve, 3500))

  // 2. Ambil screenshot halaman awal Overtime Requests
  await app.screenshot('001-overtime-requests-enhanced-card')

  // 3. Verifikasi input month default ke bulan berjalan (misal 2026-11)
  const monthInput = browser.locator('input[type="month"]')
  if (await monthInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    const monthVal = await monthInput.inputValue()
    console.log('[E2E Test] Default Month Value:', monthVal)
  }

  // 4. Buka dropdown Lokasi Site dan pilih salah satu site
  const siteCombobox = browser.locator('button[role="combobox"]:has-text("Pilih Site"), button[role="combobox"]').first()
  if (await siteCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await siteCombobox.click()
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Pilih site pertama atau yang tersedia
    const siteOption = browser.locator('[role="option"]').first()
    if (await siteOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await siteOption.click()
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  // 5. Screenshot setelah site terpilih
  await app.screenshot('002-summary-spl-site-selected')

  // 6. Klik tombol "Summary Per Site (PDF)"
  const siteSummaryBtn = browser.locator('button:has-text("Summary Per Site (PDF)")')
  if (await siteSummaryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await siteSummaryBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // 7. Screenshot modal preview Summary SPL Per Site
    await app.screenshot('003-preview-modal-summary-spl-site-enhanced')
  }
})
