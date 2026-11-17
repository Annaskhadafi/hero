import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify OSM finding photo management and detail dialog', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials (71261)
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/hse/osm',
  });

  // Wait for redirect to dashboard
  await browser.waitForURL('**/dashboard/**', { timeout: 30000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Ensure we are on /dashboard/hse/osm
  await app.open('/dashboard/hse/osm');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Find row actions button (or table row)
  const actionsDropdownBtn = browser.locator('button:has-text("Actions")').first();
  await expect(actionsDropdownBtn).toBeVisible({ timeout: 20000 });
  await actionsDropdownBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Click "Lihat Detail"
  const viewDetailItem = browser.locator('text=Lihat Detail').first();
  await viewDetailItem.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify modal is open
  await expect(browser.locator('text=Laporan On the Spot Monitoring (OSM)').first()).toBeVisible({ timeout: 15000 });

  // Take screenshot 1: OSM detail dialog with finding photos and "Kelola / Ganti Foto" button
  await app.screenshot('01-osm-detail-with-photo-action');

  // Find and click "Kelola / Ganti Foto" button
  const kelolaFotoBtn = browser.locator('button:has-text("Kelola / Ganti Foto")').first();
  if (await kelolaFotoBtn.isVisible()) {
    await kelolaFotoBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Verify manage photos dialog is open
    await expect(browser.locator('text=Kelola / Ganti Foto Temuan').first()).toBeVisible({ timeout: 10000 });

    // Take screenshot 2: manage/replace photos dialog
    await app.screenshot('02-osm-manage-replace-photos-dialog');
  }
});
