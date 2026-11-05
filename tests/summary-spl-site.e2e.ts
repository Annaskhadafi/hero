import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Tombol dan Fitur Download Summary SPL Per Site', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dan masuk ke /dashboard/overtime-requests
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/overtime-requests',
  })

  // Tunggu tabel dan card summary muncul
  const siteSummaryBtn = browser.locator('button:has-text("Summary Per Site")').first()
  await siteSummaryBtn.waitFor({ state: 'visible', timeout: 30000 })
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Screenshot 1: Card Rekapitulasi dengan tombol Summary Per User dan Summary Per Site
  await app.screenshot('01-card-summary-spl-with-site-button')

  // 2. Klik tombol "Summary Per Site (PDF)"
  const isBtnDisabled = await siteSummaryBtn.isDisabled().catch(() => false)
  if (isBtnDisabled) {
    const siteSelectTrigger = browser.locator('button[placeholder="Pilih Site..."], button:has-text("Semua Lokasi Site"), button:has-text("Pilih Site")').first()
    if (await siteSelectTrigger.isVisible().catch(() => false)) {
      await siteSelectTrigger.click()
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const bpnItem = browser.locator('[role="option"]:has-text("BALIKPAPAN")').first()
      if (await bpnItem.isVisible().catch(() => false)) {
        await bpnItem.click()
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
    }
  }

  // Screenshot 2: Card dengan tombol aktif
  await app.screenshot('02-summary-spl-site-ready')

  // 3. Klik tombol "Summary Per Site (PDF)" untuk membuka dialog
  await siteSummaryBtn.click()
  
  // Tunggu hingga iframe dokumen termuat
  const previewIframe = browser.locator('iframe[title="Summary SPL Preview"]').first()
  await previewIframe.waitFor({ state: 'visible', timeout: 15000 })
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // 4. Verifikasi toolbar preview modal menampilkan title Summary SPL Per Site
  const previewHeader = browser.locator('div:has-text("Preview Summary SPL Per Site"), h2:has-text("Preview Summary SPL Per Site"), span:has-text("Summary SPL Per Site")').first()
  await expect(previewHeader).toBeVisible({ timeout: 15000 })

  // 5. Verifikasi tombol "Unduh PDF" tersedia di dalam preview toolbar
  const downloadPdfBtn = browser.locator('button:has-text("Unduh PDF")').first()
  await expect(downloadPdfBtn).toBeVisible({ timeout: 10000 })

  // Screenshot 3: Modal Preview Summary SPL Per Site dengan KONTEN A4 NYATA
  await app.screenshot('03-preview-modal-summary-spl-per-site')

  // 6. Tutup modal preview
  await browser.keyboard.press('Escape')
  await new Promise((resolve) => setTimeout(resolve, 1500))
})
