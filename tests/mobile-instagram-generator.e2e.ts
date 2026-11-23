import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('mobile instagram generator and custom iframe navigation', { timeout: 360_000 }, async ({ app, browser, screen }) => {
  // 1. Set viewport to mobile smartphone (iPhone 390x844)
  await browser.setViewport({ width: 390, height: 844 })

  // 2. Login to HERO mobile dashboard
  await loginToHero(app, screen, browser, '/mobile/dashboard')
  await new Promise((resolve) => setTimeout(resolve, 2500))

  // 3. Verify mobile dashboard loaded and Instagram Generator is present
  await expect(browser.locator('text=HERO')).toBeVisible({ timeout: 20_000 })

  // Screenshot 1: Mobile Dashboard showing Instagram Generator menu
  await app.screenshot('001-mobile-dashboard-instagram-menu')

  // 4. Open Mobile Instagram Generator page directly
  await app.open('/mobile/instagram-generator')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Verify mobile iframe viewer elements
  await expect(browser.locator('h1:has-text("Instagram Generator")')).toBeVisible({ timeout: 25_000 })
  await expect(browser.locator('iframe[title="Instagram Generator"]')).toBeVisible({ timeout: 25_000 })

  // Screenshot 2: Mobile Instagram Generator Page with Iframe Viewer
  await app.screenshot('002-mobile-instagram-generator-viewer')

  // 5. Test opening via custom iframe route /mobile/iframe/2305
  await app.open('/mobile/iframe/2305')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  await expect(browser.locator('h1:has-text("Instagram Generator")')).toBeVisible({ timeout: 25_000 })
  await expect(browser.locator('iframe[title="Instagram Generator"]')).toBeVisible({ timeout: 25_000 })

  // Screenshot 3: Mobile Custom Iframe Route Viewer
  await app.screenshot('003-mobile-custom-iframe-2305')
})
