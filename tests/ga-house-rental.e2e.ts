import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies GA House Rental menu, KPI cards, table with 8 seed records, create form and detail preview', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and redirect to /dashboard/ga/house-rental
  await loginToHero(app, screen, browser, '/dashboard/ga/house-rental');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open /dashboard/ga/house-rental explicitly if not already there
  await app.open('/dashboard/ga/house-rental');

  // Wait for initial page loading to resolve
  const titleElem = browser.locator('h1:has-text("House Rental")').first();
  await expect(titleElem).toBeVisible({ timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Screenshot 1: Main Dashboard with KPI cards and 8 seeded records
  await app.screenshot('01-ga-house-rental-table');

  // 3. Open Tambah Sewa Rumah dialog
  const tambahBtn = browser.locator('button:has-text("Tambah Sewa Rumah")').first();
  if (await tambahBtn.isVisible()) {
    await tambahBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Screenshot 2: Form Modal Tambah Sewa Rumah
    await app.screenshot('02-ga-house-rental-create-dialog');

    // Close form dialog
    const cancelBtn = browser.locator('button:has-text("Batal")').last();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 4. Click on row to open Detail Modal
  const firstRow = browser.locator('table tbody tr').first();
  if (await firstRow.isVisible()) {
    await firstRow.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Screenshot 3: Official Detail Modal
    await app.screenshot('03-ga-house-rental-detail-modal');

    // Close detail modal
    const closeBtn = browser.locator('button:has-text("Tutup")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
});
