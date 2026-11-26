import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('HERO displays 3D icons across desktop and mobile', { timeout: 180_000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials directly to desktop dashboard
  await loginToHero(app, screen, browser, {
    username: process.env.HERO_E2E_USERNAME ?? '71261',
    targetUrl: '/dashboard',
  })
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Desktop Quick Actions - Verify 3D Polos Icons
  await expect(browser.locator('text=Aksi cepat').first()).toBeVisible({ timeout: 25_000 })

  const desktop3dIcons = browser.locator('img[src*="/icons/hero-3d/polos/"]')
  const countDesktop = await desktop3dIcons.count()
  expect(countDesktop).toBeGreaterThanOrEqual(5)

  // Scroll to quick action section and take desktop screenshot
  await browser.evaluate(() => {
    const el = document.querySelector('button[title*="Check In"], button[title*="Check Out"]')
    el?.scrollIntoView({ block: 'center' })
  })
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await app.screenshot('desktop-dashboard-3d-icons')

  // 3. Open Mobile Dashboard directly with existing authenticated session
  await app.open('/mobile/dashboard')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 4. Mobile Dashboard Services Grid with 3D Tile Icons
  const mobileTileIcons = browser.locator('img[src*="/icons/hero-3d/tile/"]')
  await expect(mobileTileIcons.first()).toBeVisible({ timeout: 35_000 })

  const countMobileTile = await mobileTileIcons.count()
  expect(countMobileTile).toBeGreaterThanOrEqual(1)

  await app.screenshot('mobile-dashboard-3d-tile-icons')

  // 5. Mobile "Lainnya" Full Catalogue Sheet with 3D Polos Icons
  const lainnyaBtn = browser.locator('button:has-text("Lainnya")').first()
  if (await lainnyaBtn.isVisible()) {
    await lainnyaBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const sheet3dIcons = browser.locator('img[src*="/icons/hero-3d/polos/"]')
    await expect(sheet3dIcons.first()).toBeVisible({ timeout: 15_000 })
    await app.screenshot('mobile-catalogue-3d-icons')
  }
})

