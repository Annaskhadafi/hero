import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies Summary APD Safety Shoes Masa Pakai button, matrix inventory, and preview columns', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and redirect to /dashboard/summary
  await loginToHero(app, screen, browser, '/dashboard/summary');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify Summary list view and the new Masa Pakai button beside Export Excel
  const btnMasaPakai = browser.locator('a:has-text("Masa Pakai / Matrix Sepatu")').first();
  await expect(btnMasaPakai).toBeVisible({ timeout: 20000 });

  const btnInventory = browser.locator('a:has-text("Inventory & Due Date APD")').first();
  await expect(btnInventory).toBeVisible({ timeout: 15000 });

  const btnExport = browser.locator('button:has-text("Export Excel")').first();
  await expect(btnExport).toBeVisible({ timeout: 15000 });

  // Screenshot 1: Summary APD list view with Masa Pakai / Matrix button right next to Export Excel
  await app.screenshot('01-summary-apd-list-with-masa-pakai-button');

  // 2. Click Masa Pakai button to navigate to Safety Shoes Matrix
  await btnMasaPakai.click();
  await new Promise((resolve) => setTimeout(resolve, 8000));

  // Verify on Matrix Sepatu Safety page
  const matrixTitle = browser.locator('text=Inventory Sepatu Safety').first();
  await expect(matrixTitle).toBeVisible({ timeout: 30000 });

  // Verify that there are NO error/issue badges present
  const issueBadge = browser.locator('button:has-text("1 Issue"), button:has-text("Issue")');
  await expect(issueBadge).toHaveCount(0);

  // Screenshot 2: Matrix Sepatu Safety page showing employee shoes usage duration and history
  await app.screenshot('02-inventory-safety-shoes-matrix-page');

  // 3. Open document preview for summary 85 to verify preview document table with Masa Pakai column
  await app.open('/dashboard/summary?preview=85');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const docHeader = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(docHeader).toBeVisible({ timeout: 30000 });

  // Verify Masa Pakai header is rendered under Safety Shoes
  const masaPakaiHeader = browser.locator('th:has-text("Masa Pakai")').first();
  await expect(masaPakaiHeader).toBeVisible({ timeout: 20000 });

  // Screenshot 3: Document Preview table with Masa Pakai column under Safety Shoes
  await app.screenshot('03-summary-apd-safety-shoes-masa-pakai-preview');
});
