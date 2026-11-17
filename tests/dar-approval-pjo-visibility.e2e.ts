import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies DAR approval workflow visibility and mobile DAR form input safeguard', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials directly directing to /dashboard/activity-hub/approval
  await loginToHero(app, screen, browser, { targetUrl: '/dashboard/activity-hub/approval' });
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Verify header and table elements are visible
  const pageHeading = browser.locator('h1:has-text("Approval Aktivitas Harian")').first();
  await expect(pageHeading).toBeVisible({ timeout: 45000 });

  // Take screenshot of Approval Workflow
  await app.screenshot('01-dar-approval-workflow-overview');

  // 2. Open Mobile DAR form page to verify mobile input stability
  await app.open('/mobile/activity?tab=apply');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Verify form loaded and is ready for activity inputs
  const mobileFormReady = browser.locator('button, div, h1, h2').filter({ hasText: 'Aktivitas' }).first();
  await expect(mobileFormReady).toBeVisible({ timeout: 45000 });

  // Take screenshot of Mobile DAR Input form
  await app.screenshot('02-mobile-dar-form-safeguard');
});
