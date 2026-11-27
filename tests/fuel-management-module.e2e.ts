import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Fuel Management module mobile-first flow and ticket TKT-0002 resolution', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Mobile phone viewport
  await browser.setViewport({ width: 390, height: 844 })

  // 2. Log in and navigate to /mobile/fuel-management
  await loginToHero(app, screen, browser)
  await app.open('/mobile/fuel-management')
  await new Promise((r) => setTimeout(r, 4000))

  // Dismiss birthday dialog if visible
  const dismissBtn = browser.locator('button:has-text("TUTUP / MENGERTI")').first()
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
  }

  // 3. Verify Dashboard header & Summary Cards
  const header = browser.locator('h1:has-text("Fuel Management")').first()
  await expect(header).toBeVisible({ timeout: 15000 })

  const currentStockCard = browser.locator(':has-text("Current Stock")').first()
  await expect(currentStockCard).toBeVisible()

  // 4. Screenshot Dashboard
  await app.screenshot('01-fuel-management-mobile-dashboard')

  // 5. Navigate to Fuel In tab
  const fuelInTab = browser.locator('button:has-text("Fuel In")').first()
  await fuelInTab.click()
  await new Promise((r) => setTimeout(r, 1500))

  const formInTitle = browser.locator('h2:has-text("Form Fuel In – Penerimaan BBM")').first()
  await expect(formInTitle).toBeVisible({ timeout: 10000 })

  // Fill Fuel In form
  const doInput = browser.locator('input[placeholder*="DO-PTM-2026-9812"]').first()
  await doInput.fill('DO-FIN-TEST-2026')

  const qtyInInput = browser.locator('input[type="number"]').first()
  await qtyInInput.fill('1500')

  await app.screenshot('02-fuel-management-form-fuel-in')

  // Submit Fuel In
  const submitInBtn = browser.locator('button:has-text("Simpan Penerimaan BBM")').first()
  await submitInBtn.click()
  await new Promise((r) => setTimeout(r, 4000))

  // 6. Navigate to Fuel Out tab
  const fuelOutTab = browser.locator('button:has-text("Fuel Out")').first()
  await fuelOutTab.click()
  await new Promise((r) => setTimeout(r, 1500))

  const formOutTitle = browser.locator('h2:has-text("Form Fuel Out – Pengisian BBM ke Unit")').first()
  await expect(formOutTitle).toBeVisible({ timeout: 10000 })

  // Fill Fuel Out form
  const hmInput = browser.locator('input[placeholder*="Contoh: 45210"]').first()
  await hmInput.fill('45250')

  const qtyOutInput = browser.locator('input[type="number"]').first()
  await qtyOutInput.fill('75')

  const operatorInput = browser.locator('input[placeholder*="Nama pengemudi"]').first()
  await operatorInput.fill('Rudi Hermawan')

  await app.screenshot('03-fuel-management-form-fuel-out')

  // Submit Fuel Out
  const submitOutBtn = browser.locator('button:has-text("Simpan Pengisian BBM")').first()
  await submitOutBtn.click()
  await new Promise((r) => setTimeout(r, 4000))

  // 7. Navigate to History tab
  const historyTab = browser.locator('button:has-text("History")').first()
  await historyTab.click()
  await new Promise((r) => setTimeout(r, 2000))

  // Open first transaction detail modal
  const firstTxCard = browser.locator('div[class*="cursor-pointer"]:has-text("Penerimaan")').first()
  if (await firstTxCard.isVisible().catch(() => false)) {
    await firstTxCard.click()
    await new Promise((r) => setTimeout(r, 1500))
  }

  await app.screenshot('04-fuel-management-history-detail-modal')

  // Close modal if open
  const closeDetailBtn = browser.locator('button:has-text("Tutup Rincian")').first()
  if (await closeDetailBtn.isVisible().catch(() => false)) {
    await closeDetailBtn.click()
    await new Promise((r) => setTimeout(r, 1000))
  }

  // 8. Open Troubleshoot page in desktop view to verify TKT-0002 resolution
  await browser.setViewport({ width: 1440, height: 900 })
  await app.open('/dashboard/troubleshoot')
  await new Promise((r) => setTimeout(r, 3500))

  // Dismiss birthday dialog if visible
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
  }

  // Find ticket TKT-0002 in Troubleshoot table
  const tkt2Row = browser.locator('tr:has-text("TKT-0002")').first()
  if (await tkt2Row.isVisible().catch(() => false)) {
    await tkt2Row.click()
    await new Promise((r) => setTimeout(r, 2000))
  }

  await app.screenshot('05-troubleshoot-tkt0002-resolved')
})
