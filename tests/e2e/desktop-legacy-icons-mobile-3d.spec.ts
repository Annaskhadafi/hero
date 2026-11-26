// @ts-nocheck
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = path.resolve('C:/Users/IRIS/.gemini/antigravity/brain/b7593128-e742-40bb-8895-b3df226ee685');

test.describe('Desktop Legacy Icons Reverted & Mobile 3D Retained', () => {
  test.setTimeout(120000);

  test('Verify desktop uses legacy icons and mobile uses 3D isometric icons', async ({ page }) => {
    // 1. Authenticate with desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/sign-in', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[placeholder*="email atau SN" i], #email, input[name="username"], #employeeSn').first();
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await emailInput.fill('71261');
    const passwordInput = page.locator('input[type="password"], #password, input[name="password"]').first();
    await passwordInput.fill('Chitra#71261');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first();
    await submitBtn.click();

    // Wait for successful login redirect
    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), { timeout: 90000 });
    await page.waitForTimeout(3000);
    await page.waitForTimeout(2000);

    // 2. Navigate to Desktop Analytics Dashboard
    await page.goto('http://localhost:3000/dashboard/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Hide floating chat widget
    await page.evaluate(() => {
      document.querySelectorAll('[title*="Hero Genius"]').forEach((el: any) => {
        el.style.display = 'none';
      });
    });

    // Check that "Aksi cepat" is visible
    const aksiCepatSection = page.locator('text="Aksi cepat"').first();
    await expect(aksiCepatSection).toBeVisible({ timeout: 30000 });

    // Verify Check In button uses SVG icon (not 3D image)
    const checkInBtn = page.locator('button:has-text("Check In")').first();
    await expect(checkInBtn).toBeVisible({ timeout: 15000 });
    const checkInSvg = checkInBtn.locator('svg').first();
    await expect(checkInSvg).toBeVisible();

    // Verify no /icons/hero-3d/ image exists inside Aksi Cepat
    const quickActionImages = page.locator('.grid-cols-3 img[src*="/icons/hero-3d/"]');
    expect(await quickActionImages.count()).toBe(0);

    // Take desktop screenshot
    const desktopScreenshotPath = path.join(ARTIFACT_DIR, '001-desktop-restored-legacy-icons.png');
    await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
    console.log(`Saved screenshot: ${desktopScreenshotPath}`);

    // 3. Navigate to Mobile Dashboard with mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000/mobile/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Hide floating chat widget
    await page.evaluate(() => {
      document.querySelectorAll('[title*="Hero Genius"]').forEach((el: any) => {
        el.style.display = 'none';
      });
    });

    // Verify mobile 3D icons are present
    const mobile3dIcons = page.locator('img[src*="/icons/hero-24/"], img[src*="/icons/hero-3d/"]');
    await mobile3dIcons.first().waitFor({ state: 'visible', timeout: 15000 });
    const count = await mobile3dIcons.count();
    console.log(`Found ${count} 3D isometric icons on mobile dashboard.`);
    expect(count).toBeGreaterThan(0);

    // Take mobile screenshot
    const mobileScreenshotPath = path.join(ARTIFACT_DIR, '002-mobile-retained-3d-icons.png');
    await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
    console.log(`Saved screenshot: ${mobileScreenshotPath}`);
  });
});
