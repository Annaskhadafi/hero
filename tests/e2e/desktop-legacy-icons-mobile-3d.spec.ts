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
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('Masukkan email atau SN').fill('mochamad.khadafi@chitraparatama.co.id');
    await page.getByPlaceholder('Masukkan kata sandi').fill('Chitra#71261');
    await page.getByRole('button', { name: 'Masuk ke HERO' }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 45000 });
    await page.waitForTimeout(2000);

    // 2. Navigate to Desktop Analytics Dashboard
    await page.goto('/dashboard/analytics', { waitUntil: 'domcontentloaded' });
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
    await page.goto('/mobile/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Hide floating chat widget
    await page.evaluate(() => {
      document.querySelectorAll('[title*="Hero Genius"]').forEach((el: any) => {
        el.style.display = 'none';
      });
    });

    // Verify mobile 3D icons are present
    const mobile3dIcons = page.locator('img[src*="/icons/hero-3d/"]');
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
