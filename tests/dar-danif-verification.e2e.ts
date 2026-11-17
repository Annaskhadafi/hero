import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies DAR PPA BIB Moh Danif Pratama has all 6 items rendered in approval document', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials (Kadhafi - 71261)
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open the approval document page for session 938 (DAS-20261021-76793-771)
  await app.open('/dashboard/activity-hub/document/938/approval');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Wait for the document header & total items to be visible
  const summaryHeader = browser.locator('text=Total: 6 item, 10 poin').first();
  await expect(summaryHeader).toBeVisible({ timeout: 15000 });

  // Scroll down so the table rows of all 6 activities are in view
  await browser.evaluate(() => {
    window.scrollBy(0, 350);
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Assert all 6 activities are in DOM and visible
  await expect(browser.locator('text=HSE-001').first()).toBeVisible({ timeout: 10000 });
  await expect(browser.locator('text=P2H').first()).toBeVisible({ timeout: 10000 });
  await expect(browser.locator('text=SVC.SEM-027').first()).toBeVisible({ timeout: 10000 });
  await expect(browser.locator('text=SVC.STB-001').first()).toBeVisible({ timeout: 10000 });
  await expect(browser.locator('text=SVC.STB-002').first()).toBeVisible({ timeout: 10000 });
  await expect(browser.locator('text=Clean Up').first()).toBeVisible({ timeout: 10000 });

  // 3. Capture screenshot of the table with all 6 items
  await app.screenshot('dar-ppa-bib-danif-all-6-activities');
});
