import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi CV Popup & Fallback Handler di Recruitment', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dan buka Recruitment Pipeline
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/hc/recruitment?view=pipeline',
  })

  // 2. Tunggu pipeline page termuat
  await new Promise((resolve) => setTimeout(resolve, 3000))
  await app.screenshot('001-recruitment-pipeline-loaded')

  // 3. Cari tombol View CV untuk kandidat di pipeline atau table
  const viewCvBtn = browser.locator('button[title="View CV"]').first()
  await expect(viewCvBtn).toBeVisible({ timeout: 30000 })
  await viewCvBtn.click()

  // 4. Verifikasi CV Dialog terbuka
  const cvDialog = browser.locator('div[role="dialog"]').first()
  await expect(cvDialog).toBeVisible({ timeout: 15000 })
  await new Promise((resolve) => setTimeout(resolve, 2000))
  await app.screenshot('002-recruitment-cv-dialog-active')

  // 5. Tutup dialog
  const closeBtn = browser.locator('div[role="dialog"] button:has-text("Close")').first()
  if (await closeBtn.isVisible()) {
    await closeBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // 6. Buka detail page kandidat Hengki Hariyono (ID: 300) yang sebelumnya mengalami 404
  await browser.goto('http://localhost:3000/dashboard/hc/recruitment/candidates/300')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Buka tab Profile di mana CV / Resume berada
  const profileTab = browser.locator('button[role="tab"]:has-text("Profile")').first()
  if (await profileTab.isVisible()) {
    await profileTab.click()
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  await app.screenshot('003-candidate-hengki-profile-tab')

  // 7. Buka modal CV Hengki Hariyono
  const viewHengkiCvBtn = browser.locator('button:has-text("View CV Document")').first()
  await expect(viewHengkiCvBtn).toBeVisible({ timeout: 15000 })
  await viewHengkiCvBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 3000))
  await app.screenshot('004-hengki-cv-missing-fallback-modal')

  // Verifikasi fallback card muncul: "Berkas CV Tidak Ditemukan (404)" dan tombol upload ada
  const fallbackTitle = browser.locator('text=Berkas CV Tidak Ditemukan (404)').first()
  await expect(fallbackTitle).toBeVisible({ timeout: 15000 })

  await app.screenshot('005-recruitment-cv-fix-verified')
})
