import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('mobile SOP/WIN search and PDF preview', async ({ app, screen, browser }) => {
  await browser.setViewport({ width: 390, height: 844 })
  await loginToHero(app, screen, browser, '/mobile/sop-win')
  await app.open('/mobile/sop-win')
  const search = browser.locator('input[placeholder*="Cari nomor dokumen"]')
  await expect(search).toBeVisible({ timeout: 60000 })
  await search.fill('WIN')
  const openPdf = browser.locator('button:has-text("Buka PDF")').first()
  await expect(openPdf).toBeVisible({ timeout: 30000 })
  await openPdf.click()
  await expect(browser.locator('[role="dialog"] canvas[data-rendered="true"]').first()).toBeVisible({ timeout: 60000 })
  await app.screenshot('sop-win-mobile-pdf-preview')
  await browser.locator('[role="dialog"] button[title="Halaman Berikutnya"]').click()
  await expect(browser.locator('[role="dialog"] [data-page-number="2"] canvas[data-rendered="true"]').first()).toBeVisible({ timeout: 60000 })
  await app.screenshot('sop-win-mobile-next-page')
})
