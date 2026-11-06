import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('Verifikasi Summary SPL Per Site: Rekap Tabel Site & Lembar Per Orang (Tanpa Switch, Preview Dahulu, & Layout A4 Rapi)', { timeout: 300000 }, async ({
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

  // Tunggu login dan data table overtime requests selesai ter-load
  await new Promise((resolve) => setTimeout(resolve, 15000))

  // 2. Verifikasi Dedicated Card Summary SPL
  const summaryCard = browser.locator('text=Rekapitulasi & Export Summary SPL').first()
  await expect(summaryCard).toBeVisible({ timeout: 60000 })

  // 3. Verifikasi ketersediaan tombol terpisah tanpa toggle switch:
  // - "REKAP TABEL SITE (PDF)" (Format Master Rekap Tabel Log SPL Site)
  // - "LEMBAR PER ORANG (PDF)" (Format Bundled Multi-A4 Per Karyawan)
  const rekapTabelBtn = browser.locator('button:has-text("REKAP TABEL SITE (PDF)")').first()
  await expect(rekapTabelBtn).toBeVisible({ timeout: 20000 })

  const lembarPerOrangBtn = browser.locator('button:has-text("LEMBAR PER ORANG (PDF)")').first()
  await expect(lembarPerOrangBtn).toBeVisible({ timeout: 20000 })

  // Screenshot 1: Card Toolbar dengan tombol REKAP TABEL SITE (PDF) dan LEMBAR PER ORANG (PDF)
  await app.screenshot('01-card-summary-spl-dual-site-buttons')

  // 4. Klik tombol "REKAP TABEL SITE (PDF)" -> Membuka Preview Rekap Tabel Site (2 Hal)
  await rekapTabelBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 5000))

  // Verifikasi Modal Preview Terbuka
  const previewModal = browser.locator('div[role="dialog"]').first()
  await expect(previewModal).toBeVisible({ timeout: 30000 })

  // Verifikasi Header Modal memuat judul Rekap Tabel Site
  const tableTitle = browser.locator('div[role="dialog"] span:has-text("Rekap Tabel Site")').first()
  await expect(tableTitle).toBeVisible({ timeout: 30000 })

  // Verifikasi Tombol Unduh PDF siap digunakan
  const unduhBtn = browser.locator('div[role="dialog"] button:has-text("Unduh PDF")').first()
  await expect(unduhBtn).toBeVisible({ timeout: 15000 })

  // Screenshot 2: Modal Preview Format Rekap Tabel Site (Master Log)
  await app.screenshot('02-modal-preview-rekap-tabel-site')

  // 5. Uji Segmented Pill di Header Preview: Klik tab "Lembar Per Orang" di dalam modal
  const tabLembarPerOrang = browser.locator('div[role="dialog"] button:has-text("Lembar Per Orang")').first()
  await expect(tabLembarPerOrang).toBeVisible({ timeout: 15000 })
  await tabLembarPerOrang.click()
  await new Promise((resolve) => setTimeout(resolve, 5000))

  // Verifikasi header beralih ke "Lembar Per Orang Multi-A4"
  const bundledTitle = browser.locator('div[role="dialog"] span:has-text("Lembar Per Orang Multi-A4")').first()
  await expect(bundledTitle).toBeVisible({ timeout: 15000 })

  // Screenshot 3: Modal Preview Format Lembar Per Orang Multi-A4 (Indonesian day names, pastel amber, signatures rapi)
  await app.screenshot('03-modal-preview-lembar-per-orang-multi-a4')
})
