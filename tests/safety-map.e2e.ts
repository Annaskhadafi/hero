import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify safety map moved from monthly summary to safety dashboard', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Navigate to /dashboard/safety
  await app.open('/dashboard/safety');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();

  // Verify map header and map are visible on /dashboard/safety
  await expect(screen.getByText('Peta Sebaran Site & Status OSHE')).toBeVisible();
  await app.screenshot('safety-dashboard-with-map');
  await agent.assert('The safety dashboard displays the interactive site map with title Peta Sebaran Site & Status OSHE and site indicators');

  // 3. Navigate to /dashboard/safety/data
  await app.open('/dashboard/safety/data');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();

  // Click on "Rekapitulasi Bulanan & Peta Site" / "Monthly Summary" tab if present
  const monthlyTab = screen.getByRole('tab', { name: /Monthly Summary|Rekapitulasi/i });
  if (await monthlyTab.isVisible()) {
    await monthlyTab.tap();
  }

  // Screenshot of safety data management monthly summary without map
  await app.screenshot('safety-data-monthly-summary-no-map');

  // Verify the old map heading is not present in monthly summary
  await agent.assert('The monthly summary tab shows indicators, charts and data table but does NOT contain the site map');
});
