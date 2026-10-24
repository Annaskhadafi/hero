import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('login to HERO with standard credentials and verify dashboard', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Perform login with standard credentials
  await loginToHero(app, screen, browser)

  // 2. Open the analytics page explicitly and verify rendered dashboard content
  await app.open('/dashboard/analytics')
  await expect(browser).toHaveURL(/\/dashboard\/analytics(?:[?#].*)?$/)
  await expect(screen.getByText('Employee Reporting & Operational')).toBeVisible()
  await expect(screen.getByText('Dashboard Individu')).toBeVisible()

  // 3. Capture screenshot of authenticated dashboard
  await app.screenshot('dashboard-home')
})
