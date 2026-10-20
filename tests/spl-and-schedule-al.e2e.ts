import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi SPL Jam Lembur & Fitur Schedule AL', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO
  await loginToHero(app, screen, browser)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Buka Approval Workbench (/dashboard/approval)
  await app.open('/dashboard/approval')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 3. Tab Riwayat
  const riwayatTab = browser.locator('button[role="tab"]:has-text("Riwayat"), button:has-text("Riwayat")').first()
  await expect(riwayatTab).toBeVisible({ timeout: 20000 })
  await riwayatTab.click()
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 4. Cari SPL-2026-0188 di search input Riwayat
  const searchInput = browser.locator('input[placeholder*="Cari riwayat pengajuan"]').first()
  await expect(searchInput).toBeVisible({ timeout: 15000 })
  await searchInput.fill('0188')
  await new Promise((resolve) => setTimeout(resolve, 2500))

  // 5. Screenshot hasil tabel SPL-2026-0188 (memperlihatkan kolom TOTAL JAM SPL / MP terisi)
  await app.screenshot('spl-0188-jam-lembur-terisi')

  // 6. Buka halaman Schedule V2 langsung
  await app.open('/dashboard/scheduling-timesheet/schedule-v2')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 7. Buka modal Schedule V2
  const viewOrEditBtn = browser.locator('button[aria-label="Lihat schedule"], button[aria-label="Edit schedule"], button:has-text("Aktifkan")').first()
  await expect(viewOrEditBtn).toBeVisible({ timeout: 15000 })
  await viewOrEditBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 8. Screenshot modal Schedule V2 yang memperlihatkan tombol AL di toolbar Paint
  await app.screenshot('schedule-v2-al-paint-button-active')
})
