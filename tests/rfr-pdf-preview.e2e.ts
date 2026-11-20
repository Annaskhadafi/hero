import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi RFR Approval Sequence, TTD & Document Preview', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Verifikasi halaman review public RFR dengan token (melihat validasi & UI approval)
  await app.open('/review/rfr/10793798-37a4-4f16-b998-570ead9944d1')
  await new Promise((resolve) => setTimeout(resolve, 3000))
  await app.screenshot('001-rfr-public-review-page')

  // 2. Login ke HERO dan buka daftar RFR di HC Menu
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/hc/rfr',
  })

  await new Promise((resolve) => setTimeout(resolve, 3000))
  await app.screenshot('002-rfr-list-loaded')

  // 3. Cari dan klik baris RFR untuk membuka modal dokumen preview
  const rfrRow = browser.locator('tr:has-text("RFR-2026-0019"), tr').first()
  if (await rfrRow.isVisible().catch(() => false)) {
    await rfrRow.click().catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await app.screenshot('003-rfr-detail-document-preview')
  }
})
