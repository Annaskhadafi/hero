import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('verifies ewh year to date (ytd) view loads cleanly without crashing', async ({ app, screen, browser }) => {
  // 1. Login to HERO and navigate to EWH dashboard
  await loginToHero(app, screen, browser, '/dashboard/ewh')

  // 2. Wait for EWH dashboard to be ready
  await expect(screen.getByTestId('powerman-card-btn', { visible: true })).toBeVisible({ timeout: 15000 })
  await app.screenshot('01-ewh-dashboard-daily')

  // 3. Click "Year to Date (YTD)" button using browser locator
  const ytdBtn = browser.locator('[data-testid="ytd-tab-btn"]')
  await expect(ytdBtn).toBeVisible()
  await ytdBtn.click()
  await new Promise((r) => setTimeout(r, 1500))

  // 4. Verify YTD Table card is visible
  const ytdTableCard = browser.locator('[data-testid="ytd-table-card"]')
  await expect(ytdTableCard).toBeVisible()

  // Verify YTD Summary row exists
  await expect(browser.locator('text=TOTAL / RATA-RATA YTD')).toBeVisible()
  await app.screenshot('02-ewh-ytd-table-rendered')

  // 5. Test chart type switching in YTD view
  // Line chart
  const lineChartBtn = browser.locator('button:has-text("Area & Trend")')
  if (await lineChartBtn.isVisible().catch(() => false)) {
    await lineChartBtn.click()
    await new Promise((r) => setTimeout(r, 600))
    await app.screenshot('03-ewh-ytd-line-chart')
  }

  // Radar chart
  const radarChartBtn = browser.locator('button:has-text("Radar")')
  if (await radarChartBtn.isVisible().catch(() => false)) {
    await radarChartBtn.click()
    await new Promise((r) => setTimeout(r, 600))
    await app.screenshot('04-ewh-ytd-radar-chart')
  }

  // 6. Test direct navigation with URL query param ?viewMode=ytd
  await browser.goto('http://localhost:3000/dashboard/ewh?viewMode=ytd')
  await new Promise((r) => setTimeout(r, 1500))
  await expect(browser.locator('[data-testid="ytd-table-card"]')).toBeVisible()
  await app.screenshot('05-ewh-direct-ytd-query-param')
})
