import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify HSE OSM print A4 layout, multi-page pagination, and intact photo attachments', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Open OSM print page for session 12
  await app.open('/print/hse/osm/12');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // Verify document ref and title are present
  await expect(screen.getByText(/LAPORAN ON THE SPOT MONITORING/i).first()).toBeVisible();
  await expect(screen.getByText(/OSM-SES-202610-0012/i).first()).toBeVisible();
  await expect(screen.getByText(/Halaman 1 dari 2/i)).toBeVisible();

  // Screenshot Page 1
  await app.screenshot('osm-print-page-1');

  // Scroll to Page 2 middle
  await browser.evaluate(() => {
    window.scrollTo({ top: 1300, behavior: 'instant' });
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await app.screenshot('osm-print-page-2-findings');

  // Scroll to Page 2 bottom (signatures and footer)
  await browser.evaluate(() => {
    window.scrollTo({ top: 2200, behavior: 'instant' });
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await app.screenshot('osm-print-page-2-signatures');

  // Verify signatures and page 2 indicators
  await expect(screen.getByText(/Halaman 2 dari 2/i)).toBeVisible();
  await expect(screen.getByText(/Disiapkan Oleh \(Leader OSM\)/i)).toBeVisible();
  await expect(screen.getByText(/HSE Officer \/ PJO Site/i)).toBeVisible();

  // Assert complete flow
  await agent.assert('The OSM print page correctly splits into 2 discrete A4 pages. Page 1 displays Details & Monitoring Profile and Finding 1, and Page 2 displays findings 2 and 3 along with the official signature block without overflowing or broken image icons.', { vision: true });
});
