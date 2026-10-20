import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('mobile dashboard aesthetic redesign: search menu, curated shortcuts, and non-truncated lainnya catalog', async ({
  app,
  screen,
  browser,
  agent,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Open /mobile/dashboard directly
  await app.open('/mobile/dashboard')
  await new Promise((resolve) => setTimeout(resolve, 4000))
  await expect(browser.locator('body')).toBeVisible()

  // 3. Verify Header and Rank Points Card are rendered
  await expect(browser.locator('text=Command Center').first()).toBeVisible()
  await expect(browser.locator('text=PTS').first()).toBeVisible()

  // 4. Verify Search Bar exists on dashboard
  const searchTrigger = browser.locator('button:has-text("Cari menu, layanan, atau laporan...")').first()
  await expect(searchTrigger).toBeVisible()

  // 5. Verify Curated 8-shortcuts grid
  await expect(browser.locator('text=Layanan Utama').first()).toBeVisible()
  const lainnyaBtn = browser.locator('button:has-text("Lainnya")').first()
  await expect(lainnyaBtn).toBeVisible()

  // Take screenshot of redesigned homepage
  await app.screenshot('mobile-dashboard-redesign-home')

  // 6. Test Instant Search interaction
  await searchTrigger.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const searchInput = browser.locator('input[placeholder*="Ketik nama menu"]').first()
  await expect(searchInput).toBeVisible()

  // Type search query "Ban"
  await searchInput.fill('Ban')
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Verify results show "Deteksi Kerusakan Ban"
  await expect(browser.locator('text=Deteksi Kerusakan Ban').first()).toBeVisible()
  await app.screenshot('mobile-dashboard-search-results')

  // Close search sheet
  const closeSearchBtn = browser.locator('button:has(svg.lucide-x)').first()
  if (await closeSearchBtn.isVisible()) {
    await closeSearchBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // 7. Test "Lainnya" Sheet (Category Tabs & Non-Truncated Feature Cards)
  await lainnyaBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  await expect(browser.locator('text=Semua Layanan Chitra').first()).toBeVisible()

  // Verify Category Tabs are present
  await expect(browser.locator('button:has-text("Semua")').first()).toBeVisible()
  await expect(browser.locator('button:has-text("Operasional")').first()).toBeVisible()
  await expect(browser.locator('button:has-text("K3 & HSE")').first()).toBeVisible()

  // Take screenshot of "Lainnya" with Category Tabs
  await app.screenshot('mobile-dashboard-lainnya-tabs')

  // Click on "Operasional" Tab
  const operasionalTab = browser.locator('button:has-text("Operasional")').first()
  await operasionalTab.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Verify items inside Operasional
  await expect(browser.locator('text=Aktivitas Harian').first()).toBeVisible()
  await app.screenshot('mobile-dashboard-category-operasional')

  // 8. Agent assertion
  await agent.assert(
    'The service catalog is open, displays category tabs including Semua and Operasional, and displays services correctly when a category tab is selected'
  )
})
