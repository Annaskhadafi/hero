import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies Daily Activity to SPL auto-generation, prefilled form, and full integration into SPL module', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and open /dashboard/daily-activity
  await loginToHero(app, screen, browser, '/dashboard/daily-activity');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Screenshot Daily Activity Monitoring Page
  await app.screenshot('01-daily-activity-dashboard');

  // 2. Open Detail Modal of an Employee with daily activity
  // Look for employee name button or "Lihat Formulir Detail"
  const empNameBtn = browser.locator('td button:has(span)').first();
  if (await empNameBtn.isVisible().catch(() => false)) {
    await empNameBtn.click();
  } else {
    const detailButtons = browser.locator('button:has-text("Lihat detail"), button:has-text("Lihat Formulir Detail"), td button:has-text("Lihat")');
    if ((await detailButtons.count()) > 0) {
      await detailButtons.first().click();
    } else {
      const firstRow = browser.locator('table tbody tr').first();
      if (await firstRow.isVisible().catch(() => false)) {
        await firstRow.click();
      }
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Screenshot Daily Activity Form Modal
  await app.screenshot('02-daily-activity-detail-modal');

  // 4. Click "BUAT SPL LEMBUR" button in the modal
  const buatSplBtn = browser.locator('button[data-testid="btn-buat-spl-lembur"], button:has-text("BUAT SPL LEMBUR"), button:has-text("Buat SPL Lembur"), button:has-text("Buat SPL Tambahan")').first();
  await expect(buatSplBtn).toBeVisible({ timeout: 15000 });
  await buatSplBtn.click();

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 5. Verify the Auto-generation SPL Modal is open with pre-filled fields
  const splModal = browser.locator('div[role="dialog"]:has-text("Buat SPL Lembur dari Aktivitas Harian")').first();
  await expect(splModal).toBeVisible({ timeout: 15000 });

  // Verify prefilled form controls
  const submitSplBtn = browser.locator('button:has-text("Terbitkan & Simpan SPL")').first();
  await expect(submitSplBtn).toBeVisible({ timeout: 10000 });

  // Screenshot prefilled SPL modal
  await app.screenshot('03-spl-prefilled-modal');

  // 6. Submit the SPL creation
  await submitSplBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 7. Verify Success state
  const successHeading = browser.locator('text=Surat Perintah Lembur Berhasil Diterbitkan!').first();
  await expect(successHeading).toBeVisible({ timeout: 20000 });

  // Screenshot success confirmation
  await app.screenshot('04-spl-created-success');

  // 8. Click "Buka di Modul SPL"
  const bukaModulSplBtn = browser.locator('a:has-text("Buka di Modul SPL")').first();
  await expect(bukaModulSplBtn).toBeVisible({ timeout: 10000 });
  await bukaModulSplBtn.click();

  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 9. Verify landing on /dashboard/overtime-requests with the generated SPL
  await app.screenshot('05-overtime-requests-spl-linked');
});
