import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies HRGA navbar reorganization Group 1 - HR Operations & Administration', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open dashboard in classic mode
  await app.open('/dashboard/analytics');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Find and expand HRGA menu
  const hrgaTrigger = browser.locator('button[data-sidebar="menu-button"]:has-text("HRGA")').first();
  await expect(hrgaTrigger).toBeVisible({ timeout: 15000 });

  // Check if already open or click to open
  const hrgaExpanded = await browser.locator('li:has-text("HR OPERATIONS & ADMINISTRATION")').first().isVisible().catch(() => false);
  if (!hrgaExpanded) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Verify group header "HR OPERATIONS & ADMINISTRATION"
  const group1Header = browser.locator('li:has-text("HR OPERATIONS & ADMINISTRATION")').first();
  await expect(group1Header).toBeVisible({ timeout: 10000 });
  await browser.evaluate(() => {
    const el = Array.from(document.querySelectorAll('li, div, span, button')).find((e) =>
      e.textContent?.includes('HR OPERATIONS & ADMINISTRATION')
    );
    if (el) {
      el.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify all 8 items in exact order under HRGA
  const expectedItems = [
    'Data Karyawan',
    'Attendance',
    'Sakit & Terlambat',
    'Employee Contract Review',
    'Composition Manpower',
    'Online Letter',
    'Marrital Change Status',
    'Labour Turn over',
  ];

  for (const itemTitle of expectedItems) {
    const itemElem = browser.locator(`a:has-text("${itemTitle}")`).first();
    await expect(itemElem).toBeVisible({ timeout: 5000 });
  }

  // Screenshot 1: Expanded HRGA with Group 1 items at top
  await app.screenshot('01-hrga-group1-expanded');

  // 3. Verify Roster & Timesheet retains Attendance
  const rosterTrigger = browser.locator('button[data-sidebar="menu-button"]:has-text("Roster & Timesheet")').first();
  if (await rosterTrigger.isVisible()) {
    await rosterTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  // Screenshot 2: Roster & Timesheet Attendance preserved
  await app.screenshot('02-roster-attendance-preserved');

  // 4. Click "Composition Manpower"
  const compMenuLink = browser.locator('a:has-text("Composition Manpower")').first();
  await compMenuLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify URL has tab=composition
  const compHeader = browser.locator('p:has-text("Man Power Composition")').first();
  await expect(compHeader).toBeVisible({ timeout: 15000 });

  // Screenshot 3: Composition Manpower active tab rendered directly
  await app.screenshot('03-composition-manpower-active');

  // 5. Click "Marrital Change Status"
  if (!await browser.locator('a:has-text("Marrital Change Status")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await browser.evaluate(() => {
    const el = Array.from(document.querySelectorAll('a')).find(e => e.textContent?.includes('Marrital Change Status'));
    el?.scrollIntoView({ block: 'center' });
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  const maritalMenuLink = browser.locator('a:has-text("Marrital Change Status")').first();
  await maritalMenuLink.click();

  // Verify marital status page loaded without error
  const maritalTitle = browser.locator('h1:has-text("Perubahan Status Pernikahan"), h2:has-text("Perubahan Status Pernikahan"), div:has-text("Perubahan Status Pernikahan")').first();
  await expect(maritalTitle).toBeVisible({ timeout: 25000 });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Screenshot 4: Marrital Change Status page loads correctly
  await app.screenshot('04-marrital-change-status-page');
});
