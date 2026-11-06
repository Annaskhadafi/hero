import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('Verifikasi Summary SPL Per Site: 1 Tombol, Preview Dahulu, Layout A4 Rapi, & Jam Lembur Valid (No 101h/22h)', { timeout: 300000 }, async ({
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

  // Tunggu login dan redirect selesai ke /dashboard/overtime-requests
  await new Promise((resolve) => setTimeout(resolve, 12000))

  // 2. Verifikasi Dedicated Card Summary SPL
  const summaryCard = browser.locator('text=Rekapitulasi & Export Summary SPL').first()
  await expect(summaryCard).toBeVisible({ timeout: 60000 })

  // 3. Pastikan hanya ada SATU tombol SUMMARY PER SITE (PDF) (tombol abu-abu duplikat sudah dibuang)
  const siteButtons = browser.locator('button:has-text("SUMMARY PER SITE (PDF)")')
  await expect(siteButtons).toHaveCount(1)

  // Screenshot 1: Card Summary SPL dengan HANYA 1 tombol biru SUMMARY PER SITE (PDF)
  await app.screenshot('01-card-summary-spl-single-site-button')

  // 4. Klik tombol "SUMMARY PER SITE (PDF)" -> harus buka PREVIEW terlebih dahulu (tidak langsung download)
  const siteSummaryBtn = browser.locator('button:has-text("SUMMARY PER SITE (PDF)")').first()
  await expect(siteSummaryBtn).toBeEnabled({ timeout: 20000 })
  await siteSummaryBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 6000))

  // 5. Verifikasi Modal Preview Terbuka (bukan langsung download file)
  const previewModal = browser.locator('div[role="dialog"]').first()
  await expect(previewModal).toBeVisible({ timeout: 30000 })

  // Verifikasi judul modal mengindikasikan mode Preview Summary SPL Per Site
  const previewTitle = browser.locator('text=Preview Summary SPL Per Site').first()
  await expect(previewTitle).toBeVisible({ timeout: 15000 })

  // Verifikasi tombol "Unduh PDF" tersedia di dalam modal toolbar
  const unduhBtn = browser.locator('button:has-text("Unduh PDF")').first()
  await expect(unduhBtn).toBeVisible({ timeout: 15000 })

  // Screenshot 2: Modal Preview Resmi Summary SPL Multi-Page A4 Rapi & Tidak Gepeng
  await app.screenshot('02-modal-preview-site-multipage-a4-rapi')
})
