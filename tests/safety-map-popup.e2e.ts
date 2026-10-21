import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify safety map popup contains the 5 required metrics', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Navigate to /dashboard/safety
  await app.open('/dashboard/safety');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Verify map title
  await expect(screen.getByText('Peta Sebaran Site & Status OSHE')).toBeVisible();

  // 4. Wait for marker and click on a site marker (e.g. Balikpapan or CK BIB)
  const marker = browser.locator('.custom-site-marker').first();
  await marker.waitFor({ state: 'visible', timeout: 10000 });
  await marker.click();

  // 5. Wait for the popup to open
  const popup = browser.locator('.safety-map-popup');
  await popup.waitFor({ state: 'visible', timeout: 5000 });

  // 6. Screenshot popup
  await app.screenshot('safety-map-popup-verified');

  // 7. Verify the 5 metrics exist in the popup
  await expect(popup.getByText('Total Manpower')).toBeVisible();
  await expect(popup.getByText('Manpower Service')).toBeVisible();
  await expect(popup.getByText('Manpower Repair')).toBeVisible();
  await expect(popup.getByText('Safe Man Hours')).toBeVisible();
  await expect(popup.getByText('Total Insiden')).toBeVisible();

  // 8. Assert agent
  await agent.assert('The map marker popup opens and clearly displays Total Manpower, Manpower Service, Manpower Repair, Safe Man Hours, and Total Insiden');
});
