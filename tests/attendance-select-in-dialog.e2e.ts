import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify select dropdown inside dialog renders on top of dialog', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open /dashboard/scheduling-timesheet/attendance explicitly
  await app.open('/dashboard/scheduling-timesheet/attendance');
  await new Promise((resolve) => setTimeout(resolve, 3500));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Find and click "Tambah Attendance" button
  const addAttendanceBtn = browser.locator('button:has-text("Tambah Attendance")').first();
  await expect(addAttendanceBtn).toBeVisible({ timeout: 20000 });
  await addAttendanceBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 4. Verify Dialog is open
  const dialogTitle = browser.locator(':has-text("Tambah Attendance")').first();
  await expect(dialogTitle).toBeVisible();

  // 5. Find the Site Select Trigger inside the dialog
  const selectTrigger = browser.locator('[data-slot="dialog-content"] button[role="combobox"]').first();
  await expect(selectTrigger).toBeVisible();

  // Click the select trigger to open the options dropdown
  await selectTrigger.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 6. Verify SelectContent options are visible
  const selectContent = browser.locator('[data-slot="select-content"]').first();
  await expect(selectContent).toBeVisible();

  // Screenshot proving select dropdown is cleanly visible ON TOP of the dialog
  await app.screenshot('01-attendance-select-dropdown-on-top');

  // Verify stacking order in DOM: select-content must be on top of dialog-content
  const isAbove = await browser.evaluate(() => {
    const dialog = document.querySelector('[data-slot="dialog-content"]');
    const select = document.querySelector('[data-slot="select-content"]');
    if (!dialog || !select) return { found: false, error: 'dialog or select missing' };

    const selectRect = select.getBoundingClientRect();

    // Check elementFromPoint at the center of the select dropdown
    const checkX = selectRect.left + selectRect.width / 2;
    const checkY = selectRect.top + Math.min(20, selectRect.height / 2);
    const topEl = document.elementFromPoint(checkX, checkY);

    const isSelectOrDescendant = select.contains(topEl);
    return {
      found: true,
      isSelectOrDescendant,
      topElTagName: topEl ? topEl.tagName : null,
      topElClass: topEl ? topEl.className : null,
      dialogZ: window.getComputedStyle(dialog).zIndex,
      selectZ: window.getComputedStyle(select).zIndex,
    };
  });

  console.log('ElementFromPoint hit test result:', isAbove);
  expect(isAbove.found).toBe(true);
  expect(isAbove.isSelectOrDescendant).toBe(true);
});
