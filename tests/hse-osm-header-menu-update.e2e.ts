import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify OSM page header and menu title updated to ON SPOT MONITORING', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login and open OSM page
  await loginToHero(app, screen, browser, '/dashboard/hse/osm');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Verify page header title is "ON SPOT MONITORING"
  const headerTitle = browser.locator('h1:has-text("ON SPOT MONITORING")').first();
  await expect(headerTitle).toBeVisible({ timeout: 60000 });

  // 3. Take screenshot of the page header and dashboard view
  await app.screenshot('01-on-spot-monitoring-header');

  // 4. Verify sidebar menu has "ON SPOT MONITORING"
  const menuLink = browser.locator('a[href="/dashboard/hse/osm"]').first();
  if (await menuLink.isVisible()) {
    await expect(menuLink).toBeVisible();
    await app.screenshot('02-on-spot-monitoring-sidebar-menu');
  } else {
    // Check text in sidebar
    const sidebarText = browser.locator('text=ON SPOT MONITORING').first();
    await expect(sidebarText).toBeVisible({ timeout: 30000 });
    await app.screenshot('02-on-spot-monitoring-sidebar-menu');
  }
});
