import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies HRGA Kerjasama page with Hospital, School, PKL tabs and dialogs', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open /dashboard/hc/kerjasama
  await app.open('/dashboard/hc/kerjasama');

  // Wait for initial page loading to resolve
  const titleElem = browser.locator('h1:has-text("Menu Kerjasama HRGA")').first();
  await expect(titleElem).toBeVisible({ timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Screenshot 1: Tab 1 - Kerjasama Rumah Sakit
  await app.screenshot('01-tab-kerjasama-rs');

  // 3. Switch to Tab 2: "Kerjasama Sekolah"
  const sekolahTab = browser.locator('button[role="tab"]:has-text("Kerjasama Sekolah")').first();
  await expect(sekolahTab).toBeVisible({ timeout: 15000 });
  await sekolahTab.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Screenshot 2: Tab 2 - Kerjasama Sekolah
  await app.screenshot('02-tab-kerjasama-sekolah');

  // 4. Open "Tambah Sekolah Mitra" dialog
  const tambahSekolahBtn = browser.locator('button:has-text("Tambah Sekolah Mitra")').first();
  if (await tambahSekolahBtn.isVisible()) {
    await tambahSekolahBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Screenshot 3: Form Dialog Tambah Sekolah Mitra
    await app.screenshot('03-dialog-tambah-sekolah');

    // Close dialog
    const closeBtn = browser.locator('button:has-text("Batal")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 5. Switch to Tab 3: "Siswa PKL & Magang"
  const pklTab = browser.locator('button[role="tab"]:has-text("Siswa PKL")').first();
  await expect(pklTab).toBeVisible({ timeout: 15000 });
  await pklTab.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Screenshot 4: Tab 3 - Siswa PKL & Magang
  await app.screenshot('04-tab-siswa-pkl');
});
