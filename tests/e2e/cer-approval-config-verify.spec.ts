import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Verify Dedicated CER Approval Configuration Page & Navigation Guard', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });

  const screenshotDir = path.resolve(
    'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-config'
  );
  fs.mkdirSync(screenshotDir, { recursive: true });

  // 1. Login with standard credentials
  console.log('Navigating to login page...');
  await page.goto('/sign-in', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000); // Wait for React hydration

  const usernameInput = page.locator('input[placeholder*="email atau SN"], #email, input[name="username"]').first();
  const passwordInput = page.locator('input[placeholder*="kata sandi"], #password, input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first();

  await usernameInput.click();
  await usernameInput.fill('71261');
  await passwordInput.click();
  await passwordInput.fill('Chitra#71261');
  await page.waitForTimeout(600);
  await submitButton.click();

  console.log('Submitted login credentials. Waiting for redirect...');
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  console.log('Login successful, on dashboard.');

  // 2. Verify sidebar contains "Konfigurasi Approval CER"
  console.log('Checking sidebar navigation...');
  const configMenuLink = page.locator('a[href="/dashboard/assets/cer-approval-config"]').first();
  // If in collapsible section, click or check directly
  console.log('Navigating directly to /dashboard/assets/cer-approval-config...');
  await page.goto('/dashboard/assets/cer-approval-config', { timeout: 45000 });
  await page.waitForTimeout(2500);

  // 3. Verify Page Title & Heading
  await expect(page.getByRole('heading', { name: 'Konfigurasi Approval CER' })).toBeVisible({ timeout: 15000 });

  // 4. Verify Cards & Form Controls
  await expect(page.locator('text=Acknowledge IT Device').first()).toBeVisible();
  await expect(page.locator('text=Budget Validator Finance (Konsensus Dual Approver)').first()).toBeVisible();
  await expect(page.locator('text=PIC Checked by Finance (Registrasi Aset)').first()).toBeVisible();
  await expect(page.locator('text=Auto-Skip Posisi Kosong').first()).toBeVisible();
  await expect(page.locator('text=Mode Pengujian (Testing Override)').first()).toBeVisible();

  // Capture screenshot of the configuration page
  await page.screenshot({
    path: path.join(screenshotDir, '01_cer_approval_config_page.png'),
    fullPage: true,
  });
  console.log('Captured 01_cer_approval_config_page.png');

  // 5. Navigate to /dashboard/assets/cer and confirm NO config tab exists
  console.log('Navigating to user CER page...');
  await page.goto('/dashboard/assets/cer', { timeout: 45000 });
  await page.waitForTimeout(2500);

  // Confirm tabs on user page: only operational tabs
  await expect(page.locator('button[role="tab"]:has-text("Daftar Pengajuan")')).toBeVisible();
  await expect(page.locator('button[role="tab"]:has-text("Buat Form CER")')).toBeVisible();
  await expect(page.locator('button[role="tab"]:has-text("Penerimaan & BAST")')).toBeVisible();

  // Confirm NO config or matrix tab
  await expect(page.locator('button[role="tab"]:has-text("Konfigurasi")')).toHaveCount(0);
  await expect(page.locator('button[role="tab"]:has-text("Matriks Approval")')).toHaveCount(0);

  // Capture screenshot of clean user-facing CER page
  await page.screenshot({
    path: path.join(screenshotDir, '02_user_cer_page_no_config_tabs.png'),
    fullPage: false,
  });
  console.log('Captured 02_user_cer_page_no_config_tabs.png');

  console.log('Test completed successfully!');
});
