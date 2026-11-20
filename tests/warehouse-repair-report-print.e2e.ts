import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies that selecting 3 items only exports and prints the 3 selected items in Laporan Posisi Stok', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate to warehouse repair
  await loginToHero(app, screen, browser, '/dashboard/warehouse-repair');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open Laporan Posisi Stok directly
  await app.open('/dashboard/warehouse-repair/laporan-stok');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 3. Find row checkboxes using exact aria-label
  const rowCheckboxes = browser.locator('[aria-label^="Pilih baris"]');
  await expect(rowCheckboxes.first()).toBeVisible({ timeout: 25000 });

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

  // 10. Verify Download PDF button is visible and active
  const downloadPdfBtn = browser.locator('[role="dialog"] button:has-text("Download PDF")').first();
  await expect(downloadPdfBtn).toBeVisible({ timeout: 5000 });

  // 11. Click Download PDF button
  await downloadPdfBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 12. Click Cetak Dokumen to trigger printing pipeline
  const cetakBtn = browser.locator('[role="dialog"] button:has-text("Cetak Dokumen")').first();
  await expect(cetakBtn).toBeVisible({ timeout: 5000 });
  await cetakBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 13. Screenshot 2: Completed verification of print modal, Download PDF and scope
  await app.screenshot('02-laporan-stok-print-executed-successfully');

  // Close dialog
  const closeBtn = browser.locator('[role="dialog"] button:has-text("Tutup")').first();
  await closeBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 14. Specific verification for user scenario: Search while items are selected
  // Clear any existing selection first
  const cancelBtn = browser.locator('button:has-text("Batalkan")').first();
  if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cancelBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  // Select 2 items
  await rowCheckboxes.nth(0).click();
  await new Promise((resolve) => setTimeout(resolve, 600));
  await rowCheckboxes.nth(1).click();
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Verify bulk actions bar shows "2 baris data dipilih"
  await expect(browser.locator('text=2 baris data dipilih').first()).toBeVisible({ timeout: 5000 });

  // Now type a search query that only matches the first item (e.g. search input)
  const searchInput = browser.locator('input[placeholder*="Cari part code"]').first();
  await searchInput.fill('cushi');
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Open PDF modal while search query is active
  const pdfBtn2 = browser.locator('button:has-text("PDF (2)")').first();
  await expect(pdfBtn2).toBeVisible({ timeout: 5000 });
  await pdfBtn2.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // CRITICAL VERIFICATION: Both selected items MUST appear in the preview, NOT just 1!
  const rowsInFilteredPreview = browser.locator('[role="dialog"] .pdf-wrapper tbody tr');
  const countInFiltered = await rowsInFilteredPreview.count();
  console.log('Row count in PDF preview while search is active:', countInFiltered);
  expect(countInFiltered).toBe(2);

  // Verify Download PDF (2) button in modal footer
  const modalDownloadPdf = browser.locator('[role="dialog"] button:has-text("Download PDF (2)")').first();
  await expect(modalDownloadPdf).toBeVisible({ timeout: 5000 });

  // Screenshot 3: User scenario verified - 2 selected items stay in preview even with active search
  await app.screenshot('03-laporan-stok-search-filtered-selection-preserved');

  // Close modal
  await browser.locator('[role="dialog"] button:has-text("Tutup")').first().click();
  await new Promise((resolve) => setTimeout(resolve, 800));
});
