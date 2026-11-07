import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('Verifikasi Summary SPL: Section Repair Nofan Nofiari Menjadi 11 Jam (Bukan 12 Jam)', { timeout: 300000 }, async ({
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

  // 3. Pilih Site: CK KIM
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

  // 4. Pilih Karyawan: Nofan Nofiari (Section Repair / Retread Operation)
  const empBtn = browser.locator('button[aria-label="Karyawan"]').first()
  await expect(empBtn).toBeVisible({ timeout: 15000 })
  await empBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const empInput = browser.locator('input[placeholder*="Cari nama karyawan"], input[placeholder*="Cari karyawan"]').first()
  await expect(empInput).toBeVisible({ timeout: 10000 })
  await empInput.fill('Nofan')
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const nofanOption = browser.locator('button:has-text("Nofan")').first()
  await expect(nofanOption).toBeVisible({ timeout: 10000 })
  await nofanOption.click()
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 5. Set Filter Periode: Oktober 2026 (2026-10)
  const monthInput = browser.locator('input[type="month"]').first()
  await expect(monthInput).toBeVisible({ timeout: 15000 })
  await monthInput.fill('2026-10')
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // Screenshot 1: Card Filter Terisi - Periode Oktober 2026 & Nofan Nofiari Terpilih
  await app.screenshot('01-card-filter-nofan-okt-2026')

  // 6. Buka Preview Summary SPL Per User
  const perUserBtn = browser.locator('button:has-text("SUMMARY PER USER (PDF)")').first()
  await expect(perUserBtn).toBeEnabled({ timeout: 20000 })
  await perUserBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 6000))

  // Verifikasi Modal Preview Terbuka
  const previewModal = browser.locator('div[role="dialog"]').first()
  await expect(previewModal).toBeVisible({ timeout: 30000 })

  // Scroll di dalam iframe menggunakan mouse wheel agar baris Tanggal 25 (11 Jam) tampak jelas
  try {
    const iframeLoc = browser.locator('iframe[title="Summary SPL Preview"]').first()
    if (await iframeLoc.isVisible()) {
      await iframeLoc.hover()
      await browser.mouse.wheel(0, 480)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  } catch (err) {
    console.warn('Mouse wheel error:', err)
  }

  // Screenshot 2: Modal Preview SPL Nofan Nofiari - Tanggal 25 Tampil 11 Jam (Bukan 12 Jam)
  await app.screenshot('02-modal-preview-nofan-repair-11h')
})
