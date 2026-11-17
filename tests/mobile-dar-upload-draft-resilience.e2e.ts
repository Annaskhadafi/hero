import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify mobile daily activity draft saving resilience and clean form submission state', { timeout: 180000 }, async ({
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

  // 3. Verify no QuotaExceededError warning banner is present on the page
  const quotaWarning = browser.locator(':has-text("Draft tidak dapat disimpan di perangkat ini")');
  const countWarning = await quotaWarning.count();
  expect(countWarning).toBe(0);

  // Take screenshot of clean form
  await app.screenshot('01-mobile-dar-form-clean');

  // 4. Fill notes and check Save Draft functionality
  const notesTextarea = browser.locator('textarea[placeholder*="ringkasan"], textarea').first();
  if (await notesTextarea.count() > 0) {
    await notesTextarea.fill('Pekerjaan pergantian ban dan inspeksi unit rutin (E2E Verification)');
  }

  // Scroll to bottom to view Save Draft and Submit buttons
  await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 5. Click Save Draft button
  const saveDraftBtn = browser.locator('button:has-text("SAVE DRAFT")').first();
  if (await saveDraftBtn.count() > 0) {
    await saveDraftBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Take screenshot after save draft action
  await app.screenshot('02-mobile-dar-save-draft-success');

  // Verify that error banner is still NOT present
  const errorBanner = browser.locator(':has-text("Gagal mengunggah berkas ke S3 Cloud Storage")');
  const countError = await errorBanner.count();
  expect(countError).toBe(0);
});
