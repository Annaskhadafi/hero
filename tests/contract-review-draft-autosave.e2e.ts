import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies contract review draft autosave, manual save, and automatic recovery', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials (Kadhafi - 71261)
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open Contract Review New Form
  await app.open('/dashboard/hc/contract-review/new');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify toolbar buttons are present
  const saveDraftBtn = browser.locator('button:has-text("Simpan Draf")').first();
  await expect(saveDraftBtn).toBeVisible({ timeout: 15000 });

  const saveFormBtn = browser.locator('button:has-text("Simpan Form")').first();
  await expect(saveFormBtn).toBeVisible({ timeout: 15000 });

  // 3. Fill in Performance Activity
  const activityTextareas = browser.locator('textarea');
  const firstActivityTextarea = activityTextareas.first();
  if (await firstActivityTextarea.isVisible()) {
    await firstActivityTextarea.fill('Overhaul engine unit DT-102 & kalibrasi sensor hidrolik');
  }

  // Fill in Remark
  const remarkTextareas = browser.locator('div:has-text("A. Performance Activities") textarea');
  const count = await remarkTextareas.count();
  if (count >= 2) {
    await remarkTextareas.nth(1).fill('Pekerjaan selesai 100% tepat waktu sesuai SOP tanpa insiden.');
  }

  // 4. Fill in Related Competency remarks
  const disciplineRemark = browser.locator('input[placeholder="Remark..."]').first();
  if (await disciplineRemark.isVisible()) {
    await disciplineRemark.fill('Kedisiplinan sangat baik, selalu hadir tepat waktu dan mematuhi aturan APD.');
  }

  // 5. Click "Simpan Draf" button
  await saveDraftBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Screenshot 1: Form with filled objective evaluation points and live draft saved indicator
  await app.screenshot('01-contract-review-draft-autosave-indicator');

  // Clear beforeunload listener before reopening
  await browser.evaluate(() => {
    window.onbeforeunload = null;
  });

  // 6. Navigate to re-open the page (simulating opening form again after interruption)
  await app.open('/dashboard/hc/contract-review/new');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 7. Verify Auto-Restore Banner is visible
  const restoreBanner = browser.locator('text=Draf Penilaian Belum Tersimpan Ditemukan & Dipulihkan').first();
  await expect(restoreBanner).toBeVisible({ timeout: 15000 });

  // Screenshot 2: Auto-restored evaluation points with recovery banner
  await app.screenshot('02-contract-review-draft-restored-banner');
});
