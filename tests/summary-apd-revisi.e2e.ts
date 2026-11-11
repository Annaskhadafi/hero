import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies Summary APD revision flow, revision notice banner, and resubmit button', async ({
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

  // Screenshot 1: Summary APD List Table with Status Filter options & Perlu Revisi badge
  await app.screenshot('01-summary-apd-list-with-revisi-status');

  // 3. Open document preview for SUM-004 (id 69) which is in status 'revisi'
  await app.open('/dashboard/summary?preview=69');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Wait for the document table or header to render
  const docHeader = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(docHeader).toBeVisible({ timeout: 25000 });

  // Screenshot 2: Summary APD Document Preview with revision notice banner & action buttons
  await app.screenshot('02-summary-apd-document-preview');

  // 4. Verify revision notice banner exists and is visible
  const revisionBanner = browser.locator('text=Dokumen Summary Memerlukan Revisi').first();
  await expect(revisionBanner).toBeVisible({ timeout: 15000 });

  // Screenshot 3: Revision banner with approver note
  await app.screenshot('03-summary-apd-revision-notice-banner');

  // 5. Verify resubmit button "Tanda Tangan & Submit Ulang" is active
  const resubmitBtn = browser.locator('button:has-text("Tanda Tangan & Submit Ulang")').first();
  await expect(resubmitBtn).toBeVisible({ timeout: 15000 });

  // Screenshot 4: Resubmit button active
  await app.screenshot('04-summary-apd-resubmit-button');
});
