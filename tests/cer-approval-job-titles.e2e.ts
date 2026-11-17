import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify CER approval job titles, multiline wrapping, and cleanup in table and detail', async ({ app, screen, browser, agent }) => {
  // 1. Login directly with target URL using direct email to skip SN resolution
  await loginToHero(app, screen, browser, {
    username: 'mochamad.khadafi@chitraparatama.co.id',
    targetUrl: '/dashboard/assets/cer',
  });
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 2. Open CER dashboard
  await app.open('/dashboard/assets/cer');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Take screenshot of CER Table
  await app.screenshot('01-cer-dashboard-table-view');

  // Verify CER row exists
  await expect(screen.getByText('CER/CP/BALIKPAPAN/XI/2026/001')).toBeVisible();

  // Verify download icon button is removed from table AKSI column
  const tableDownloadBtn = browser.locator('table a[title*="Unduh"]').first();
  await expect(tableDownloadBtn).not.toBeVisible();

  // 4. Click Detail button (Eye icon)
  const detailBtn = browser.locator('button[title="Lihat Detail"]').first();
  await detailBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify Detail Modal Rantai Persetujuan
  const dialog = browser.locator('div[role="dialog"]');
  await expect(dialog.getByText('Rantai Persetujuan:')).toBeVisible();
  await expect(dialog.getByText('IT Coordinator')).toBeVisible();
  await expect(dialog.getByText('BIMA Supervisor')).toBeVisible();
  await expect(dialog.getByText(/Finance & Accounting Supervisor|Budget Controller/).first()).toBeVisible();
  await expect(dialog.getByText('Asset Tagging')).toBeVisible();
  await expect(dialog.getByText('Arif Maulana Ghafar')).toBeVisible();
  await expect(dialog.getByText('Amama Ira Amalia Priyono')).toBeVisible();
  await expect(dialog.getByText('Pratinjau / Unduh Dokumen PDF')).toBeVisible();

  // Take screenshot of Detail Modal
  await app.screenshot('02-cer-detail-approval-chain');

  // Verify that "(BIMA Supervisor)" suffix on name, "Verifikator Tambahan", and default step notes are NOT present
  await expect(dialog.getByText('Arif Maulana Ghafar (BIMA Supervisor)')).not.toBeVisible();
  await expect(dialog.getByText('Verifikator Tambahan')).not.toBeVisible();
  await expect(dialog.getByText(/Catatan:\s*Verifikator Tambahan/i)).not.toBeVisible();
  await expect(dialog.getByText(/Catatan:\s*Tahap/i)).not.toBeVisible();

  // Close detail modal
  await browser.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 5. Open Tinjau Modal to verify CerDocumentView (A4 Preview)
  const tinjauBtn = browser.locator('button:has-text("Tinjau")').first();
  if (await tinjauBtn.isVisible()) {
    await tinjauBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Verify official A4 CER Document view
    await expect(browser.locator('.print-area')).toBeVisible();
    await expect(screen.getByText('FORM CAPITAL EXPENDITURE REQUEST (CER)')).toBeVisible();

    // Verify all configured approvals including Amama Ira are visible with their job titles
    await expect(browser.locator('.print-area').getByText(/Amama Ira Amalia Priyono/)).toBeVisible();
    await expect(browser.locator('.print-area').getByText(/Finance & Accounting Supervisor|Budget Controller/)).toBeVisible();

    // Verify Syamsul Bahri (Asset Tagging) is strictly excluded from signature columns
    await expect(browser.locator('.print-area').getByText(/Syamsul Bahri/)).not.toBeVisible();

    // Verify cleanup: no "Verifikator Tambahan" or "(BIMA Supervisor)" on name
    await expect(screen.getByText('Verifikator Tambahan')).not.toBeVisible();
    await expect(screen.getByText(/Arif Maulana Ghafar\s*\(BIMA Supervisor\)/i)).not.toBeVisible();
    await expect(screen.getByText(/Arif Maulana Ghafar/)).toBeVisible();

    await app.screenshot('03-cer-official-document-preview');
  }
});
