import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies cargo manifest print preview fits strictly on a single A4 page with zero overflow', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate and land on Barang Keluar
  await loginToHero(app, screen, browser, '/dashboard/warehouse-repair/barang-keluar');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Find the first "Manifest" button in the table row actions
  const manifestBtn = browser.locator('button:has-text("Manifest")').first();
  await expect(manifestBtn).toBeVisible({ timeout: 15000 });
  await manifestBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify the Cargo Manifest Preview Dialog is open
  const previewDialog = browser.locator('[role="dialog"]:has-text("Preview —")').first();
  await expect(previewDialog).toBeVisible({ timeout: 10000 });

  // Verify the Cetak / Download PDF button is visible
  const printBtn = browser.locator('button:has-text("Cetak / Download PDF")').first();
  await expect(printBtn).toBeVisible();

  // Evaluate the page dimensions of the printable document inside the preview
  const pageMetrics = await browser.evaluate(() => {
    const pageEl = document.querySelector('.cargo-manifest-page') as HTMLElement | null;
    if (!pageEl) return null;
    return {
      clientHeight: pageEl.clientHeight,
      scrollHeight: pageEl.scrollHeight,
      clientWidth: pageEl.clientWidth,
      scrollWidth: pageEl.scrollWidth,
      hasOverflow: pageEl.scrollHeight > pageEl.clientHeight,
    };
  });

  // Verify page container exists and does NOT overflow vertically
  expect(pageMetrics).not.toBeNull();
  if (pageMetrics) {
    console.log('CARGO MANIFEST PAGE METRICS:', JSON.stringify(pageMetrics));
    expect(pageMetrics.hasOverflow).toBe(false);
    expect(pageMetrics.scrollHeight).toBeLessThanOrEqual(pageMetrics.clientHeight);
  }

  // Screenshot 1: Cargo Manifest Preview Dialog with verified single-page layout
  await app.screenshot('01-cargo-manifest-single-page-preview');

  // Close dialog via escape
  await browser.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Screenshot 2: Outbound table after print dialog test
  await app.screenshot('02-warehouse-outbound-manifest-action-verified');
});
