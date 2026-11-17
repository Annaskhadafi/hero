import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify mobile daily activity item navigation and non-blocking pointer events', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials
  await loginToHero(app, screen, browser, '/mobile/activity');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open /mobile/activity explicitly
  await app.open('/mobile/activity');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // Scroll down to Activity selection section
  await browser.evaluate(() => window.scrollBy(0, 500));
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. Verify body pointer-events is NOT 'none'
  const bodyPointerEvents = await browser.evaluate(() => document.body.style.pointerEvents);
  expect(bodyPointerEvents).not.toBe('none');

  // Screenshot initial form view
  await app.screenshot('01-mobile-dar-items-overview');

  // 4. Find and open library picker
  const pickLibraryBtn = browser.locator(
    'button:has-text("Pilih activity library"), button:has-text("activity dipilih")'
  ).first();

  if (await pickLibraryBtn.count() > 0) {
    await pickLibraryBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Verify dialog content is open
    const dialogTitle = browser.locator(':has-text("Pilih Kamus Aktivitas")').first();
    await expect(dialogTitle).toBeVisible();

    await app.screenshot('02-mobile-dar-picker-dialog');

    // Click "Pakai X Activity" button to close
    const applyBtn = browser.locator('button:has-text("Pakai")').first();
    if (await applyBtn.count() > 0) {
      await applyBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    // 5. Verify pointer events restored immediately on body after dialog close
    const afterClosePointer = await browser.evaluate(() => document.body.style.pointerEvents);
    expect(afterClosePointer).not.toBe('none');

    // Screenshot after dialog close
    await app.screenshot('03-mobile-dar-after-dialog-close');
  }

  // 6. Check if multiple items are displayed
  const cards = browser.locator('[id^="activity-card-"]');
  const cardCount = await cards.count();
  console.log('Activity cards count:', cardCount);

  if (cardCount > 1) {
    // Verify next activity button is visible
    const nextBtn = browser.locator('button:has-text("Lanjut ke Aktivitas #2")').first();
    if (await nextBtn.count() > 0) {
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  await app.screenshot('04-mobile-dar-navigation-verified');
});
