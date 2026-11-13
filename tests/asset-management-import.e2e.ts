import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('verifies Asset Management Import Excel dialog and mapping interface', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and navigate to central-service/assets
  await loginToHero(app, screen, browser, '/dashboard/central-service/assets')

  // 2. Find and verify the Import button
  const importBtn = browser.locator('button:has-text("Import")').first()
  await expect(importBtn).toBeVisible({ timeout: 25000 })

  // Screenshot 1: Asset Management table with functioning Import button
  await app.screenshot('01-asset-management-table-import-button')

  // 3. Click Import button to open AdminImportDialog
  await importBtn.click()

  // 4. Verify Import Dialog is displayed
  const dialogTitle = browser.locator('text=Import Data Asset Management').first()
  await expect(dialogTitle).toBeVisible({ timeout: 15000 })

  const fileInput = browser.locator('input[type="file"]').first()
  await expect(fileInput).toBeVisible({ timeout: 15000 })

  // Verify key fields in mapping
  const categoryField = browser.locator('text=Kategori Alat (Section)').first()
  await expect(categoryField).toBeVisible({ timeout: 15000 })

  const locationField = browser.locator('text=Lokasi Site').first()
  await expect(locationField).toBeVisible({ timeout: 15000 })

  const descField = browser.locator('text=Deskripsi / Nama Alat').first()
  await expect(descField).toBeVisible({ timeout: 15000 })

  // Screenshot 2: Functional Import Excel Dialog with column mapping and validation
  await app.screenshot('02-asset-management-import-dialog-mapped')
})
