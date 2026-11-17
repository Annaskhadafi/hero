import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('HIRADC Risk Matrix Table in PDF and Detail View', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login to Hero
  await loginToHero(app, screen, browser, '/dashboard/hse/hiradc')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2. Navigate to HIRADC PDF Print Page for entry 412
  await app.open('/print/hiradc-entry/412')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 3. Verify the table is present and row 3 has 3 tahun
  const tableLocator = browser.locator('table:has-text("Kemungkinan")').first()
  await expect(tableLocator).toBeVisible({ timeout: 15000 })
  await expect(browser.locator('text=1 – 12 kali dalam 3 tahun').first()).toBeVisible({ timeout: 10000 })

  await browser.evaluate(() => {
    const el = document.querySelector('table')
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' })
  })
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 4. Capture screenshot of HIRADC PDF page with Risk Matrix table
  await app.screenshot('001-hiradc-pdf-risk-matrix')

  // 5. Navigate to /dashboard/hse/hiradc to check Detail Dialog
  await app.open('/dashboard/hse/hiradc')
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // Click the first "Lihat Detail" button in table to open detail modal
  const viewButton = browser.locator('button[title="Lihat Detail"]').first()
  await viewButton.waitFor({ state: 'visible', timeout: 15000 })
  await viewButton.click()
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Verify table in dialog
  const dialogTable = browser.locator('div[role="dialog"] table:has-text("Kemungkinan")').first()
  await expect(dialogTable).toBeVisible({ timeout: 10000 })
  await expect(browser.locator('div[role="dialog"] :text("1 – 12 kali dalam 3 tahun")').first()).toBeVisible({ timeout: 10000 })

  await browser.evaluate(() => {
    const el = document.querySelector('div[role="dialog"] table')
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' })
  })
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Take screenshot of Detail Modal with Risk Matrix table
  await app.screenshot('002-hiradc-detail-dialog-matrix')
})
