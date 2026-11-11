import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies complete clean HRGA navbar with all 8 groups and zero legacy items', async ({
  app,
  screen,
  browser,
}) => {
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await app.open('/dashboard/analytics');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Expand HRGA menu
  const hrgaTrigger = browser.locator('button[data-sidebar="menu-button"]:has-text("HRGA")').first();
  await expect(hrgaTrigger).toBeVisible({ timeout: 15000 });

  const isOpsVisible = await browser
    .locator('li:has-text("HR OPERATIONS & ADMINISTRATION")')
    .first()
    .isVisible()
    .catch(() => false);
  if (!isOpsVisible) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // 1. Verify Top 4 Groups
  const topGroups = [
    'HR OPERATIONS & ADMINISTRATION',
    'RECRUITMENT & SELECTION',
    'COMPENSATION & BENEFIT',
    'INDUSTRIAL RELATION',
  ];
  for (const g of topGroups) {
    await expect(browser.locator(`li:has-text("${g}")`).first()).toBeVisible({ timeout: 5000 });
  }

  // Screenshot top 4 groups
  await browser.evaluate(() => {
    const el = Array.from(document.querySelectorAll('li, div, span, button')).find((e) =>
      e.textContent?.includes('HR OPERATIONS & ADMINISTRATION')
    );
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await app.screenshot('01-hrga-top-groups-clean');

  // 2. Verify Bottom 4 Groups
  const bottomGroups = [
    'LEARNING DEVELOPMENT',
    'WELLBEING & ENGAGEMENT',
    'PERFORMANCE MANAGEMENT',
    'GENERAL AFFAIR',
  ];
  for (const g of bottomGroups) {
    await expect(browser.locator(`li:has-text("${g}")`).first()).toBeVisible({ timeout: 5000 });
  }

  // Screenshot bottom 4 groups
  await browser.evaluate(() => {
    const el = Array.from(document.querySelectorAll('li, div, span, button')).find((e) =>
      e.textContent?.includes('WELLBEING & ENGAGEMENT')
    );
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await app.screenshot('02-hrga-bottom-groups-clean');

  // 3. Verify Legacy Groups are completely purged
  const legacyHeaders = [
    'DATA & AKSES KARYAWAN',
    'LAYANAN & PERSONALIA',
    'GENERAL AFFAIRS (GA)',
    'KINERJA & KPI',
    'GENERAL AFFAIRS', // exact plural
    'EMPLOYEE RELATIONS & INDUSTRIAL RELATIONS',
  ];
  for (const lh of legacyHeaders) {
    const isVisible = await browser.locator(`li:has-text("${lh}")`).first().isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  }

  // 4. Verify all 25 specific items exist in HRGA
  const all25Items = [
    'Data Karyawan',
    'Attendance',
    'Sakit & Terlambat',
    'Employee Contract Review',
    'Composition Manpower',
    'Online Letter',
    'Marrital Change Status',
    'Labour Turn over',
    'Request For Recruitment',
    'Recruitment',
    'Online Test',
    'Payroll',
    'Allowance',
    'Corporate Partnership',
    'List Sertifikasi',
    'List Training',
    'MCU',
    'Hero Point',
    'List Kegiatan Olahraga',
    'Pengaduan',
    'Employee Performance',
    'Leader Performance',
    'Vehicle Management',
    'ATK',
    'Rental House',
  ];

  for (const itemTitle of all25Items) {
    const el = browser.locator(`a:has-text("${itemTitle}")`).first();
    await expect(el).toBeAttached({ timeout: 5000 });
  }

  // Final full screenshot of dashboard
  await app.screenshot('03-hrga-complete-verification');
});
