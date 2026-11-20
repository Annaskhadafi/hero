import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify clarified safety man hours label with selected month on safety map header', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Navigate to /dashboard/safety
  await app.open('/dashboard/safety');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Verify Peta Sebaran Site & Status OSHE is visible
  await expect(browser.getByText('Peta Sebaran Site & Status OSHE')).toBeVisible({ timeout: 15000 });

  // 4. Verify the clarified label showing "Jam Kerja Aman (" with month name
  const manHoursLabel = browser.locator('text=/Jam Kerja Aman \\([^)]+\\):/');
  await expect(manHoursLabel).toBeVisible({ timeout: 10000 });

  // 5. Take screenshot of clarified safety dashboard
  await app.screenshot('safety-dashboard-man-hours-label-clarified');

  // 6. Assert with agent
  await agent.assert('The safety dashboard site map header displays the clarified label Jam Kerja Aman with the selected month label in parentheses');
});
