import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi RFR Attachment & PDF Preview Resilience', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dan buka halaman Dashboard Approval
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/approval',
  })

  await new Promise((resolve) => setTimeout(resolve, 3000))
  await app.screenshot('001-dashboard-approval-loaded')

  // 2. Buka tab atau daftar RFR di HC Menu
  await app.open('/dashboard/hc/rfr')
  await new Promise((resolve) => setTimeout(resolve, 3000))
  await app.screenshot('002-rfr-list-loaded')

  // 3. Jika ada tombol detail / row aksi RFR, klik untuk melihat modal dokumen preview
  const viewDetailBtn = browser.locator('button:has-text("Detail"), button[title*="Lihat"], tr').first()
  if (await viewDetailBtn.isVisible()) {
    await viewDetailBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await app.screenshot('003-rfr-detail-document-preview')
  }
})
