import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify custom category for attendance permission late reason', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials and open mobile attendance permission page
  await loginToHero(app, screen, browser, '/mobile/attendance/permission');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await app.open('/mobile/attendance/permission');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();

  // 2. Select permission type "late" (Terlambat)
  const typeSelect = browser.locator('select[name="permissionType"]').first();
  await expect(typeSelect).toBeVisible();
  await typeSelect.selectOption('Terlambat');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. Find late reason dropdown
  const lateReasonSelect = browser.locator('select').nth(1);
  await expect(lateReasonSelect).toBeVisible();

  // 4. Select "Lainnya (Kustom)..." to trigger custom input
  await lateReasonSelect.selectOption('Lainnya (Kustom)...');
  await new Promise((resolve) => setTimeout(resolve, 800));

  // 5. Verify custom category input appears
  const customInput = browser.locator('input[name="customLateReason"]').first();
  await expect(customInput).toBeVisible({ timeout: 10000 });

  // 6. Fill custom reason for KPC football case
  await customInput.fill('Memperkuat Tim Bola KPC');

  // Fill return time
  const returnTimeInput = browser.locator('input[name="returnTime"]').first();
  await returnTimeInput.fill('10:00');

  // Fill detail reason
  const reasonTextarea = browser.locator('textarea[name="reason"]').first();
  await reasonTextarea.fill('Dispensasi pertandingan sepak bola turnamen KPC');

  // 7. Take screenshot showing custom category field filled
  await app.screenshot('attendance-permission-custom-kpc-category');

  // 8. Also test selecting predefined KPC category
  await lateReasonSelect.selectOption('Tugas / Kegiatan KPC & Perusahaan');
  await new Promise((resolve) => setTimeout(resolve, 800));
  // Custom input should now disappear
  await expect(customInput).not.toBeVisible();

  // 9. Switch back to Lainnya and take final verified screenshot
  await lateReasonSelect.selectOption('Lainnya (Kustom)...');
  await new Promise((resolve) => setTimeout(resolve, 800));
  await customInput.fill('Memperkuat Tim Bola KPC');

  await app.screenshot('attendance-permission-kpc-soccer-ready');
});
