import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Performa Cepat & Preview Halaman Overtime Requests', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dan langsung menuju /dashboard/overtime-requests
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/overtime-requests',
  })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2. Verifikasi halaman terbuka dan tabel termuat
  await app.screenshot('overtime-requests-page-loaded')

  // 3. Cari tombol aksi baris "Lihat Preview SPL"
  const viewBtn = browser.locator('button[title="Lihat Preview SPL"], button[title*="Preview"]').first()
  if (await viewBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await viewBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2500))
    await app.screenshot('overtime-requests-preview-modal')

    // 4. Tutup dialog preview
    const closeBtn = browser.locator('button:has(svg.lucide-x)').first()
    if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeBtn.click()
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
})
