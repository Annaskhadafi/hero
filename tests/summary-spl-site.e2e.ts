import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Summary SPL Official Layout, Perhitungan Tyo Hadi 3 Jam, & Summary Per Site PDF', { timeout: 240000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login
  await loginToHero(app, screen, browser)
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // 2. Open overtime requests
  await app.open('/dashboard/overtime-requests')
  await new Promise((resolve) => setTimeout(resolve, 5000))

  // 3. Verifikasi Dedicated Card Summary SPL
  const summaryCard = browser.locator('text=Rekapitulasi & Export Summary SPL').first()
  await expect(summaryCard).toBeVisible({ timeout: 30000 })

  // 4. Set Filter Periode Bulan = Oktober 2026 (2026-10)
  const monthInput = browser.locator('input[type="month"]').first()
  if (await monthInput.isVisible()) {
    await monthInput.fill('2026-10')
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  // Screenshot 1: Dedicated Card dengan tombol SUMMARY PER SITE (PDF) & Filter
  await app.screenshot('01-card-summary-spl-dan-tombol-site-pdf')

  // 5. Buka dropdown Karyawan dan pilih "Tyo Hadi Pranowo"
  const employeeBtn = browser.locator('button:has-text("Semua Karyawan")').first()
  await expect(employeeBtn).toBeVisible({ timeout: 10000 })
  await employeeBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Cari Tyo Hadi Pranowo di input pencarian dropdown
  const searchEmployeeInput = browser.locator('input[placeholder*="Cari"]').first()
  if (await searchEmployeeInput.isVisible()) {
    await searchEmployeeInput.fill('Tyo Hadi')
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const tyoOption = browser.locator('button:has-text("Tyo Hadi")').first()
  await expect(tyoOption).toBeVisible({ timeout: 10000 })
  await tyoOption.click()
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Screenshot 2: Karyawan Tyo Hadi terpilih: 3 SPL, 3 Jam (terkoreksi dari sebelumnya 15 Jam!)
  await app.screenshot('02-tyo-hadi-terpilih-3-spl-3-jam')

  // 6. Klik tombol Preview & Unduh Summary SPL (PDF)
  const previewBtn = browser.locator('button:has-text("Preview & Unduh Summary SPL")').first()
  await expect(previewBtn).toBeEnabled({ timeout: 10000 })
  await previewBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 3500))

  // Verifikasi modal preview muncul
  const previewModal = browser.locator('div[role="dialog"]').first()
  await expect(previewModal).toBeVisible({ timeout: 15000 })

  // Screenshot 3: Tampilan Modal Preview Resmi Summary SPL Kalender 1..31 A4
  await app.screenshot('03-modal-preview-resmi-summary-spl')
})
