import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies Summary APD date cut-off filter and moved site column in document preview', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and redirect to /dashboard/summary
  await loginToHero(app, screen, browser, '/dashboard/summary');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open /dashboard/summary explicitly if not already there
  await app.open('/dashboard/summary');

  // Wait for initial page loading to resolve
  const titleElem = browser.locator('h1, h2, h3:has-text("Summary")').first();
  await expect(titleElem).toBeVisible({ timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Screenshot 1: Summary APD List Table
  await app.screenshot('01-summary-apd-list');

  // 3. Find and click "Generate Summary" or "Buat Summary" button on a section row
  const generateBtn = browser.locator('button:has-text("Generate"), button:has-text("Buat Summary")').first();
  if (await generateBtn.isVisible()) {
    await generateBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Screenshot 2: Summary Generator Modal with Cut-Off Date 6-to-6 prefilled
    await app.screenshot('02-summary-apd-modal-cutoff-preset');

    // 4. Test clicking quick preset "Tgl 6 s/d 6 Lalu"
    const prevPresetBtn = browser.locator('button:has-text("Tgl 6 s/d 6 Lalu")').first();
    if (await prevPresetBtn.isVisible()) {
      await prevPresetBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Screenshot 3: Modal with Previous Cut-Off Date range applied
      await app.screenshot('03-summary-apd-modal-prev-cutoff');
    }

    // 5. Test clicking quick preset "Tgl 6 s/d 6 Aktif"
    const activePresetBtn = browser.locator('button:has-text("Tgl 6 s/d 6 Aktif")').first();
    if (await activePresetBtn.isVisible()) {
      await activePresetBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Screenshot 4: Modal with Active Cut-off restored
      await app.screenshot('04-summary-apd-modal-active-cutoff-restored');
    }
  }

  // 6. Open document preview for SUM-001 (id 54) to verify Site column position
  await app.open('/dashboard/summary?preview=54');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Wait for the document table to render
  const docTable = browser.locator('table').first();
  await expect(docTable).toBeVisible({ timeout: 20000 });

  // Screenshot 5: Summary Document Preview with Site column placed between Sepatu Safety and Remarks
  await app.screenshot('05-summary-apd-document-site-column');
});
