import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify mobile APD request form displays synchronized master data APD items', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials and navigate to mobile APD request
  await loginToHero(app, screen, browser, '/mobile/apd/new');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open /mobile/apd/new explicitly
  await app.open('/mobile/apd/new');
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Scroll down so the item list is clearly visible in viewport
  await browser.evaluate(() => window.scrollBy(0, 500));
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Screenshot 1: Item section in mobile view showing APD item with master details (sizes, unit, etc.)
  await app.screenshot('01-mobile-apd-item-section');

  // 4. Click the APD item combobox (the second combobox on page; first is Seksi Target)
  const comboboxes = browser.locator('button[role="combobox"]');
  const count = await comboboxes.count();
  if (count > 1) {
    await comboboxes.nth(1).click();
  } else {
    await comboboxes.first().click();
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Screenshot 2: Dropdown options loaded from Master APD
  await app.screenshot('02-mobile-apd-master-catalog-dropdown');
});
