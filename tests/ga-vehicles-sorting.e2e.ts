import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('GA Vehicles table sorting and dashboard verification', async ({ app, screen, browser, agent }) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);

  // 2. Navigate to GA Vehicles dashboard
  await app.open('/dashboard/ga/vehicles');
  await expect(browser.locator('body')).toBeVisible();

  // 3. Capture screenshot of table with sortable columns
  await app.screenshot('ga-vehicles-table-sortable');

  // 4. Verify table and sortable headers with agent assertion
  await agent.assert('the vehicle monitoring table is displayed with column headers for sorting and vehicle data rows');
});
