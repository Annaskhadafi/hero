import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify monthly man hours tab, map popup sync, OSHE performance modal and PT Chitra Paratama branding', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Navigate to /dashboard/safety/data (Safety Data Management)
  await app.open('/dashboard/safety/data');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Verify Monthly Man Hours tab is present and click it
  const monthlyTab = browser.locator('button[role="tab"]:has-text("Monthly Man Hours")');
  await expect(monthlyTab).toBeVisible({ timeout: 10000 });
  await monthlyTab.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 4. Take screenshot of Safety Data Management with Monthly Man Hours tab active
  await app.screenshot('safety-data-mgmt-monthly-man-hours');

  // 5. Navigate to /dashboard/safety
  await app.open('/dashboard/safety');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // 6. Wait for map and click on site marker
  const marker = browser.locator('.custom-site-marker').first();
  await marker.waitFor({ state: 'visible', timeout: 15000 });
  await marker.click();

  // 7. Wait for popup
  const popup = browser.locator('.safety-map-popup');
  await popup.waitFor({ state: 'visible', timeout: 8000 });
  await expect(popup.getByText('Safe Man Hours')).toBeVisible();

  // 8. Screenshot map popup
  await app.screenshot('safety-map-popup-synced');

  // 9. Click "Buka OSHE Performance" button
  const openDetailBtn = popup.getByRole('button', { name: /Buka OSHE Performance/i });
  await expect(openDetailBtn).toBeVisible();
  await openDetailBtn.click();

  // 10. Wait for OSHE Performance Dialog
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const dialogContent = browser.locator('[role="dialog"]');
  await expect(dialogContent).toBeVisible({ timeout: 10000 });

  // 11. Verify branding: PT. Chitra Paratama and CP badge (no PT. Cipta Kridatama)
  await expect(dialogContent.getByText(/PT\.\s*Chitra\s*Paratama/i).first()).toBeVisible();
  await expect(dialogContent.getByText('CP', { exact: true })).toBeVisible();

  // 12. Verify lagging indicator rows
  await expect(dialogContent.getByText(/PDFR \(Property Damage Freq\. Rate\)/i)).toBeVisible();
  await expect(dialogContent.getByText('HPNMFR', { exact: true })).toBeVisible();
  await expect(dialogContent.getByText(/TRIFR \(Recordable Incident Freq\.\)/i)).toBeVisible();

  // 13. Screenshot OSHE Performance Dialog
  await app.screenshot('safety-oshe-performance-dialog-verified');

  // 14. Assert agent
  await expect(dialogContent.getByText(/PT\.\s*Chitra\s*Paratama/i).first()).toBeVisible();
});
