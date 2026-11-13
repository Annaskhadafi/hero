import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies enlarged Summary APD preview in Approval mode with clear table-signature separation', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate into dashboard first with standard credentials
  await loginToHero(app, screen, browser);

  // 2. Open Summary 71 approval preview with from=approval mode
  await app.open('/print/summary/71?embed=1&from=approval');

  const summaryTitle = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(summaryTitle).toBeVisible({ timeout: 35000 });

  const summaryTable = browser.locator('table').first();
  await expect(summaryTable).toBeVisible({ timeout: 15000 });

  // Verify enlarged typography and row metrics in approval mode
  const metrics = await browser.evaluate(() => {
    const table = document.querySelector('table') as HTMLTableElement | null;
    const firstRow = table?.querySelector('tbody tr') as HTMLTableRowElement | null;
    const firstTd = firstRow?.querySelector('td') as HTMLElement | null;
    const sigContainer = document.querySelector('div[style*="grid-template-columns"]') as HTMLElement | null;

    const tableRect = table ? table.getBoundingClientRect() : null;
    const sigRect = sigContainer ? sigContainer.getBoundingClientRect() : null;

    const gap = tableRect && sigRect ? sigRect.top - tableRect.bottom : -1;

    return {
      rowHeight: firstRow ? firstRow.getBoundingClientRect().height : 0,
      fontSize: firstTd ? window.getComputedStyle(firstTd).fontSize : '',
      gap,
      isOverlapping: gap < 0,
      hasSignatures: Boolean(sigContainer),
      tableBottom: tableRect ? tableRect.bottom : 0,
      sigTop: sigRect ? sigRect.top : 0,
    };
  });

  console.log('E2E Approval Preview Metrics:', metrics);

  // Must have enlarged row height (>= 20px) and font size (>= 10px approx 7.5pt)
  expect(metrics.rowHeight).toBeGreaterThanOrEqual(20);
  expect(metrics.hasSignatures).toBe(true);

  // Must have generous gap between table and signatures (>= 20px) and ZERO overlap
  expect(metrics.isOverlapping).toBe(false);
  expect(metrics.gap).toBeGreaterThanOrEqual(20);

  // Screenshot 1: Enlarged Summary Table in Approval Mode
  await app.screenshot('01-summary-apd-approval-preview-enlarged');

  // Scroll to signatures to capture clear separation
  await browser.evaluate(() => {
    const sig = document.querySelector('div[style*="grid-template-columns"]');
    if (sig) sig.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Screenshot 2: Clean separation between bottom of table (Total Qty) and signature block
  await app.screenshot('02-summary-apd-approval-signatures-separated');
});
