import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies master data apd management and newly added apd items', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate and ensure we are on Master Data APD page
  await loginToHero(app, screen, browser, '/dashboard/apd/master');
  await app.open('/dashboard/apd/master');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Verify KPI Scorecard metrics are rendered
  const kpiCards = browser.locator('text=Total Katalog Item').first();
  await kpiCards.waitFor({ state: 'visible', timeout: 30000 });
  await expect(kpiCards).toBeVisible();

  // Verify newly added APD items exist in the table
  const tudungItem = browser.locator('text=Tudung Kepala / Kupluk (Makatac)').first();
  await tudungItem.waitFor({ state: 'visible', timeout: 20000 });
  await expect(tudungItem).toBeVisible();

  const cottonFilterItem = browser.locator('text=Cotton Filter Respirator Honeywell').first();
  await cottonFilterItem.waitFor({ state: 'visible', timeout: 20000 });
  await expect(cottonFilterItem).toBeVisible();

  // Screenshot 1: Master APD Table and KPI Cards
  await app.screenshot('01-master-apd-table-and-kpis');

  // 2. Open Tambah Master APD Dialog
  const tambahBtn = browser.locator('button:has-text("Tambah Master APD")').first();
  await tambahBtn.waitFor({ state: 'visible', timeout: 10000 });
  await tambahBtn.click();

  const modalTitle = browser.locator('text=Tambah Master Data APD Baru').first();
  await modalTitle.waitFor({ state: 'visible', timeout: 20000 });
  await expect(modalTitle).toBeVisible();

  // Screenshot 2: Tambah Master APD Modal Form
  await app.screenshot('02-master-apd-create-modal');

  // Close modal by clicking cancel
  const cancelBtn = browser.locator('button:has-text("Batal")').last();
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 3. Navigate to Request Barang (/dashboard/apd) and verify Master APD shortcut button
  await app.open('/dashboard/apd');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const masterApdShortcut = browser.locator('a:has-text("Master APD")').first();
  await masterApdShortcut.waitFor({ state: 'visible', timeout: 30000 });
  await expect(masterApdShortcut).toBeVisible();

  // Screenshot 3: APD Request Page with Master APD Shortcut Button
  await app.screenshot('03-apd-request-page-master-button');
});
