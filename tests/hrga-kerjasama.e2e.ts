import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies HRGA Kerjasama page with Hospital Partnerships, PKL Students, KPIs, and Modals', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open /dashboard/hc/kerjasama
  await app.open('/dashboard/hc/kerjasama');

  // Wait for initial Next.js compilation / loading skeleton to resolve
  const titleElem = browser.locator('h1:has-text("Menu Kerjasama HRGA")').first();
  await expect(titleElem).toBeVisible({ timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Screenshot 1: Tab Kerjasama Rumah Sakit with KPIs and seeded data
  await app.screenshot('01-hrga-kerjasama-rs-table');

  // Verify at least one hospital from seed is visible (e.g. RS Meloy or RS Sari Mulia)
  const rsSample = browser.locator('text=RS Meloy').first();
  await expect(rsSample).toBeVisible({ timeout: 15000 });

  // 3. Open Tambah Rumah Sakit dialog
  const tambahRsBtn = browser.locator('button:has-text("Tambah Rumah Sakit")').first();
  if (await tambahRsBtn.isVisible()) {
    await tambahRsBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await app.screenshot('02-hrga-kerjasama-rs-dialog');

    // Close dialog
    const closeBtn = browser.locator('button:has-text("Batal")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 4. Switch to Tab "Siswa PKL & Magang"
  const pklTab = browser.locator('button[role="tab"]:has-text("Siswa PKL")').first();
  await expect(pklTab).toBeVisible({ timeout: 10000 });
  await pklTab.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Screenshot 3: Tab Siswa PKL with KPIs and 20 seeded student records
  await app.screenshot('03-hrga-kerjasama-pkl-table');

  // Verify student from page 1 seed is visible (e.g. Andi Rivelani Aurellah)
  const studentSample = browser.locator('text=Andi Rivelani Aurellah').first();
  await expect(studentSample).toBeVisible({ timeout: 15000 });

  // 5. Click student to view detail modal
  await studentSample.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Screenshot 4: Detail Modal Siswa PKL
  await app.screenshot('04-hrga-kerjasama-pkl-detail-modal');

  // Close modal
  const closeDetail = browser.locator('button:has-text("Tutup")').first();
  if (await closeDetail.isVisible()) {
    await closeDetail.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
});
