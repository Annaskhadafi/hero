import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Verify CER Delete Action & Confirmation Dialog', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });

  const screenshotDir = path.resolve(
    'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-delete'
  );
  fs.mkdirSync(screenshotDir, { recursive: true });

  // 1. Login with standard credentials
  console.log('Navigating to login page...');
  await page.goto('/sign-in', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);

  const usernameInput = page.locator('input[placeholder*="email atau SN"], #email, input[name="username"]').first();
  const passwordInput = page.locator('input[placeholder*="kata sandi"], #password, input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first();

  await usernameInput.click();
  await usernameInput.fill('71261');
  await passwordInput.click();
  await passwordInput.fill('Chitra#71261');
  await page.waitForTimeout(500);
  await submitButton.click();

  console.log('Submitted login credentials. Waiting for redirect...');
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  console.log('Login successful, on dashboard.');

  // 2. Navigate to CER page
  console.log('Navigating to CER page...');
  await page.goto('/dashboard/assets/cer', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3000);

  // Take screenshot of CER Table with Delete Action Button
  const deleteBtn = page.locator('button[title="Hapus Pengajuan"]').first();
  const hasDeleteBtn = await deleteBtn.isVisible();
  console.log('Delete button visible:', hasDeleteBtn);

  await page.screenshot({
    path: path.join(screenshotDir, '01_cer_table_with_delete_action.png'),
    fullPage: true,
  });

  if (hasDeleteBtn) {
    // Click delete button to show HeroConfirmDialog
    await deleteBtn.click();
    await page.waitForTimeout(1000);

    // Verify modal is visible
    await expect(page.locator('text=Hapus Pengajuan CER')).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, '02_cer_delete_confirm_dialog.png'),
      fullPage: false,
    });

    // Click Batal so we do not delete existing production/demo data unexpectedly
    const cancelBtn = page.locator('button:has-text("Batal")').last();
    await cancelBtn.click();
    await page.waitForTimeout(500);
  }
});
