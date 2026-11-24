import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('verifies Business Card Scanner dashboard, scan dialog, and document preview modal', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and navigate to /dashboard/business-cards
  await loginToHero(app, screen, browser, '/dashboard/business-cards')

  // 2. Verify page header
  const pageTitle = browser.locator('h1:has-text("Business Card Scanner")').first()
  await expect(pageTitle).toBeVisible({ timeout: 25000 })

  // 3. Verify KPI cards
  const kpiCard = browser.locator('text=Total Kartu Nama').first()
  await expect(kpiCard).toBeVisible({ timeout: 15000 })

  // 4. Verify Scan Button and click to open Scan Dialog
  const scanBtn = browser.locator('button:has-text("Scan Kartu Nama")').first()
  await expect(scanBtn).toBeVisible({ timeout: 15000 })
  await scanBtn.click()

  // 5. Verify Scan Dialog content
  const dialogTitle = browser.locator('text=Scan & Simpan Kartu Nama Expo').first()
  await expect(dialogTitle).toBeVisible({ timeout: 15000 })

  const cameraBtn = browser.locator('button:has-text("Buka Kamera Langsung")').first()
  await expect(cameraBtn).toBeVisible({ timeout: 15000 })

  // Take Screenshot 1: Business card scanner dashboard with scan dialog open
  await app.screenshot('01-business-card-scanner-modal-open')

  // 6. Close scan dialog
  const cancelBtn = browser.locator('button:has-text("Batal")').first()
  await cancelBtn.click()

  // 7. Verify contacts in table and open Document Preview
  const contactName = browser.locator('text="Siti Rahma"').first()
  await expect(contactName).toBeVisible({ timeout: 15000 })

  // Click row eye button to open document preview
  const viewBtn = browser.locator('button:has(svg.lucide-eye)').first()
  await expect(viewBtn).toBeVisible({ timeout: 15000 })
  await viewBtn.click()

  // 8. Verify Document Preview Detail Modal
  const previewModalTitle = browser.locator('h2:has-text("Siti Rahma")').first()
  await expect(previewModalTitle).toBeVisible({ timeout: 15000 })

  const waActionBtn = browser.locator('button:has-text("Chat WhatsApp")').first()
  await expect(waActionBtn).toBeVisible({ timeout: 15000 })

  // Take Screenshot 2: Document preview modal showing original card photo & contact details
  await app.screenshot('02-business-card-detail-preview-modal')
})
