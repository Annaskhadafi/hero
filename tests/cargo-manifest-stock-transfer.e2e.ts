import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies cargo manifest warehouse stock transfer and warehouse repair pages without chunk errors', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate and land on Cargo Manifest page
  await loginToHero(app, screen, browser, '/dashboard/cargo-manifest');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Take screenshot of Cargo Manifest page
  await app.screenshot('cargo-manifest-dashboard');

  // 2. Open Tambah Manifest Dialog
  const btnTambahManifest = browser.locator('button:has-text("Tambah Manifest")').first();
  await expect(btnTambahManifest).toBeVisible({ timeout: 15000 });
  await btnTambahManifest.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const dialogManifest = browser.locator('[role="dialog"]').first();
  await expect(dialogManifest).toBeVisible({ timeout: 10000 });

  // Verify Gudang Asal & Gudang Tujuan form controls
  const labelGudangAsal = browser.locator('text=Gudang Asal (S-Loc Pengirim)').first();
  await expect(labelGudangAsal).toBeVisible({ timeout: 5000 });

  const labelGudangTujuan = browser.locator('text=Gudang Tujuan (S-Loc Penerima)').first();
  await expect(labelGudangTujuan).toBeVisible({ timeout: 5000 });

  // Take screenshot of Cargo Manifest dialog with warehouse transfer controls
  await app.screenshot('cargo-manifest-form-gudang-transfer');

  // Close dialog
  await browser.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. Verify /dashboard/warehouse-repair/barang-masuk loads cleanly without chunk load errors
  await browser.goto('http://localhost:3000/dashboard/warehouse-repair/barang-masuk', {
    waitUntil: 'networkidle',
  });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Verify no error boundary is showing
  const errorHeader = browser.locator('text=Gagal Memuat Halaman Dashboard');
  await expect(errorHeader).toHaveCount(0);

  await app.screenshot('warehouse-repair-barang-masuk-page');

  // 4. Verify /dashboard/warehouse-repair/barang-keluar loads cleanly
  await browser.goto('http://localhost:3000/dashboard/warehouse-repair/barang-keluar', {
    waitUntil: 'networkidle',
  });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await expect(errorHeader).toHaveCount(0);

  await app.screenshot('warehouse-repair-barang-keluar-page');

  // 5. Verify /dashboard/warehouse-repair/laporan-stok loads cleanly
  await browser.goto('http://localhost:3000/dashboard/warehouse-repair/laporan-stok', {
    waitUntil: 'networkidle',
  });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await expect(errorHeader).toHaveCount(0);

  await app.screenshot('warehouse-repair-laporan-stok-page');
});
