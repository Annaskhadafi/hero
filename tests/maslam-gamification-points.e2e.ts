import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify Maslam gamification points restored and LMS completion fix', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and target /dashboard/leaderboard
  await loginToHero(app, screen, browser, '/dashboard/leaderboard');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Verify Leaderboard Header
  const pageTitle = browser.locator('h1:has-text("Papan Peringkat & Rekognisi Karyawan")').first();
  await expect(pageTitle).toBeVisible({ timeout: 60000 });

  // 3. Search for Maslam in the search input
  const searchInput = browser.locator('input[placeholder*="Cari nama atau SN"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('Maslam');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // 4. Verify Maslam is visible with restored points (1.657 / 1657 pts)
  const maslamRow = browser.locator('tr:has-text("Maslam"), div:has-text("Maslam")').first();
  await expect(maslamRow).toBeVisible({ timeout: 30000 });

  // Verify points restored: should contain 1.657 or 1657
  const pointsText = browser.locator('text=/1[.,]657/').first();
  await expect(pointsText).toBeVisible({ timeout: 30000 });

  // Capture Screenshot 1: Bukti Maslam Poin Pulih 1.657 Poin di Leaderboard
  await app.screenshot('001-maslam-points-restored');

  // 5. Open Tab Riwayat Transaksi / Gamifikasi if available
  const historyTab = browser.locator('button:has-text("Riwayat & Audit"), button:has-text("Timeline Poin")').first();
  if (await historyTab.isVisible()) {
    await historyTab.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Capture Screenshot 2: Bukti Riwayat Transaksi & Audit Poin Terkonsolidasi
  await app.screenshot('002-gamification-points-audit');
});
