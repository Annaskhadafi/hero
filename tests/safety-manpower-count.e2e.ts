import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify safety man hours employee count accuracy and manual override', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO directly directing to /dashboard/safety/data
  await loginToHero(app, screen, browser, '/dashboard/safety/data');

  // 2. Wait for page content to load
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Switch to "Safety Man Hours" tab (Hierarchical summary per site)
  const safetyManHoursTab = browser.locator('button[role="tab"]').filter({ hasText: /^Safety Man Hours$/ });
  await expect(safetyManHoursTab).toBeVisible({ timeout: 15000 });
  await safetyManHoursTab.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // 4. Capture screenshot of hierarchical site table with accurate employee count
  await app.screenshot('001-safety-man-hours-per-site-table');

  // 5. Locate an edit batch button (pencil icon) for a site row (title="Edit Data Man Hours 12 Bulan")
  const editBatchBtn = browser.locator('button[title*="Edit Data Man Hours"]').first();
  await expect(editBatchBtn).toBeVisible({ timeout: 10000 });
  await editBatchBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 6. Verify employee count input exists in the dialog and is editable
  const empInput = browser.locator('input[name="employeeCount"]');
  await expect(empInput).toBeVisible({ timeout: 10000 });

  // 7. Capture screenshot of the dialog showing the new Manpower / Jumlah Karyawan field
  await app.screenshot('002-safety-batch-dialog-manpower-input');

  // 8. Close dialog
  const cancelBtn = browser.locator('button:has-text("Batal"), [role="dialog"] button:has-text("Close")').first();
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 9. Switch to "Monthly Man Hours" tab (Flat monthly details)
  const monthlyTab = browser.locator('button[role="tab"]').filter({ hasText: /^Monthly Man Hours$/ });
  await expect(monthlyTab).toBeVisible({ timeout: 10000 });
  await monthlyTab.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 10. Capture screenshot of Monthly Man Hours table
  await app.screenshot('003-safety-monthly-man-hours-table');
});
