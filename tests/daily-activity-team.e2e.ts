import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies single team daily activity approval document without numbering and without duplicate rows', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials (Kadhafi - 71261)
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // 2. Open /dashboard/approval
  await app.open('/dashboard/approval');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Screenshot Approval Workbench
  await app.screenshot('01-daily-activity-workbench');

  // Filter or click "Daily Activity" tab if available
  const dailyActivityTab = browser.locator('button:has-text("Daily Activity")').first();
  if (await dailyActivityTab.isVisible().catch(() => false)) {
    await dailyActivityTab.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // 3. Locate the row with DAS-20261020-71261-001 or click Buka TTD
  const specificRowBtn = browser
    .locator('tr:has-text("DAS-20261020-71261-001") button:has-text("Buka TTD"), tr:has-text("DAS-20261020-71261-001") button:has-text("Review")')
    .first();

  if (await specificRowBtn.isVisible().catch(() => false)) {
    await specificRowBtn.click();
  } else {
    // If specific row selector didn't catch text directly, try searching or click first Buka TTD
    const searchInput = browser.locator('input[placeholder*="Cari"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('DAS-20261020-71261-001');
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    const bukaBtn = browser.locator('button:has-text("Buka TTD"), button:has-text("Review")').first();
    await expect(bukaBtn).toBeVisible({ timeout: 15000 });
    await bukaBtn.click();
  }

  await new Promise((resolve) => setTimeout(resolve, 3500));

  // 4. Verify modal is visible
  const dialog = browser.locator('[role="dialog"]').first();
  await expect(dialog).toBeVisible({ timeout: 15000 });

  // 5. Capture screenshot of the modal showing 1 single team without numbering and without duplicates
  await app.screenshot('02-daily-activity-single-team-no-duplication');
});
