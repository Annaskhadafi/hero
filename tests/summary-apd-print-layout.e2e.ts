import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies Summary APD print layout, single-copy PDF print, and no right/bottom clipping', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials directly into dense multi-page Summary 71 preview
  await loginToHero(app, screen, browser, '/dashboard/summary?preview=71');

  const docHeader = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(docHeader).toBeVisible({ timeout: 45000 });

  // Verify external link button to open dedicated print page exists
  const extPrintLink = browser.locator('a[title*="halaman cetak"]').first();
  await expect(extPrintLink).toBeVisible({ timeout: 15000 });

  // Wait briefly for Next.js client hydration before clicking interactive modal/print controls
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Verify unique #summary-document-printable ID even when Zoom Modal is open
  await expect(browser.locator('#summary-document-printable')).toHaveCount(1);
  await browser.locator('button[title="Tampilkan Ukuran Penuh"]').click();
  await expect(browser.locator('#summary-document-printable-zoom')).toBeVisible({ timeout: 15000 });
  await expect(browser.locator('#summary-document-printable')).toHaveCount(1);
  await browser.locator('button[title="Tutup"]').click();

  // Verify clicking Cetak PDF triggers print once and cleans up iframe afterprint
  await browser.evaluate(() => {
    (window as any).__summaryPrintCalls = 0;
    const origAppend = document.body.appendChild.bind(document.body);
    document.body.appendChild = (el: any) => {
      const res = origAppend(el);
      if (el && el.id === 'summary-print-iframe') {
        el.addEventListener('load', () => {
          try {
            el.contentWindow.print = () => {
              (window as any).__summaryPrintCalls += 1;
              setTimeout(() => el.contentWindow.dispatchEvent(new Event('afterprint')), 50);
            };
          } catch {}
        });
      }
      return res;
    };
  });
  await browser.locator('button[title*="Cetak langsung"]').click();

  // Poll via browser.evaluate until iframe loads, prints once, and cleans up afterprint
  let iframeStats = { calls: 0, remainingIframes: -1 };
  const deadline = Date.now() + 35000;
  while (Date.now() < deadline) {
    iframeStats = await browser.evaluate(() => ({
      calls: (window as any).__summaryPrintCalls || 0,
      remainingIframes: document.querySelectorAll('#summary-print-iframe').length,
    }));
    if (iframeStats.calls >= 1 && iframeStats.remainingIframes === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  expect(iframeStats.calls).toBe(1);
  expect(iframeStats.remainingIframes).toBe(0);

  // Screenshot 1: Summary Preview 71 with Print action & crisp table layout
  await app.screenshot('01-summary-apd-preview-print-actions');

  // 2. Open dedicated printOnly=1 print page for dense multi-page Summary 71 (simulating Cetak PDF iframe)
  await app.open('/print/summary/71?printOnly=1');

  const printTitle = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(printTitle).toBeVisible({ timeout: 35000 });

  const printTable = browser.locator('table').first();
  await expect(printTable).toBeVisible({ timeout: 15000 });

  const shoesHeader = browser.locator('th:has-text("Safety Shoes")').first();
  await expect(shoesHeader).toBeVisible({ timeout: 10000 });

  // Verify Dokumen column is completely omitted on printOnly=1 and zero horizontal clipping
  await browser.setViewport({ width: 1070, height: 794 });
  const metrics71 = await browser.evaluate(() => {
    const wrap = document.querySelector('.print-page-wrapper') as HTMLElement | null;
    const table = document.querySelector('table') as HTMLElement | null;
    const docHeader = Array.from(document.querySelectorAll('th')).find((th) => th.textContent?.trim() === 'Dokumen');
    return {
      wrapW: wrap ? wrap.getBoundingClientRect().width : 0,
      tableScrollW: table ? table.scrollWidth : 0,
      hasDocHeader: Boolean(docHeader),
    };
  });
  expect(metrics71.hasDocHeader).toBe(false);
  expect(metrics71.tableScrollW).toBeLessThanOrEqual(metrics71.wrapW + 1);

  // Screenshot 2: Full A4 Landscape printOnly=1 page for dense Summary 71 (zero horizontal clipping)
  await app.screenshot('02-summary-apd-print-page-71-landscape');

  // 3. Verify 30-row Summary 67 fits strictly within 1 A4 Landscape page height (<= 755px)
  await app.open('/print/summary/67?printOnly=1');
  const printTitle67 = browser.locator('text=Summary Permintaan Barang Safety').first();
  await expect(printTitle67).toBeVisible({ timeout: 35000 });
  await browser.setViewport({ width: 1070, height: 794 });
  const metrics67 = await browser.evaluate(() => {
    const wrap = document.querySelector('.print-page-wrapper') as HTMLElement | null;
    const table = document.querySelector('table') as HTMLElement | null;
    return {
      wrapW: wrap ? wrap.getBoundingClientRect().width : 0,
      wrapH: wrap ? wrap.getBoundingClientRect().height : 0,
      tableScrollW: table ? table.scrollWidth : 0,
    };
  });
  expect(metrics67.tableScrollW).toBeLessThanOrEqual(metrics67.wrapW + 1);
  expect(metrics67.wrapH).toBeLessThanOrEqual(755);

  // Screenshot 3: Full 30-row Summary 67 fitting cleanly on 1 A4 Landscape page
  await app.screenshot('03-summary-apd-print-page-67-single-page');
});
