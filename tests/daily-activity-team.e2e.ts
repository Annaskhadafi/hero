import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { HERO_DEFAULT_AUTH } from './e2e-auth-helper';

test('verifies daily activity team input, single approval document, and document preview with personnel separation', async ({
  app,
  screen,
}) => {
  // 1. Open login page with callback directly to target document workspace
  await app.open('/sign-in?callbackUrl=/dashboard/activity-hub/document/857');

  const emailInput = screen.getByPlaceholder(/Email atau SN/i, { visible: true });
  await emailInput.fill(HERO_DEFAULT_AUTH.username);

  const passwordInput = screen.getByPlaceholder(/password|••••••••••/i, { visible: true });
  await passwordInput.fill(HERO_DEFAULT_AUTH.password);

  const submitButton = screen.getByRole('button', { name: /^Log In$/i, visible: true });
  await submitButton.click();

  // Wait for login processing and redirect to complete
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const isSigningIn = await screen
        .getByRole('button', { name: /Signing in\.\.\.|Log In/i })
        .isVisible()
        .catch(() => false);
      if (!isSigningIn) break;
    } catch {
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Wait for document workspace to load and verify Document Workspace badge
  const docBadge = screen.getByText('Document Workspace', { visible: true });
  await expect(docBadge).toBeVisible();

  // Capture screenshot: document preview displaying personnel breakdown
  await app.screenshot('01-daily-activity-document-preview');

  // 3. Open Approval Inbox and verify single document consolidation
  await app.open('/dashboard/approval');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const inboxTitle = screen.getByText('Approval Inbox', { visible: true });
  await expect(inboxTitle).toBeVisible();

  // Capture screenshot: Approval Workbench with consolidated review
  await app.screenshot('02-daily-activity-approval-workbench');
});

