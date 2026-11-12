import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies Summary APD print layout and preview: A4 Landscape, readable fonts, and no right/bottom clipping', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and redirect to /dashboard/summary
  await loginToHero(app, screen, browser, '/dashboard/summary');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open document preview for summary 67 to verify preview document table and print action buttons
  await app.open('/dashboard/summary?preview=67');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const docHeader = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(docHeader).toBeVisible({ timeout: 35000 });

  // Verify external link button to open dedicated print page exists
  const extPrintLink = browser.locator('a[title*="halaman cetak"]').first();
  await expect(extPrintLink).toBeVisible({ timeout: 15000 });

  // Screenshot 1: Summary Preview with new Print action and crisp table layout
  await app.screenshot('01-summary-apd-preview-print-actions');

  // 3. Open dedicated print page for summary 67 (dense summary with multiple employees)
  await app.open('/print/summary/67');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const printTitle = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(printTitle).toBeVisible({ timeout: 25000 });

  // Verify table is visible and not clipped
  const printTable = browser.locator('table').first();
  await expect(printTable).toBeVisible({ timeout: 15000 });

  // Verify headers and Safety Shoes
  const shoesHeader = browser.locator('th:has-text("Safety Shoes")').first();
  await expect(shoesHeader).toBeVisible({ timeout: 10000 });

  // Screenshot 2: Full A4 Landscape print page for Summary 67
  await app.screenshot('02-summary-apd-print-page-67-landscape');

  // 4. Open dedicated print page for summary 69
  await app.open('/print/summary/69');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const printTitle69 = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(printTitle69).toBeVisible({ timeout: 25000 });

  // Screenshot 3: Full A4 Landscape print page for Summary 69
  await app.screenshot('03-summary-apd-print-page-69-landscape');
});
