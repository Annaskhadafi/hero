import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('opens sign-in page and verifies branding elements', async ({ app, screen }) => {
  await app.open('/sign-in');

  // Verify sign-in input elements exist
  const emailInput = screen.getByPlaceholder(/Email atau SN/i, { visible: true });
  await expect(emailInput).toBeVisible();

  const passwordInput = screen.getByPlaceholder(/password|••••••••••/i, { visible: true });
  await expect(passwordInput).toBeVisible();

  // Capture verification screenshot
  await app.screenshot('sign-in-page-loaded');
});
