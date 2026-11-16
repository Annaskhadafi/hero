import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('mobile dashboard hides SPL-2026-0563 from a non-participant', async ({
  app,
  screen,
  browser,
}) => {
  await browser.setViewport({ width: 390, height: 844 })
  await loginToHero(app, screen, browser, { targetUrl: '/mobile/dashboard' })

  await expect(browser).toHaveURL(/\/mobile\/dashboard/)
  await expect(browser.locator('body')).toContainText('Inbox Approval Bersih')
  await expect(browser.locator('body')).not.toContainText('SPL-2026-0563')
  await app.screenshot('mobile-dashboard-spl-hidden-from-nonparticipant')
})
