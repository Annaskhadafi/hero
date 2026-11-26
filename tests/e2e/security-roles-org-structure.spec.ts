// @ts-nocheck
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = path.resolve('C:/Users/IRIS/.gemini/antigravity/brain/b7593128-e742-40bb-8895-b3df226ee685');

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
});

test.describe('Security Roles & User Management - Expanded Organizational Roles', () => {
  test.setTimeout(120000);

  test('Verify expanded roles in Role Management and User Management', async ({ page }) => {
    // 1. Set desktop viewport & navigate to sign-in
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[placeholder*="email atau SN" i], #email, input[name="username"], #employeeSn').first();
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await emailInput.fill('71261');
    const passwordInput = page.locator('input[type="password"], #password, input[name="password"]').first();
    await passwordInput.fill('Chitra#71261');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first();
    await submitBtn.click();

    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 30000 });
    await page.waitForTimeout(2000);

    // 2. Navigate to Role Management
    await page.goto('/dashboard/security/roles', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Hide floating chat widget
    await page.evaluate(() => {
      document.querySelectorAll('[title*="Hero Genius"]').forEach((el: any) => {
        el.style.display = 'none';
      });
    });

    // Verify Role Management page heading
    const roleHeading = page.locator('h1:has-text("Role & Permission")').first();
    await expect(roleHeading).toBeVisible({ timeout: 30000 });

    // Verify expanded organizational roles appear in the left list
    const bodRole = page.locator('button:has-text("Executive / BoD")').first();
    await expect(bodRole).toBeVisible({ timeout: 20000 });

    const gmRole = page.locator('button:has-text("General Manager")').first();
    await expect(gmRole).toBeVisible({ timeout: 10000 });

    const csRole = page.locator('button:has-text("Central Services Manager")').first();
    await expect(csRole).toBeVisible({ timeout: 10000 });

    const scRole = page.locator('button:has-text("Supply Chain Manager")').first();
    await expect(scRole).toBeVisible({ timeout: 10000 });

    // Capture screenshot of Role Management
    const roleScreenshotPath = path.join(ARTIFACT_DIR, '001-security-roles-org-structure.png');
    await page.screenshot({ path: roleScreenshotPath });
    console.log(`Saved screenshot: ${roleScreenshotPath}`);

    // 3. Navigate to User Management
    await page.goto('/dashboard/security/users', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Verify User Management page
    const userHeading = page.locator('h1, h2, text="User Management", text="Pengguna"').first();
    await expect(userHeading).toBeVisible({ timeout: 30000 });

    // Capture screenshot of User Management
    const userScreenshotPath = path.join(ARTIFACT_DIR, '002-security-users-role-options.png');
    await page.screenshot({ path: userScreenshotPath });
    console.log(`Saved screenshot: ${userScreenshotPath}`);
  });
});
