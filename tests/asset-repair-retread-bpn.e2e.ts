import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies imported Repair / Retread Operation Balikpapan assets appear on /dashboard/central-service/assets', async ({
  app,
  screen,
  browser,
}) => {
  await loginToHero(app, screen, browser, '/dashboard/central-service/assets');

  const heading = browser.locator('h2:has-text("Asset Management")').first();
  await expect(heading).toBeVisible({ timeout: 35000 });

  // Wait for client hydration before typing into the search filter
  const searchInput = browser.locator('input[placeholder="Cari aset..."]').first();
  await expect(searchInput).toBeVisible({ timeout: 25000 });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await searchInput.fill('Workshop retread Kariangau');
  await new Promise((resolve) => setTimeout(resolve, 800));

  await expect(browser.locator('text=Workshop retread Kariangau').first()).toBeVisible({ timeout: 15000 });
  await expect(browser.locator('text=10000003').first()).toBeVisible({ timeout: 10000 });
  await expect(browser.locator('text=Repair / Retread Operation').first()).toBeVisible({ timeout: 10000 });
  await expect(browser.locator('text=Balikpapan').first()).toBeVisible({ timeout: 10000 });

  // Screenshot 1: Imported Workshop retread Kariangau visible in Asset Management table
  await app.screenshot('01-assets-repair-retread-balikpapan-workshop');

  // Verify another imported item (Steam Boiler Kap. 1500 Kg/Jam - 20001136)
  await searchInput.fill('Steam Boiler Kap. 1500 Kg/Jam');
  await new Promise((resolve) => setTimeout(resolve, 600));

  await expect(browser.locator('text=Steam Boiler Kap. 1500 Kg/Jam').first()).toBeVisible({ timeout: 15000 });
  await expect(browser.locator('text=20001136').first()).toBeVisible({ timeout: 10000 });

  // Screenshot 2: Imported Steam Boiler Kap. 1500 Kg/Jam visible in Asset Management table
  await app.screenshot('02-assets-repair-retread-balikpapan-boiler');
});

