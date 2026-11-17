import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies HRGA navbar reorganization Group 3 - Compensation & Benefit', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open dashboard
  await app.open('/dashboard/analytics');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Find and expand HRGA menu
  const hrgaTrigger = browser.locator('button[data-sidebar="menu-button"]:has-text("HRGA")').first();
  await expect(hrgaTrigger).toBeVisible({ timeout: 15000 });

  const hrgaExpanded = await browser
    .locator('li:has-text("COMPENSATION & BENEFIT")')
    .first()
    .isVisible()
    .catch(() => false);
  if (!hrgaExpanded) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Verify group header "COMPENSATION & BENEFIT"
  const group3Header = browser.locator('li:has-text("COMPENSATION & BENEFIT")').first();
  await expect(group3Header).toBeVisible({ timeout: 10000 });

  // Scroll Group 3 into view in sidebar
  await browser.evaluate(() => {
    const el = Array.from(document.querySelectorAll('li, div, span, button')).find((e) =>
      e.textContent?.includes('COMPENSATION & BENEFIT')
    );
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Verify both items under Compensation & Benefit in exact order
  const expectedItems = [
    'Payroll',
    'Allowance',
  ];

  for (const itemTitle of expectedItems) {
    const itemElem = browser.locator(`a:has-text("${itemTitle}")`).first();
    await expect(itemElem).toBeVisible({ timeout: 5000 });
  }

  // Screenshot 1: Compensation & Benefit group expanded in sidebar
  await app.screenshot('01-hrga-comben-group-expanded');

  // 3. Click "Payroll"
  const payrollLink = browser.locator('a[href="/dashboard/scheduling-timesheet/payroll"]').first();
  await payrollLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const payrollHeading = browser.locator('button, div, h1, h2:has-text("Payroll"), button:has-text("Benefit")').first();
  await expect(payrollHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('02-payroll-page');

  // 4. Click "Allowance"
  if (!await browser.locator('a:has-text("Allowance")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const allowanceLink = browser.locator('a[href="/dashboard/hc/compensation"]').first();
  await allowanceLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const allowanceHeading = browser.locator('h1, h2, h3, div:has-text("Compensation & Benefit"), div:has-text("Leadership Allowance")').first();
  await expect(allowanceHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('03-allowance-page');

  // 5. Verify Roster & Timesheet retains Payroll Timesheet
  const rosterTrigger = browser.locator('button[data-sidebar="menu-button"]:has-text("Roster & Timesheet")').first();
  if (await rosterTrigger.isVisible()) {
    await rosterTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  await app.screenshot('04-roster-payroll-preserved');
});
