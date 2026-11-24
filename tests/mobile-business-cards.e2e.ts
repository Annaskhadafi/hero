import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('verifies Mobile Business Card Scanner UI, contact cards, and quick actions', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser, '/mobile/business-cards')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Open /mobile/business-cards explicitly
  await app.open('/mobile/business-cards')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 3. Verify mobile header
  const pageTitle = browser.locator('h1:has-text("Business Card Scanner")').first()
  await expect(pageTitle).toBeVisible({ timeout: 25000 })

  // 3. Verify scan CTA banner and KPI pills
  const ctaBanner = browser.locator('text=Sedang di Venue Expo?').first()
  await expect(ctaBanner).toBeVisible({ timeout: 15000 })

  const scanNowBtn = browser.locator('button:has-text("Scan Sekarang")').first()
  await expect(scanNowBtn).toBeVisible({ timeout: 15000 })

  // 4. Verify contact cards in mobile list
  const contactCard = browser.locator('text="Siti Rahma"').first()
  await expect(contactCard).toBeVisible({ timeout: 15000 })

  // Take Screenshot 1: Mobile Business Cards list view with scan CTA banner
  await app.screenshot('01-mobile-business-card-scanner-list')

  // 5. Open mobile detail modal by tapping Detail button
  const detailBtn = browser.locator('button:has-text("Detail")').first()
  await expect(detailBtn).toBeVisible({ timeout: 15000 })
  await detailBtn.click()

  // 6. Verify detail modal dialog opens and WhatsApp button is visible
  const waBtn = browser.locator('button:has-text("Chat WhatsApp")').first()
  await expect(waBtn).toBeVisible({ timeout: 15000 })

  // Take Screenshot 2: Mobile Document Detail Modal with WhatsApp shortcut
  await app.screenshot('02-mobile-business-card-detail-modal')
})
