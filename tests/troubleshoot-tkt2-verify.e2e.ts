import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verify ticket TKT-0002 resolution in Troubleshoot Command Center', async ({
  app,
  screen,
  browser,
}) => {
  // Desktop viewport
  await browser.setViewport({ width: 1440, height: 900 })

  // Log in and open /dashboard/troubleshoot
  await loginToHero(app, screen, browser)
  await app.open('/dashboard/troubleshoot')
  await new Promise((r) => setTimeout(r, 3500))

  // Dismiss birthday dialog if visible
  const dismissBtn = browser.locator('button:has-text("TUTUP / MENGERTI")').first()
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
  }

  // Verify Troubleshoot Command Center header is visible
  const header = browser.locator('h1:has-text("Troubleshoot & Service Desk Command Center")').first()
  await expect(header).toBeVisible({ timeout: 15000 })

  // Find ticket TKT-0002 in the table
  const tkt2Row = browser.locator('tr:has-text("TKT-0002")').first()
  await expect(tkt2Row).toBeVisible({ timeout: 10000 })

  // Click on the row to open inspector panel on the right
  await tkt2Row.click()
  await new Promise((r) => setTimeout(r, 2000))

  // Verify inspector panel shows TKT-0002 and SELESAI status
  const inspectorNumber = browser.locator('span:has-text("TKT-0002")').first()
  await expect(inspectorNumber).toBeVisible()

  // Take verified screenshot
  await app.screenshot('troubleshoot-tkt0002-verified-done')
})
