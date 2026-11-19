import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies that selecting 3 items only exports and prints the 3 selected items in Laporan Posisi Stok', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate and land on Laporan Posisi Stok
  await loginToHero(app, screen, browser, '/dashboard/warehouse-repair/laporan-stok');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 2. Wait for page title and table to appear
  const heading = browser.locator('text=Laporan Posisi Stok').first();
  await expect(heading).toBeVisible({ timeout: 45000 });

  const table = browser.locator('table').first();
  await expect(table).toBeVisible({ timeout: 30000 });

  // 3. Find row checkboxes using exact aria-label
  const rowCheckboxes = browser.locator('[aria-label^="Pilih baris"]');
  await expect(rowCheckboxes.first()).toBeVisible({ timeout: 20000 });

  // Click first 3 row checkboxes sequentially
  await rowCheckboxes.nth(0).click();
  await new Promise((resolve) => setTimeout(resolve, 800));
  await rowCheckboxes.nth(1).click();
  await new Promise((resolve) => setTimeout(resolve, 800));
  await rowCheckboxes.nth(2).click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 4. Verify bulk actions bar shows "3 baris data dipilih"
  const bulkBar = browser.locator('text=3 baris data dipilih').first();
  await expect(bulkBar).toBeVisible({ timeout: 15000 });

  // 5. Verify the toolbar or bulk bar PDF button displays "PDF (3)"
  const pdfButton = browser.locator('button:has-text("PDF (3)")').first();
  await expect(pdfButton).toBeVisible({ timeout: 10000 });

  // 6. Click the PDF button to open the preview modal
  await pdfButton.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 7. Verify the PDF preview dialog opens
  const dialog = browser.locator('[role="dialog"]').first();
  await expect(dialog).toBeVisible({ timeout: 15000 });

  // Verify the dialog header mentions item terpilih or 3 data
  const scopeBadge = browser.locator('text=3 Item Terpilih').first();
  await expect(scopeBadge).toBeVisible({ timeout: 10000 });

  // Verify that the table in the dialog preview only has 3 data rows
  const dialogTableRows = browser.locator('[role="dialog"] .pdf-wrapper tbody tr');
  const dialogRowCount = await dialogTableRows.count();
  console.log('PDF Preview Dialog Row Count:', dialogRowCount);
  expect(dialogRowCount).toBe(3);

  // 8. Screenshot 1: PDF Preview Dialog strictly showing 3 selected items
  await app.screenshot('01-laporan-stok-print-preview-3-selected-items');

  // 9. Verify toggle button for scope selection
  const allDataBtn = browser.locator('[role="dialog"] button:has-text("Semua Data")').first();
  await expect(allDataBtn).toBeVisible({ timeout: 5000 });

  // Click "Semua Data" to test scope toggle
  await allDataBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 800));
  const allRowsCount = await browser.locator('[role="dialog"] .pdf-wrapper tbody tr').count();
  console.log('PDF Preview with All Data Row Count:', allRowsCount);
  expect(allRowsCount).toBeGreaterThan(3);

  // Switch back to "Hanya 3 Data Terpilih"
  const selectedOnlyBtn = browser.locator('[role="dialog"] button:has-text("Hanya 3 Data Terpilih")').first();
  await selectedOnlyBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 800));
  expect(await browser.locator('[role="dialog"] .pdf-wrapper tbody tr').count()).toBe(3);

  // 10. Click Cetak Dokumen to trigger printing pipeline
  const cetakBtn = browser.locator('[role="dialog"] button:has-text("Cetak Dokumen")').first();
  await expect(cetakBtn).toBeVisible({ timeout: 5000 });
  await cetakBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 11. Screenshot 2: Completed verification of print modal and scope
  await app.screenshot('02-laporan-stok-print-executed-successfully');

  // Close dialog
  const closeBtn = browser.locator('[role="dialog"] button:has-text("Tutup")').first();
  await closeBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
});
