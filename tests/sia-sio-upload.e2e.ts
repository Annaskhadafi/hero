import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify SIA/SIO & Tools certificate PDF/Image upload, preview, and management', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login to HERO as HSE Admin / Staff
  await loginToHero(app, screen, browser, '/dashboard/hse/sia-sio-tools-certification');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Verify Page Header
  const pageHeading = browser.locator('h1, h2, h3').filter({ hasText: /SIA\/SIO/i }).first();
  await expect(pageHeading).toBeVisible();

  // 3. Verify Scorecard KPI Cards
  await expect(browser.locator('text=Total').first()).toBeVisible();
  await expect(browser.locator('text=Near Expiry').first()).toBeVisible();

  // Take Overview Screenshot
  await app.screenshot('sia-sio-overview');

  // 4. Test "Tambah Sertifikasi" Dialog with interactive PDF/Image upload option
  const addBtn = browser.locator('button:has-text("Tambah Sertifikasi")').first();
  await expect(addBtn).toBeVisible();
  await addBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Verify Dialog header
  await expect(browser.locator('h2, [role="dialog"]').filter({ hasText: /Tambah Sertifikasi SIA\/SIO & Tools/i }).first()).toBeVisible();
  
  // Verify HeroFileUpload component is present and interactive
  await expect(browser.locator('text=Upload lampiran certificate/dokumen (PDF atau Gambar)').first()).toBeVisible();
  await expect(browser.locator('text=Format PDF, JPG, PNG (Maks. 15MB)').first()).toBeVisible();

  // Capture Screenshot of Add Certification modal with upload option
  await app.screenshot('sia-sio-add-upload-dialog');

  // Close the Add Dialog (click cancel or close button)
  const cancelBtn = browser.locator('button:has-text("Batal")').first();
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 5. Test "Pratinjau / View Certificate" Dialog
  const viewBtns = browser.locator('button:has-text("View")');
  if ((await viewBtns.count()) > 0) {
    await viewBtns.first().click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify Certificate Preview Dialog
    await expect(browser.locator('text=PT. CHITRA PARATAMA').first()).toBeVisible();

    // Capture Screenshot of Detail Certificate Preview with attachment section
    await app.screenshot('sia-sio-certificate-detail-preview');

    // Close preview dialog by Escape key or close button
    await browser.keyboard.press('Escape');
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  // 6. Test "Edit Sertifikasi" Dialog with upload option
  const editBtns = browser.locator('button:has-text("Edit")');
  if ((await editBtns.count()) > 0) {
    await editBtns.first().click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Verify Edit Dialog & Upload option
    await expect(browser.locator('text=Edit Sertifikasi').first()).toBeVisible();
    await expect(browser.locator('text=Upload lampiran certificate/dokumen (PDF atau Gambar)').first()).toBeVisible();

    // Capture Screenshot of Edit modal with upload option
    await app.screenshot('sia-sio-edit-upload-dialog');

    const editCancelBtn = browser.locator('button:has-text("Batal")').first();
    if (await editCancelBtn.isVisible()) {
      await editCancelBtn.click();
    }
  }
});
