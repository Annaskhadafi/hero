import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify Asset Management Workflow settings panel and testing guardrail', async ({ app, screen, browser }) => {
  // 1. Login to HERO as standard admin
  await loginToHero(app, screen, browser, {
    targetUrl: '/dashboard/settings/email',
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open Settings > Email page
  await app.open('/dashboard/settings/email');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Hide floating chat widget
  await browser.evaluate(() => {
    document.querySelectorAll('[title*="Hero Genius"]').forEach((el: any) => {
      el.style.display = 'none';
    });
  });

  // 3. Click tab "Asset Management Workflow"
  const workflowTab = browser.locator('button:has-text("Asset Management Workflow")').first();
  await expect(workflowTab).toBeVisible();
  await workflowTab.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 4. Verify the panel is rendered
  const panelHeader = browser.locator('h2:has-text("Asset Management Workflow")').first();
  await expect(panelHeader).toBeVisible();

  // Verify testing mode badge & section
  const testingBadge = browser.locator('text=TESTING MODE AKTIF').first();
  await expect(testingBadge).toBeVisible();

  const testingGuardrailTitle = browser.locator('text=Mode Testing Approval (Admin Override Guardrail)').first();
  await expect(testingGuardrailTitle).toBeVisible();

  // Verify email input is populated with Gilang's email
  const testingEmailInput = browser.locator('input#testingRecipientEmail').first();
  await expect(testingEmailInput).toBeVisible();
  const emailVal = await testingEmailInput.inputValue();
  expect(emailVal).toContain('gilang.suryo@chitraparatama.co.id');

  // Verify approver select
  const approverSelect = browser.locator('select#testingApproverEmployeeId').first();
  await expect(approverSelect).toBeVisible();

  // 5. Take screenshot of the Asset Management Workflow settings panel
  await app.screenshot('asset-management-workflow-settings');
  await new Promise((resolve) => setTimeout(resolve, 1000));
});
