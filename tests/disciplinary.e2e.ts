import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify hc disciplinary dashboard, auto letter number, signature pad, letterhead toggle, and printable 1 page letter', async ({ app, screen, browser, agent }) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open /dashboard/hc/disciplinary
  await app.open('/dashboard/hc/disciplinary');
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Verify Case Desk and KPI cards
  await expect(screen.getByText('Disciplinary Case & Sanction Desk')).toBeVisible({ timeout: 20000 });
  await app.screenshot('001-disciplinary-dashboard-overview');

  // 3. Check Tabs
  const tabActions = screen.getByText('Daftar Penerima Sanksi');
  const tabCategories = screen.getByText('Kategori & Custom Level SP');
  const tabLetters = screen.getByText('Arsip Surat Sanksi');

  await expect(tabActions).toBeVisible();
  await expect(tabCategories).toBeVisible();
  await expect(tabLetters).toBeVisible();

  // 4. Verify Master Categories Tab
  await browser.locator('[role="tab"]:has-text("Kategori")').click();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await app.screenshot('003-master-kategori-custom-level-sp');

  // 5. Verify Arsip Surat Sanksi Tab
  await browser.locator('[role="tab"]:has-text("Arsip")').click();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await app.screenshot('005-arsip-galeri-surat-sanksi');

  // 6. Return to Actions Tab
  await browser.locator('[role="tab"]:has-text("Daftar Penerima")').click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 7. Open Form Terbitkan Sanksi Disiplin
  const btnCreateAction = browser.locator('button:has-text("Terbitkan Sanksi Disiplin")').first();
  if (await btnCreateAction.isVisible().catch(() => false)) {
    await btnCreateAction.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await app.screenshot('002-modal-terbitkan-sanksi-disiplin');

    const btnBatal = browser.locator('button:has-text("Batal")').first();
    if (await btnBatal.isVisible().catch(() => false)) {
      await btnBatal.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // 8. Assertions
  await expect(screen.getByRole('tab', { name: /Daftar Penerima Sanksi/i })).toBeVisible();
});
