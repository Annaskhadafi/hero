import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Switch Flat Price pada Quotation Form & Preview Dokumen', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO
  await loginToHero(app, screen, browser)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Buka halaman Create Quotation 360-Service
  await app.open('/dashboard/360-service/quotations/create')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 3. Verifikasi Switch "Flat Price" ada di toolbar form options
  const flatPriceSwitch = browser.locator('#switch-flat-price').first()
  await expect(flatPriceSwitch).toBeVisible({ timeout: 20000 })

  // 4. Klik switch Flat Price untuk mengaktifkannya
  await flatPriceSwitch.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 5. Verifikasi switch dalam keadaan checked (aktif)
  const isChecked = await flatPriceSwitch.getAttribute('aria-checked')
  expect(isChecked).toBe('true')

  // 6. Ambil screenshot pertama: Quotation form dengan Switch Flat Price aktif di toolbar
  await app.screenshot('001-quotation-form-flat-price-switch')

  // 7. Buka halaman detail / preview quotation untuk memverifikasi dokumen resmi
  await app.open('/dashboard/360-service/quotations/105')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 8. Verifikasi pratinjau dokumen quotation termuat
  const previewHeading = browser.locator('h1:has-text("Quotation Preview")').first()
  await expect(previewHeading).toBeVisible({ timeout: 15000 })

  // 9. Ambil screenshot kedua: Quotation preview document
  await app.screenshot('002-quotation-preview-flat-price')
})
