import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify operational site dropdown list in mobile OSM wizard', async ({ app, screen, browser, agent }) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);

  // 2. Open Mobile OSM page
  await app.open('/mobile/hse/osm');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Start New OSM by tapping the floating plus button or New OSM button
  const plusBtn = browser.locator('button:has(svg.lucide-plus), button:has-text("Mulai OSM Baru")').first();
  if (await plusBtn.isVisible()) {
    await plusBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // 4. In Step 1 (Team), proceed to Step 2 (Location & Focus)
  const nextBtn = screen.getByRole('button', 'Next');
  await nextBtn.tap();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 5. Verify Step 2 "Lokasi Inspeksi & Fokus Monitoring" is rendered
  await expect(browser.locator('text=Lokasi Inspeksi & Fokus Monitoring')).toBeVisible();

  // 6. Verify "Nama Lokasi Area" is a Dropdown List
  await expect(browser.locator('text=Nama Lokasi Area')).toBeVisible();

  // Open the dropdown list
  const siteSelect = browser.locator('button[role="combobox"]:has-text("Sangatta KABO"), button[role="combobox"]:has-text("Pilih Site")').first();
  await expect(siteSelect).toBeVisible();
  await siteSelect.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 7. Take screenshot showing the dropdown list with operational sites
  await app.screenshot('mobile-osm-operational-sites-dropdown');

  // 8. Agent assertion
  await agent.assert('The mobile OSM inspection form displays a dropdown list of operational sites such as Sangatta KABO, Balikpapan, and other site options');
});
