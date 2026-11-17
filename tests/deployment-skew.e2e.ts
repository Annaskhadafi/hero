import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify deployment skew handler intercepts server action not found error and shows friendly reload dialog', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials
  await loginToHero(app, screen, browser, '/dashboard/activity-hub/my-day');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open /dashboard/activity-hub/my-day explicitly
  await app.open('/dashboard/activity-hub/my-day');
  await new Promise((resolve) => setTimeout(resolve, 3500));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Trigger a simulated server action not found error (matching the user's screenshot error)
  await browser.evaluate(() => {
    // Dispatch unhandledrejection with the exact Next.js error message from the screenshot
    const errorMsg = 'Server Action "4000dd440475dbe3a7e85757fcd4d096d103d7d8d7" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action';
    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error(errorMsg)),
        reason: new Error(errorMsg),
      })
    );
  });

  // 4. Verify the user-friendly Recovery Dialog is displayed instead of raw toast
  const dialogTitle = browser.locator(':has-text("Pembaruan Sistem HERO")').first();
  await expect(dialogTitle).toBeVisible({ timeout: 5000 });

  const countdownText = browser.locator(':has-text("Memuat ulang halaman otomatis")').first();
  await expect(countdownText).toBeVisible();

  // Screenshot proving the graceful recovery dialog is visible
  await app.screenshot('01-deployment-skew-recovery-dialog');

  // 5. Click "Nanti (Salin Teks)" to verify canceling auto-reload works
  const cancelBtn = browser.locator('button:has-text("Nanti (Salin Teks)")').first();
  await expect(cancelBtn).toBeVisible();
  await cancelBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await expect(dialogTitle).not.toBeVisible();
  await app.screenshot('02-deployment-skew-dialog-dismissed');
});
