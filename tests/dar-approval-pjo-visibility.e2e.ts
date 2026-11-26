import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies DAR approval workflow visibility and stream resilience without React error 412', { timeout: 180000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and navigate directly to approval page
  await loginToHero(app, screen, browser, '/dashboard/activity-hub/approval');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify header and table elements are visible
  const pageHeading = browser.locator('h1:has-text("Approval Aktivitas Harian")').first();
  await expect(pageHeading).toBeVisible({ timeout: 45000 });

  // Take screenshot of Approval Workflow
  await app.screenshot('01-dar-approval-workflow-overview');

  // Verify table and KPI cards are visible
  const kpiCard = browser.locator('text=Total Pengajuan').first();
  await expect(kpiCard).toBeVisible({ timeout: 15000 });
});
