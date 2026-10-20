import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify timesheet attendance, permission approver search, and daily activity form', { timeout: 450000 }, async ({ app, screen, browser }) => {
  // 1. Standard reliable authentication
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Test & Screenshot Timesheet for Dedy Hidayat & Rangga Gesta (Oct 18, 2026, site 138)
  await app.open('/dashboard/scheduling-timesheet/attendance?siteId=138&period=2026-10');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // Click on AMM Mifa Hauling row to open Attendance Workspace Grid
  const mifaRow = browser.locator('tr:has-text("AMM Mifa Hauling"), td:has-text("AMM Mifa Hauling")').first();
  if (await mifaRow.isVisible()) {
    await mifaRow.click();
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Scroll down into the attendance table
  await browser.evaluate(() => window.scrollBy(0, 650));
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Filter for Dedy Hidayat
  const empSearch = browser.locator('input[placeholder*="Cari nama karyawan"]').first();
  if (await empSearch.isVisible()) {
    await empSearch.fill('Dedy');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Scroll the table horizontally so Day 18 is prominently visible
  await browser.evaluate(() => {
    const tableContainer = document.querySelector('.overflow-x-auto');
    if (tableContainer) {
      tableContainer.scrollLeft = 850;
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await app.screenshot('timesheet-dedy-oct18-masuk');

  // Filter for Rangga Gesta
  if (await empSearch.isVisible()) {
    await empSearch.fill('Rangga');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  await app.screenshot('timesheet-rangga-oct18-masuk');

  // 3. Test & Screenshot Izin / Sakit Mobile (Approver List including Reza Hendrawan)
  await app.open('/mobile/attendance/permission');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // Scroll down to Approver select
  await browser.evaluate(() => window.scrollBy(0, 500));
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const approverBtn = browser.locator('button[aria-label="Approver"]').first();
  if (await approverBtn.isVisible()) {
    await approverBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const searchInput = browser.locator('input[placeholder*="Cari Approver"], input[placeholder*="Cari"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Reza');
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  await app.screenshot('izin-sakit-mobile-reza-approver-search');

  // 4. Test & Screenshot Mobile Daily Activity Form
  await app.open('/mobile/activity/input');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();
  await app.screenshot('mobile-daily-activity-form-ready');
});
