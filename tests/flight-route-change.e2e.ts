import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies flight route change detailed input form, 5-step approvers, and PDF preview with automatic download button', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open /dashboard/hc/flight-route-change
  await app.open('/dashboard/hc/flight-route-change');
  await new Promise((resolve) => setTimeout(resolve, 4000));
  await expect(browser.locator('body')).toBeVisible();

  // Screenshot 1: Table & KPI Cards
  await app.screenshot('01-flight-route-change-table');

  // 3. Open Detailed Create Form
  const buatBaruBtn = browser.locator('button:has-text("Buat Permohonan Baru")').first();
  await expect(buatBaruBtn).toBeVisible({ timeout: 15000 });
  await buatBaruBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Verify modal dialog opened
  const modalHeading = browser.locator('text=Formulir Permohonan Perubahan Rute Penerbangan').first();
  await expect(modalHeading).toBeVisible({ timeout: 15000 });

  // Fill applicant name
  const nameInput = browser.locator('input[placeholder="Nama lengkap pemohon"]').first();
  await nameInput.fill('Mochamad Khadafi');

  const snInput = browser.locator('input[placeholder*="71261"]').first();
  await snInput.fill('71261');

  // Screenshot 2: Detailed form top with fields filled
  await app.screenshot('02-flight-route-change-detailed-form-top');

  // Submit the form
  const submitBtn = browser.locator('#submit-flight-route-btn, button:has-text("Ajukan Permohonan Rute")').first();
  await submitBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 4500));

  // Screenshot 3: Table with the new request row
  await app.screenshot('03-flight-route-change-table-with-data');

  // 4. Click Review button on the newly created row
  const reviewBtn = browser.locator('button:has-text("Review")').first();
  await expect(reviewBtn).toBeVisible({ timeout: 15000 });
  await reviewBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Screenshot 4: Review drawer with applicant details, route table, 5-step approvers, and Cetak / Unduh PDF button
  await app.screenshot('04-flight-route-change-review-drawer');

  // Verify "Cetak / Unduh PDF" button exists
  const cetakUnduhBtn = browser.locator('button:has-text("Cetak / Unduh PDF")').first();
  await expect(cetakUnduhBtn).toBeVisible();

  // Verify 5-step approval workflow exists in the review drawer
  const approvalHeading = browser.locator('text=Alur 5-Step Persetujuan Dokumen').first();
  await expect(approvalHeading).toBeVisible();
});
