import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Karyawan Deri Fahrunia Ferdy Gani Muncul di Monitoring Contract Review', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO
  await loginToHero(app, screen, browser, {
    targetUrl: '/dashboard/hc/contract-review',
  })
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // 2. Klik tab "Monitoring Kontrak"
  const monitoringTab = browser.locator('button:has-text("Monitoring Kontrak"), [role="tab"]:has-text("Monitoring Kontrak")').first()
  await expect(monitoringTab).toBeVisible({ timeout: 20000 })
  await monitoringTab.click()
  await new Promise((resolve) => setTimeout(resolve, 2000))

  await app.screenshot('01-contract-review-monitoring-tab')

  // 3. Cari Deri pada pencarian monitoring kontrak
  const searchInput = browser.locator('input[placeholder*="Cari karyawan"], input[placeholder*="nama, SN"]').first()
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.fill('Deri')
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  // 4. Verifikasi Deri Fahrunia Ferdy Gani tampil di tabel monitoring
  const deriRow = browser.locator('tr:has-text("Deri Fahrunia Ferdy Gani"), div:has-text("Deri Fahrunia Ferdy Gani")').first()
  await expect(deriRow).toBeVisible({ timeout: 15000 })

  await app.screenshot('02-contract-review-deri-found')
})
