import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('login to HERO with standard credentials and verify dashboard', async ({ app, screen, browser, agent }) => {
  // 1. Perform login with standard credentials
  await loginToHero(app, screen, browser);

  // 2. Wait for dashboard shell to load
  await expect(browser.locator('body')).toBeVisible();

  // 3. Capture screenshot of authenticated dashboard
  await app.screenshot('dashboard-home');

  // 4. Verify dashboard state using AI Agent assertion
  await agent.assert('the user is logged in and the dashboard or navigation is visible');
});
