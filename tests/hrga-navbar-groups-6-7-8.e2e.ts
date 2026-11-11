import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies HRGA navbar reorganization Group 6 (Wellbeing & Engagement), Group 7 (Performance Management), and Group 8 (General Affair)', async ({
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
    .locator('li:has-text("WELLBEING & ENGAGEMENT")')
    .first()
    .isVisible()
    .catch(() => false);
  if (!hrgaExpanded) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Verify group headers: WELLBEING & ENGAGEMENT, PERFORMANCE MANAGEMENT, GENERAL AFFAIR
  const group6Header = browser.locator('li:has-text("WELLBEING & ENGAGEMENT")').first();
  await expect(group6Header).toBeVisible({ timeout: 10000 });

  const group7Header = browser.locator('li:has-text("PERFORMANCE MANAGEMENT")').first();
  await expect(group7Header).toBeVisible({ timeout: 10000 });

  const group8Header = browser.locator('li:has-text("GENERAL AFFAIR")').first();
  await expect(group8Header).toBeVisible({ timeout: 10000 });

  // Scroll Group 6, 7, 8 into view in sidebar
  await browser.evaluate(() => {
    const el = Array.from(document.querySelectorAll('li, div, span, button')).find((e) =>
      e.textContent?.includes('WELLBEING & ENGAGEMENT')
    );
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Verify expected items under Groups 6, 7, and 8
  const expectedItems = [
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

  for (const itemTitle of expectedItems) {
    const itemElem = browser.locator(`a:has-text("${itemTitle}")`).first();
    await expect(itemElem).toBeVisible({ timeout: 5000 });
  }

  // Verify that purged legacy groups do NOT exist in sidebar
  const legacyHeaders = [
    'DATA & AKSES KARYAWAN',
    'LAYANAN & PERSONALIA',
    'GENERAL AFFAIRS (GA)',
    'KINERJA & KPI',
  ];
  for (const lh of legacyHeaders) {
    const isVisible = await browser.locator(`li:has-text("${lh}")`).first().isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  }

  // Screenshot 1: Groups 6, 7, 8 expanded in sidebar
  await app.screenshot('01-hrga-groups-6-7-8-expanded');

  // 3. Test MCU
  const mcuLink = browser.locator('a[href="/dashboard/hc/mcu-wellness"]').first();
  await mcuLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const mcuHeading = browser.locator(':has-text("MCU")').first();
  await expect(mcuHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('02-mcu-page');

  // 4. Test Hero Point
  if (!await browser.locator('a:has-text("Hero Point")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const heroPointLink = browser.locator('a:has-text("Hero Point")').first();
  await heroPointLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const pointHeading = browser.locator(':has-text("Papan Peringkat"), :has-text("Leaderboard")').first();
  await expect(pointHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('03-hero-point-page');

  // 5. Test List Kegiatan Olahraga
  if (!await browser.locator('a:has-text("List Kegiatan Olahraga")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const olahragaLink = browser.locator('a[href="/dashboard/hc/olahraga"]').first();
  await olahragaLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const olahragaHeading = browser.locator(':has-text("List Kegiatan Olahraga")').first();
  await expect(olahragaHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('04-olahraga-page');

  // 6. Test Pengaduan
  if (!await browser.locator('a:has-text("Pengaduan")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const pengaduanLink = browser.locator('a[href="/dashboard/curhat"]').first();
  await pengaduanLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const pengaduanHeading = browser.locator('h1:has-text("Pengaduan"), div:has-text("Pengaduan")').first();
  await expect(pengaduanHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('05-pengaduan-page');

  // 7. Test Employee Performance
  if (!await browser.locator('a:has-text("Employee Performance")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const employeePerfLink = browser.locator('a[href="/dashboard/hc/performance"]').first();
  await employeePerfLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const employeePerfHeading = browser.locator(':has-text("Performance Review"), :has-text("Penilaian Kinerja")').first();
  await expect(employeePerfHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('06-employee-performance-page');

  // 8. Test Vehicle Management
  if (!await browser.locator('a:has-text("Vehicle Management")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const vehicleLink = browser.locator('a[href="/dashboard/ga/vehicles"]').first();
  await vehicleLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const vehicleHeading = browser.locator(':has-text("Vehicle"), :has-text("Kendaraan")').first();
  await expect(vehicleHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('07-vehicle-management-page');

  // 9. Test ATK
  if (!await browser.locator('a:has-text("ATK")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const atkLink = browser.locator('a[href="/dashboard/ga/atk"]').first();
  await atkLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const atkHeading = browser.locator(':has-text("ATK")').first();
  await expect(atkHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('08-atk-page');

  // 10. Test Rental House
  if (!await browser.locator('a:has-text("Rental House")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const rentalLink = browser.locator('a[href="/dashboard/ga/house-rental"]').first();
  await rentalLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const rentalHeading = browser.locator(':has-text("House Rental"), :has-text("Rental House"), :has-text("Mess")').first();
  await expect(rentalHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('09-rental-house-page');
});
