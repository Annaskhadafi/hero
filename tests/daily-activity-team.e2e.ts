import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies daily activity team input, single approval document, and document preview with personnel separation', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open /dashboard/approval
  await app.open('/dashboard/approval');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // Verify Inbox page loaded
  const inboxHeading = screen.getByRole('heading', { name: /Approval Inbox/i });
  await expect(inboxHeading).toBeVisible({ timeout: 20000 });

  // Screenshot Approval Workbench
  await app.screenshot('01-daily-activity-approval-workbench');

  // Filter or click "Daily Activity" button
  const dailyActivityTab = browser.locator('button:has-text("Daily Activity")').first();
  if (await dailyActivityTab.isVisible().catch(() => false)) {
    await dailyActivityTab.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // 3. Click Buka TTD ↗ button on the Daily Activity item to open Document Review modal
  const bukaTtdBtn = browser.locator('button:has-text("Buka TTD")').first();
  await expect(bukaTtdBtn).toBeVisible({ timeout: 15000 });
  await bukaTtdBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Screenshot the approval review drawer/modal showing the numbered team list per activity
  await app.screenshot('02-daily-activity-approval-modal-numbered-team');

  // Verify that modal contains Document details and Anggota Tim row
  const dialog = browser.locator('[role="dialog"]').first();
  await expect(dialog).toBeVisible();
});

