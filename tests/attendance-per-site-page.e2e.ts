import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify each site in attendance has its own dedicated page that persists upon refresh', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials directly to attendance page
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Verify Dedicated Per-Site section is visible
  const dedicatedSiteSection = browser.locator('text=Halaman Site Attendance (Dedicated Per-Site)').first();
  await expect(dedicatedSiteSection).toBeVisible({ timeout: 60000 });

  // Capture screenshot of the attendance hub with per-site dedicated cards
  await app.screenshot('01-attendance-site-overview-grid');

  // 3. Test direct navigation to a specific site page (e.g. site 128 - CK MHU)
  await app.open('/dashboard/scheduling-timesheet/attendance/128');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify that attendance workspace is open directly without needing to search or click from list
  const attendanceTitle = browser.locator('h2:has-text("Attendance")').first();
  await expect(attendanceTitle).toBeVisible({ timeout: 60000 });

  // Verify the return to list button is present
  const backBtn = browser.locator('button:has-text("Kembali ke list")').first();
  await expect(backBtn).toBeVisible({ timeout: 30000 });

  // Screenshot proving dedicated per-site workspace is open
  await app.screenshot('02-attendance-dedicated-site-workspace');

  // 4. CRITICAL TEST: REFRESH the page (Simulating user F5 refresh)
  await app.open('/dashboard/scheduling-timesheet/attendance/128');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify that after refresh, user is STILL on the dedicated site page and workspace remains open
  const currentUrl = await browser.url();
  expect(currentUrl).toContain('/dashboard/scheduling-timesheet/attendance/128');
  await expect(attendanceTitle).toBeVisible({ timeout: 60000 });
  await expect(backBtn).toBeVisible({ timeout: 30000 });

  // Screenshot proving persistence after refresh (user doesn't need to re-enter or re-search)
  await app.screenshot('03-attendance-persisted-after-refresh');

  // 5. Test returning to list via "Kembali ke list" button
  await backBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify returned to root attendance list
  await expect(dedicatedSiteSection).toBeVisible({ timeout: 30000 });

  // Final confirmation screenshot of the list view
  await app.screenshot('04-attendance-flow-verified');
});
