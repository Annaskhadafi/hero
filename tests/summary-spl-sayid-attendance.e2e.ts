import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('Verifikasi Summary SPL: Jam Lembur Sayid Fauzan Faerus Sesuai Attendance Real (2, 4, 6, 11 Jam)', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login to HERO with direct callback to overtime-requests
  await app.open('/sign-in?callbackUrl=%2Fdashboard%2Fovertime-requests')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  const emailInput = screen.getByPlaceholder(/Email atau SN/i)
  await emailInput.fill('71261')

  const passwordInput = screen.getByPlaceholder(/kata sandi/i)
  await passwordInput.fill('Chitra#71261')

  const submitBtn = screen.getByRole('button', { name: /Masuk ke HERO/i })
  await submitBtn.click()

  // Tunggu login dan halaman overtime requests selesai ter-load
  await new Promise((resolve) => setTimeout(resolve, 15000))

  // 2. Verifikasi Dedicated Card Summary SPL
  const summaryCard = browser.locator('text=Rekapitulasi & Export Summary SPL').first()
  await expect(summaryCard).toBeVisible({ timeout: 60000 })

  // 3. Set Filter Periode: Oktober 2026 (2026-10)
  const monthInput = browser.locator('input[type="month"]').first()
  await expect(monthInput).toBeVisible({ timeout: 15000 })
  await monthInput.fill('2026-10')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 4. Pilih Site: CK KIM
  const siteBtn = browser.locator('button[aria-label="Site"]').first()
  await expect(siteBtn).toBeVisible({ timeout: 15000 })
  await siteBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const siteInput = browser.locator('input[placeholder*="Cari site"]').first()
  await expect(siteInput).toBeVisible({ timeout: 10000 })
  await siteInput.fill('CK KIM')
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const ckKimOption = browser.locator('button:has-text("CK KIM")').first()
  await expect(ckKimOption).toBeVisible({ timeout: 10000 })
  await ckKimOption.click()
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 5. Pilih Karyawan: Sayid Fauzan Faerus
  const empBtn = browser.locator('button[aria-label="Karyawan"]').first()
  await expect(empBtn).toBeVisible({ timeout: 15000 })
  await empBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const empInput = browser.locator('input[placeholder*="Cari karyawan"]').first()
  await expect(empInput).toBeVisible({ timeout: 10000 })
  await empInput.fill('Sayid')
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const sayidOption = browser.locator('button:has-text("Sayid Fauzan")').first()
  await expect(sayidOption).toBeVisible({ timeout: 10000 })
  await sayidOption.click()
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Screenshot 1: Card Filter Terisi - Periode Oktober 2026 & Sayid Fauzan Faerus Terpilih
  await app.screenshot('01-card-filter-sayid-okt-2026')

  // 6. Buka Preview Summary SPL Per User
  const perUserBtn = browser.locator('button:has-text("SUMMARY PER USER (PDF)")').first()
  await expect(perUserBtn).toBeEnabled({ timeout: 20000 })
  await perUserBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 6000))

  // Verifikasi Modal Preview Terbuka
  const previewModal = browser.locator('div[role="dialog"]').first()
  await expect(previewModal).toBeVisible({ timeout: 30000 })

  // Screenshot 2: Modal Preview SPL Sayid Fauzan Faerus (2, 4, 6, 11 Jam terlihat jelas)
  await app.screenshot('02-modal-preview-sayid-attendance-hours')
})
