import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies employee can select atasan / approver when inputting daily activity', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard test credentials and navigate to My Day page
  await loginToHero(app, screen, browser, '/dashboard/activity-hub/my-day');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Screenshot My Day dashboard
  await app.screenshot('01-my-day-dashboard');

  // 2. Click "+ Tambah Aktivitas" button to open creation modal
  const tambahBtn = browser.locator('button:has-text("Tambah Aktivitas")').first();
  await expect(tambahBtn).toBeVisible({ timeout: 15000 });
  await tambahBtn.click();

  // 3. Verify modal is visible with retry in case of click race condition
  const modal = browser.locator('div[role="dialog"]').first();
  try {
    await expect(modal).toBeVisible({ timeout: 5000 });
  } catch {
    await tambahBtn.click();
    await expect(modal).toBeVisible({ timeout: 10000 });
  }

  // Screenshot modal opened
  await app.screenshot('02-daily-activity-create-modal');

  // 4. Scroll down to Signatories section & locate Leader / Supervisor / PJO selector
  const leaderLabel = browser.locator('label:has-text("Leader / Supervisor / PJO")');
  await expect(leaderLabel).toBeVisible({ timeout: 10000 });

  // Locate the SearchableSelect button for Leader
  const leaderBtn = browser.locator('button[aria-label="Leader"], button:has-text("PILIH LEADER"), button:has-text("ATASAN LANGSUNG"), button:has-text("HEAD LOCATION")').first();
  await expect(leaderBtn).toBeVisible({ timeout: 10000 });

  // 5. Click the dropdown to show approver candidates list
  await leaderBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Screenshot open approver dropdown showing options
  await app.screenshot('03-approver-dropdown-options');

  // Verify candidate options exist in dropdown
  const optionBtn = browser.locator('button:has-text("PJO / HEAD LOCATION"), button:has-text("ATASAN LANGSUNG")').first();
  await expect(optionBtn).toBeVisible({ timeout: 10000 });

  // 6. Select PJO / Head Location from the list
  await optionBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Screenshot with chosen approver
  await app.screenshot('04-approver-selected');
});
