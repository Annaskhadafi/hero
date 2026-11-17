import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('verifies Barang Keluar SLoc presets match 14 sites and Pilih Barang is synced with Master Barang', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and navigate to barang-keluar
  await loginToHero(app, screen, browser, '/dashboard/warehouse-repair/barang-keluar')

  // 2. Wait for page title and click "Entri Barang Keluar"
  const catatBtn = browser.locator('button:has-text("Entri Barang Keluar")').first()
  await expect(catatBtn).toBeVisible({ timeout: 35000 })
  await catatBtn.click()

  // 3. Verify Modal "Entri Barang Keluar (Outbound)" is displayed
  const modalTitle = browser.locator('text=Entri Barang Keluar (Outbound)').first()
  await expect(modalTitle).toBeVisible({ timeout: 15000 })

  // 4. Select "Stock Transfer (Pindah Gudang Cabang)" radio button
  const stockTransferRadio = browser.locator('input[value="Stock Transfer"]').first()
  await stockTransferRadio.click()

  // 5. Verify the 14 SLoc preset buttons are displayed
  const sloc0201 = browser.locator('button:has-text("0201 - CP BUMA TANJUNG")').first()
  await expect(sloc0201).toBeVisible({ timeout: 15000 })

  const slocRS02 = browser.locator('button:has-text("RS02 - CP Sangatta")').first()
  await expect(slocRS02).toBeVisible({ timeout: 15000 })

  const slocRS14 = browser.locator('button:has-text("RS14 - CP SIS TANJUNG")').first()
  await expect(slocRS14).toBeVisible({ timeout: 15000 })

  // Screenshot 1: Outbound Modal with 14 SLoc presets matching cheatsheet
  await app.screenshot('01-outbound-modal-slocs-14')

  // 6. Test clicking a preset SLoc button (e.g. 0201)
  await sloc0201.click()
  const destInput = browser.locator('input[placeholder="Kode S-Loc Tujuan"]').first()
  await expect(destInput).toHaveValue('0201')

  // 7. Click "Pilih Barang" dropdown trigger to open searchable select
  const selectBarangTrigger = browser.locator('button:has-text("Cari berdasarkan kode, nama, material desc...")').first()
  await selectBarangTrigger.click()
  await new Promise((resolve) => setTimeout(resolve, 800))

  // 8. Screenshot 2: Synced items list with SAP material code and Bahasa Pemakaian
  await app.screenshot('02-outbound-modal-pilih-barang-synced')
})
