import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies NONAKTIF condition option on mobile central service assets and quick status switch', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser, '/dashboard/central-service/assets');

  // 2. Open mobile asset page with mobile viewport
  await browser.setViewport({ width: 390, height: 844 });
  await app.open('/mobile/central-service/assets');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. Search for asset 20000277 (the asset in user screenshot)
  const searchInput = browser.locator('input[placeholder*="Cari deskripsi"]').first();
  await expect(searchInput).toBeVisible({ timeout: 25000 });
  await searchInput.fill('20000277');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await expect(browser.locator('text=20000277').first()).toBeVisible({ timeout: 15000 });

  // 4. Verify quick condition select includes Set NONAKTIF option
  const cardConditionSelect = browser.locator('select:has(option[value="NONAKTIF"])').last();
  await expect(cardConditionSelect).toBeVisible({ timeout: 10000 });

  // Screenshot 1: Mobile asset card showing search 20000277 and condition switcher ready
  await app.screenshot('01-mobile-asset-card-nonaktif-option');

  // 5. Change condition to NONAKTIF
  await cardConditionSelect.selectOption('Set NONAKTIF');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify badge shows NONAKTIF
  const nonaktifBadge = browser.locator('span:has-text("NONAKTIF")').first();
  await expect(nonaktifBadge).toBeVisible({ timeout: 10000 });

  // Screenshot 2: Card updated with NONAKTIF badge
  await app.screenshot('02-mobile-asset-updated-to-nonaktif');

  // Revert back to ACTIVE
  await cardConditionSelect.selectOption('Set ACTIVE');
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const activeBadge = browser.locator('span:has-text("ACTIVE")').first();
  await expect(activeBadge).toBeVisible({ timeout: 10000 });
});
