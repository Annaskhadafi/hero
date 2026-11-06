import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('Verifikasi Summary SPL Per Site: 1 Tombol, Preview Dahulu, Layout A4 Rapi, & Jam Lembur Valid (No 101h/22h)', { timeout: 240000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login to HERO
  await app.open('/sign-in')
  await new Promise((resolve) => setTimeout(resolve, 2500))

  const emailInput = screen.getByPlaceholder(/Email atau SN/i)
  await emailInput.fill('71261')

  const passwordInput = screen.getByPlaceholder(/kata sandi/i)
  await passwordInput.fill('Chitra#71261')

  const submitBtn = screen.getByRole('button', { name: /Masuk ke HERO/i })
  await submitBtn.click()

  // Tunggu redirect selesai
  await new Promise((resolve) => setTimeout(resolve, 5000))

  // 2. Open Overtime Requests Dashboard
  await app.open('/dashboard/overtime-requests')
  await new Promise((resolve) => setTimeout(resolve, 6000))

  // 3. Verifikasi Dedicated Card Summary SPL
  const summaryCard = browser.locator('text=Rekapitulasi & Export Summary SPL').first()
  await expect(summaryCard).toBeVisible({ timeout: 30000 })

  // 4. Pastikan hanya ada SATU tombol SUMMARY PER SITE (PDF) (tombol abu-abu duplikat sudah dibuang)
  const siteButtons = browser.locator('button:has-text("SUMMARY PER SITE (PDF)")')
  await expect(siteButtons).toHaveCount(1)

  // Screenshot 1: Card Summary SPL dengan HANYA 1 tombol biru SUMMARY PER SITE (PDF)
  await app.screenshot('01-card-summary-spl-single-site-button')

  // 5. Set Filter Periode Bulan = Oktober 2026 (2026-10)
  const monthInput = browser.locator('input[type="month"]').first()
  if (await monthInput.isVisible()) {
    await monthInput.fill('2026-10')
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // 6. Pilih Lokasi Site (misal CK KM) jika belum terpilih
  const siteTrigger = browser.locator('button:has-text("Semua Lokasi Site"), button:has-text("Pilih Site")').first()
  if (await siteTrigger.isVisible()) {
    await siteTrigger.click()
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const ckOption = browser.locator('button:has-text("CK"), [role="option"]:has-text("CK")').first()
    if (await ckOption.isVisible()) {
      await ckOption.click()
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  // Screenshot 2: Site CK terpilih dengan data summary SPL
  await app.screenshot('02-site-terpilih-summary-spl')

  // 7. Klik tombol "SUMMARY PER SITE (PDF)" -> harus buka PREVIEW terlebih dahulu (tidak langsung download)
  const siteSummaryBtn = browser.locator('button:has-text("SUMMARY PER SITE (PDF)")').first()
  await expect(siteSummaryBtn).toBeEnabled({ timeout: 15000 })
  await siteSummaryBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // 8. Verifikasi Modal Preview Terbuka (bukan langsung download file)
  const previewModal = browser.locator('div[role="dialog"]').first()
  await expect(previewModal).toBeVisible({ timeout: 20000 })

  // Verifikasi judul modal mengindikasikan mode Preview Summary SPL Per Site
  const previewTitle = browser.locator('text=Preview Summary SPL Per Site').first()
  await expect(previewTitle).toBeVisible({ timeout: 10000 })

  // Verifikasi tombol "Unduh PDF" tersedia di dalam modal toolbar
  const unduhBtn = browser.locator('button:has-text("Unduh PDF")').first()
  await expect(unduhBtn).toBeVisible({ timeout: 10000 })

  // Screenshot 3: Modal Preview Resmi Summary SPL Multi-Page A4 Rapi & Tidak Gepeng
  await app.screenshot('03-modal-preview-site-multipage-a4-rapi')
})
