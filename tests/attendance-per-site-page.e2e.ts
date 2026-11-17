import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify attendance list uses standard table like schedule v2 and each site has dedicated persistent page', { timeout: 600000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials directly to attendance page
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance');
  await browser.waitForURL('**/dashboard/**', { timeout: 120000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 2. Verify Attendance table list (clean standard table like Schedule V2)
  const attendanceTable = browser.locator('table').first();
  await expect(attendanceTable).toBeVisible({ timeout: 240000 });

  // Verify "Tambah Attendance" button is present on the toolbar
  const addAttendanceBtn = browser.locator('button:has-text("Tambah Attendance")').first();
  await expect(addAttendanceBtn).toBeVisible();

  // Capture screenshot of the clean attendance table list (matching Schedule V2 standard, no extra card grid)
  await app.screenshot('01-attendance-table-list-view');

  // 3. Test clicking "Lihat attendance" (Eye icon button) in table row - must navigate directly in the SAME tab
  const viewActionLink = browser.locator('a[aria-label="Lihat attendance"], button[aria-label="Lihat attendance"]').first();
  await expect(viewActionLink).toBeVisible({ timeout: 30000 });
  await viewActionLink.click({ timeout: 120000 });

  // Wait for navigation to complete in the SAME tab (without opening new tab)
  await expect.poll(async () => {
    const url = await browser.url();
    return url;
  }, { timeout: 60000 }).toContain('/dashboard/scheduling-timesheet/attendance/');

  // Verify attendance workspace is open directly (Save Attendance button and Kembali ke list button are visible)
  const saveAttendanceBtn = browser.locator('button:has-text("SAVE ATTENDANCE")').first();
  await expect(saveAttendanceBtn).toBeVisible({ timeout: 120000 });

  // Verify "Kembali ke list" button is present
  const backBtn = browser.locator('button:has-text("KEMBALI KE LIST"), button:has-text("Kembali ke list")').first();
  await expect(backBtn).toBeVisible({ timeout: 30000 });

  // Capture current URL to test browser refresh persistence
  const siteUrl = await browser.url();

  // Screenshot proving dedicated per-site workspace is open via action button
  await app.screenshot('02-attendance-dedicated-site-workspace');

  // 4. CRITICAL TEST: REFRESH the page (Simulating user F5 refresh on their site page)
  await app.open(siteUrl);
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Verify that after refresh, user remains on the dedicated site page and workspace remains open
  const refreshedUrl = await browser.url();
  expect(refreshedUrl).toContain('/dashboard/scheduling-timesheet/attendance/');
  await expect(saveAttendanceBtn).toBeVisible({ timeout: 120000 });
  await expect(backBtn).toBeVisible({ timeout: 30000 });

  // Screenshot proving persistence after refresh (user doesn't need to re-enter or re-search)
  await app.screenshot('03-attendance-persisted-after-refresh');

  // 5. Test returning to list via "Kembali ke list" button
  await backBtn.click({ timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await expect(attendanceTable).toBeVisible({ timeout: 120000 });

  // Final confirmation screenshot of the verified flow
  await app.screenshot('04-attendance-flow-verified');
});
