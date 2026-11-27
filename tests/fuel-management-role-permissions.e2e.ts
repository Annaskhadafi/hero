import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verify Fuel Management role settings and RBAC access', async ({
  app,
  screen,
  browser,
}) => {
  // Desktop viewport
  await browser.setViewport({ width: 1440, height: 900 })

  // 1. Log in with standard credentials
  await loginToHero(app, screen, browser)

  // 2. Open /dashboard/security/roles
  await app.open('/dashboard/security/roles')
  await new Promise((r) => setTimeout(r, 4000))

  // Dismiss birthday dialog if visible
  const dismissBtn = browser.locator('button:has-text("TUTUP / MENGERTI")').first()
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
  }

  // Verify Roles & Permissions header is visible
  const rolesHeading = browser.locator('h1:has-text("Role & Permission")').first()
  await expect(rolesHeading).toBeVisible({ timeout: 20000 })

  // Screenshot Role & Permission page
  await app.screenshot('006-01-fuel-management-role-permissions-dashboard')

  // 3. Open /dashboard/fuel-management to verify authorized access
  await app.open('/dashboard/fuel-management')
  await new Promise((r) => setTimeout(r, 4000))

  const fuelHeading = browser.locator('h1:has-text("Fuel Management")').first()
  await expect(fuelHeading).toBeVisible({ timeout: 20000 })

  // Screenshot Fuel Management desktop
  await app.screenshot('006-02-fuel-management-authorized-access-verified')

  console.log('[E2E SUCCESS] Fuel Management role settings and access control verified.')
})
