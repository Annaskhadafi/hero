import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify JSA HSE approval workflow, online digital signature, and notification dashboard', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login to HERO as HSE / Approver
  await loginToHero(app, screen, browser, '/dashboard/hse/jsa');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Verify Page Header & Eyebrow
  await expect(screen.getByText(/Job Safety Analysis \(JSA\)/i).first()).toBeVisible();

  // 3. Verify Scorecard KPI Cards
  await expect(screen.getByText(/Total Dokumen JSA/i).first()).toBeVisible();
  await expect(screen.getByText(/Menunggu Approval HSE/i).first()).toBeVisible();
  await expect(screen.getByText(/Terverifikasi & Disetujui/i).first()).toBeVisible();

  // Capture main workspace screenshot
  await app.screenshot('jsa-workspace-overview');

  // 4. Test Navigation to "Antrian Approval HSE" Tab
  const approvalTab = browser.locator('button[role="tab"]:has-text("Antrian Approval HSE")').first();
  await expect(approvalTab).toBeVisible();
  await approvalTab.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await app.screenshot('jsa-approval-queue-tab');

  // 5. Test Navigation to "Status TTD Online" Tab
  const ttdTab = browser.locator('button[role="tab"]:has-text("Status TTD Online")').first();
  await expect(ttdTab).toBeVisible();
  await ttdTab.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await app.screenshot('jsa-ttd-online-status-tab');

  // 6. Test Navigation to "Notifikasi HSE" Tab
  const notifTab = browser.locator('button[role="tab"]:has-text("Notifikasi HSE")').first();
  await expect(notifTab).toBeVisible();
  await notifTab.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await expect(screen.getByText(/Alur Notifikasi & Verifikasi JSA Departemen HSE/i).first()).toBeVisible();
  await app.screenshot('jsa-notifications-tab');

  // 7. Back to "Data JSA" Tab to preview and test approval modal
  const dataTab = browser.locator('button[role="tab"]:has-text("Data JSA")').first();
  await expect(dataTab).toBeVisible();
  await dataTab.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 8. Test JSA Document Preview & Online Signature Box
  const previewBtns = browser.locator('button[title="Preview Dokumen JSA"]');
  if ((await previewBtns.count()) > 0) {
    await previewBtns.first().click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify JSA Document Preview Modal opened
    await expect(screen.getByText(/Preview Dokumen JSA/i).first()).toBeVisible();
    await expect(screen.getByText(/PT\. CHITRA PARATAMA/i).first()).toBeVisible();
    await expect(screen.getByText(/Pelaksana \/ Pembuat JSA/i).first()).toBeVisible();
    await expect(screen.getByText(/Verifikasi Departemen HSE/i).first()).toBeVisible();

    await app.screenshot('jsa-document-sheet-preview');

    // Test clicking "Verifikasi & TTD Online" button in preview modal if present
    const ttdInPreview = browser.locator('button:has-text("Verifikasi & TTD Online")').first();
    if (await ttdInPreview.isVisible()) {
      await ttdInPreview.click();
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Verify Approval & Signature Modal
      await expect(screen.getByText(/Verifikasi & TTD Online JSA/i).first()).toBeVisible();
      await expect(screen.getByText(/Form Pengesahan Departemen HSE/i).first()).toBeVisible();
      await expect(screen.getByText(/Nama Verifikator HSE/i).first()).toBeVisible();

      await app.screenshot('jsa-verification-signature-dialog');
    }
  }
});
