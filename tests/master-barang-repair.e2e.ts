import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('verifies Master Barang Repair items from Bahasa Material and 14 updated Site Codes', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser, '/dashboard/repair-retread/master-barang-repair')

  // 2. Verify page headers and KPI cards
  const title = browser.locator('h1:has-text("Master Barang Repair")').first()
  await expect(title).toBeVisible({ timeout: 35000 })

  const kpiTotal = browser.locator('text=Total Barang').first()
  await expect(kpiTotal).toBeVisible({ timeout: 15000 })

  // 3. Verify materials table contains items loaded from Bahasa Material.xlsx
  const table = browser.locator('table').first()
  await expect(table).toBeVisible({ timeout: 15000 })

  // Verify specific material code from Bahasa Material
  const materialRow = browser.locator('td:has-text("361B170005")').first()
  await expect(materialRow).toBeVisible({ timeout: 15000 })

  // Screenshot 1: Master Barang Repair loaded with Bahasa Material items
  await app.screenshot('01-master-barang-repair-items')

  // 4. Switch to "Site Repair" tab
  const siteTabTrigger = browser.locator('#tab-trigger-sites').first()
  await siteTabTrigger.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Verify the 14 SLoc site codes and descriptions
  const site0201 = browser.locator('td:has-text("CP BUMA TANJUNG")').first()
  await expect(site0201).toBeVisible({ timeout: 15000 })

  const siteRS14 = browser.locator('td:has-text("CP SIS TANJUNG")').first()
  await expect(siteRS14).toBeVisible({ timeout: 15000 })

  const siteRS01 = browser.locator('td:has-text("CP Balikpapan")').first()
  await expect(siteRS01).toBeVisible({ timeout: 15000 })

  // Verify all 14 rows are displayed
  const siteRows = await browser.locator('table tbody tr').count()
  expect(siteRows).toBeGreaterThanOrEqual(14)

  // Screenshot 2: 14 Site Repair codes verified
  await app.screenshot('02-master-barang-repair-sites-14')
})
