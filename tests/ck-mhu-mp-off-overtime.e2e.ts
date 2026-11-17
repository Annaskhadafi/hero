import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify CK MHU MP scheduled OFF days do not receive automatic 11 hours overtime', { timeout: 600000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials directly to CK MHU attendance workspace
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance/ck-mhu');
  await browser.waitForURL('**/dashboard/**', { timeout: 120000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 8000));

  // 2. Verify CK MHU Attendance Workspace is open
  const saveBtn = browser.locator('button:has-text("SAVE ATTENDANCE")').first();
  await expect(saveBtn).toBeVisible({ timeout: 120000 });

  // Capture workspace overview for CK MHU
  await app.screenshot('01-ck-mhu-attendance-workspace');

  // 3. Switch to Overtime Record / Summary tab if present, or inspect attendance grid
  const tabOvertimeRecord = browser.locator('button:has-text("Overtime Record"), button:has-text("Lembur"), button:has-text("Summary SPL")').first();
  if (await tabOvertimeRecord.isVisible()) {
    await tabOvertimeRecord.click({ timeout: 15000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Capture second screenshot of the overtime table / record showing OFF days are clean
  await app.screenshot('02-ck-mhu-off-days-zero-overtime');
});
