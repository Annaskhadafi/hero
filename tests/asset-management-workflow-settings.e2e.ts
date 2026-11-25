import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify Asset Management Workflow settings panel and testing guardrail', async ({ app, screen, browser }) => {
  // 1. Login to HERO then navigate directly to settings email page
  await loginToHero(app, screen, browser, {
    targetUrl: '/dashboard/settings/email',
  });

  // Wait for redirect to the target page after successful login
  await browser.waitForURL('**/dashboard/settings/email**', { timeout: 60000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // If still on sign-in page, perform explicit login
  const currentUrl = await browser.url ? String(browser.url()) : '';
  if (currentUrl.includes('/sign-in')) {
    await browser.locator('#employeeSn, input[name="employeeSn"]').first().fill('71261');
    await browser.locator('#password, input[name="password"]').first().fill('Chitra#71261');
    await browser.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first().click();
    await browser.waitForURL('**/dashboard/**', { timeout: 60000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // Navigate to target page after login
    await app.open('/dashboard/settings/email');
    await browser.waitForURL('**/dashboard/settings/email**', { timeout: 30000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Hide floating chat widget
  await browser.evaluate(() => {
    document.querySelectorAll('[title*="Hero Genius"]').forEach((el: any) => {
      el.style.display = 'none';
    });
  });

  // 2. Click tab "Asset Management Workflow" - Radix TabsTrigger renders as role="tab"
  const workflowTab = browser.locator('[role="tab"]:has-text("Asset Management Workflow")').first();
  await expect(workflowTab).toBeVisible({ timeout: 15000 });
  await workflowTab.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 3. Verify the panel is rendered
  const panelHeader = browser.locator('h2:has-text("Asset Management Workflow"), h3:has-text("Asset Management Workflow"), h1:has-text("Asset Management Workflow")').first();
  await expect(panelHeader).toBeVisible({ timeout: 8000 });

  // Verify testing mode badge & section
  const testingBadge = browser.locator('text=TESTING MODE AKTIF').first();
  await expect(testingBadge).toBeVisible({ timeout: 8000 });

  const testingGuardrailTitle = browser.locator('text=Mode Testing Approval (Admin Override Guardrail)').first();
  await expect(testingGuardrailTitle).toBeVisible({ timeout: 8000 });

  // Verify email input is populated with Gilang's email
  const testingEmailInput = browser.locator('input#testingRecipientEmail, input[name="testingRecipientEmail"]').first();
  await expect(testingEmailInput).toBeVisible({ timeout: 8000 });
  const emailVal = await testingEmailInput.inputValue();
  expect(emailVal).toContain('gilang.suryo@chitraparatama.co.id');

  // Verify approver select
  const approverSelect = browser.locator('select#testingApproverEmployeeId, select[name="testingApproverEmployeeId"]').first();
  await expect(approverSelect).toBeVisible({ timeout: 8000 });

  // Verify all 4 forms in Asset Management Group
  await expect(browser.locator('text=CER (Pengadaan Aset)').first()).toBeVisible();
  await expect(browser.locator('text=Asset Borrow (Peminjaman)').first()).toBeVisible();
  await expect(browser.locator('text=Asset Transfer (Mutasi)').first()).toBeVisible();
  await expect(browser.locator('text=Asset Disposal (Penghapusan)').first()).toBeVisible();

  // Verify that old CER PIC distribution section is removed
  await expect(browser.locator('text=Distribusi Dokumen & PIC Pengadaan Aset')).toHaveCount(0);

  // 4. Take screenshot of the Asset Management Workflow settings panel
  await app.screenshot('asset-management-workflow-settings');
  await new Promise((resolve) => setTimeout(resolve, 1000));
});
