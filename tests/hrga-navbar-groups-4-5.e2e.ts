import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies HRGA navbar reorganization Group 4 (Industrial Relation) and Group 5 (Learning Development)', async ({
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
    .locator('li:has-text("INDUSTRIAL RELATION")')
    .first()
    .isVisible()
    .catch(() => false);
  if (!hrgaExpanded) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Verify group header "INDUSTRIAL RELATION"
  const group4Header = browser.locator('li:has-text("INDUSTRIAL RELATION")').first();
  await expect(group4Header).toBeVisible({ timeout: 10000 });

  // Verify group header "LEARNING DEVELOPMENT"
  const group5Header = browser.locator('li:has-text("LEARNING DEVELOPMENT")').first();
  await expect(group5Header).toBeVisible({ timeout: 10000 });

  // Scroll Group 4 and 5 into view in sidebar
  await browser.evaluate(() => {
    const el = Array.from(document.querySelectorAll('li, div, span, button')).find((e) =>
      e.textContent?.includes('INDUSTRIAL RELATION')
    );
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Verify items in Group 4 and Group 5
  const expectedItems = [
    'Corporate Partnership',
    'List Sertifikasi',
    'List Training',
  ];

  for (const itemTitle of expectedItems) {
    const itemElem = browser.locator(`a:has-text("${itemTitle}")`).first();
    await expect(itemElem).toBeVisible({ timeout: 5000 });
  }

  // Screenshot 1: Groups 4 and 5 expanded in sidebar
  await app.screenshot('01-hrga-groups-4-5-expanded');

  // 3. Click "Corporate Partnership"
  const partnershipLink = browser.locator('a[href="/dashboard/hc/kerjasama"]').first();
  await partnershipLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const partnershipHeading = browser.locator('h1, h2, div:has-text("Kemitraan"), div:has-text("Kerjasama")').first();
  await expect(partnershipHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('02-corporate-partnership-page');

  // 4. Click "List Sertifikasi"
  if (!await browser.locator('a:has-text("List Sertifikasi")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const sertifikasiLink = browser.locator('a[href="/dashboard/training-records?tab=sio"]').first();
  await sertifikasiLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const sertifikasiHeading = browser.locator(':has-text("Database Sertifikasi")').first();
  await expect(sertifikasiHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('03-list-sertifikasi-page');

  // 5. Click "List Training"
  if (!await browser.locator('a:has-text("List Training")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const trainingLink = browser.locator('a[href="/dashboard/training-records"]').first();
  await trainingLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const trainingHeading = browser.locator(':has-text("riwayat training")').first();
  await expect(trainingHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('04-list-training-page');
});
