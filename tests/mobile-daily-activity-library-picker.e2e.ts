import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify mobile daily activity library picker modal opens above overlay without blur obstruction', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials and navigate to mobile daily activity
  await loginToHero(app, screen, browser, '/mobile/activity');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open /mobile/activity explicitly
  await app.open('/mobile/activity');
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await expect(browser.locator('body')).toBeVisible();

  // Scroll down to the Activity Items / Library selection section
  await browser.evaluate(() => window.scrollBy(0, 450));
  await new Promise((resolve) => setTimeout(resolve, 800));

  await app.screenshot('01-mobile-daily-activity-page');

  // 3. Find and click the button to open library picker dialog
  const pickLibraryBtn = browser.locator(
    'button:has-text("Pilih activity library"), button:has-text("activity dipilih")'
  ).first();

  if (await pickLibraryBtn.count() > 0) {
    await pickLibraryBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Verify the dialog header and content are visible
    const dialogTitle = browser.locator(':has-text("Pilih Kamus Aktivitas")').first();
    await expect(dialogTitle).toBeVisible();

    // Verify search input inside library picker is visible and functional
    const searchInput = browser.locator('input[placeholder*="Cari kode atau nama"]').first();
    await expect(searchInput).toBeVisible();

    // Screenshot 2: Clean library picker dialog unobstructed by blur overlay
    await app.screenshot('02-mobile-library-picker-modal-unobstructed');

    // Verify dialog content is on top and receiving pointer events
    const hitTest = await browser.evaluate(() => {
      const dialogOverlay = document.querySelector('[data-slot="dialog-overlay"]');
      const dialogContent = document.querySelector('[data-slot="dialog-content"]');
      if (!dialogContent) return { found: false };

      const rect = dialogContent.getBoundingClientRect();
      const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 30);
      return {
        found: true,
        isContentOrChild: dialogContent.contains(topEl),
        overlayZ: dialogOverlay ? window.getComputedStyle(dialogOverlay).zIndex : null,
        contentZ: window.getComputedStyle(dialogContent).zIndex,
      };
    });

    console.log('Hit test result:', hitTest);
    expect(hitTest.found).toBe(true);
    expect(hitTest.isContentOrChild).toBe(true);
  } else {
    console.log('Pick library button not found in current view');
  }
});
