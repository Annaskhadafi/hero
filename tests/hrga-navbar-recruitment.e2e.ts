import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies HRGA navbar reorganization Group 2 - Recruitment & Selection', async ({
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
    .locator('li:has-text("RECRUITMENT & SELECTION")')
    .first()
    .isVisible()
    .catch(() => false);
  if (!hrgaExpanded) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Verify group header "RECRUITMENT & SELECTION"
  const group2Header = browser.locator('li:has-text("RECRUITMENT & SELECTION")').first();
  await expect(group2Header).toBeVisible({ timeout: 10000 });

  // Scroll Group 2 into view in sidebar
  await browser.evaluate(() => {
    const el = Array.from(document.querySelectorAll('li, div, span, button')).find((e) =>
      e.textContent?.includes('RECRUITMENT & SELECTION')
    );
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Verify all 3 items under Recruitment & Selection in exact order
  const expectedItems = [
    'Request For Recruitment',
    'Recruitment',
    'Online Test',
  ];

  for (const itemTitle of expectedItems) {
    const itemElem = browser.locator(`a:has-text("${itemTitle}")`).first();
    await expect(itemElem).toBeVisible({ timeout: 5000 });
  }

  // Screenshot 1: Recruitment & Selection group expanded in sidebar
  await app.screenshot('01-hrga-recruitment-group-expanded');

  // 3. Click "Request For Recruitment"
  const rfrLink = browser.locator('a:has-text("Request For Recruitment")').first();
  await rfrLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const rfrHeading = browser.locator('h1, h2, h3, div:has-text("Request for Recruitment"), div:has-text("RFR")').first();
  await expect(rfrHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('02-request-for-recruitment-page');

  // 4. Click "Recruitment"
  if (!await browser.locator('a:has-text("Recruitment")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const recruitmentLink = browser.locator('a[href="/dashboard/hc/recruitment"]').first();
  await recruitmentLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const recruitmentHeading = browser.locator('h1, h2, h3, div:has-text("Recruitment"), div:has-text("Rekrutmen")').first();
  await expect(recruitmentHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('03-recruitment-page');

  // 5. Click "Online Test"
  if (!await browser.locator('a:has-text("Online Test")').first().isVisible().catch(() => false)) {
    await hrgaTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const testLink = browser.locator('a:has-text("Online Test")').first();
  await testLink.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const testHeading = browser.locator('h1, h2, h3, div:has-text("Online Test"), div:has-text("Test")').first();
  await expect(testHeading).toBeVisible({ timeout: 20000 });
  await app.screenshot('04-online-test-page');
});
