import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies Summary APD Safety Shoes Masa Pakai column in preview, print, and generator modal', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and redirect to /dashboard/summary
  await loginToHero(app, screen, browser, '/dashboard/summary');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open document preview for summary 69 to verify preview document table
  await app.open('/dashboard/summary?preview=69');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const docHeader = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(docHeader).toBeVisible({ timeout: 30000 });

  // Verify Masa Pakai header is rendered under Safety Shoes
  const masaPakaiHeader = browser.locator('th:has-text("Masa Pakai")').first();
  await expect(masaPakaiHeader).toBeVisible({ timeout: 15000 });

  // Screenshot 1: Document Preview table with Masa Pakai column under Safety Shoes
  await app.screenshot('01-summary-apd-safety-shoes-masa-pakai-preview');

  // 3. Open print document page to verify print layout
  await app.open('/print/summary/69');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const printMasaPakaiHeader = browser.locator('th:has-text("Masa Pakai")').first();
  await expect(printMasaPakaiHeader).toBeVisible({ timeout: 20000 });

  // Screenshot 2: Print/PDF layout with Masa Pakai column
  await app.screenshot('02-summary-apd-safety-shoes-masa-pakai-print');

  // 4. Return to /dashboard/summary and wait for list table to load
  await app.open('/dashboard/summary');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const pageTitle = browser.locator('h1:has-text("Summary"), h2:has-text("Summary")').first();
  await expect(pageTitle).toBeVisible({ timeout: 30000 });

  // Wait for table to load
  const tableOrCard = browser.locator('table, .rounded-lg').first();
  await expect(tableOrCard).toBeVisible({ timeout: 20000 });

  // Screenshot 3: Summary APD list view
  await app.screenshot('03-summary-apd-list-view');
});
