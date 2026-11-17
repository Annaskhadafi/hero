import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify signature pad in CER approval has only a single save button and no duplicate', async ({ app, screen, browser }) => {
  // 1. Login to HERO as standard admin / approver
  await loginToHero(app, screen, browser, {
    username: 'mochamad.khadafi@chitraparatama.co.id',
    targetUrl: '/dashboard/assets/cer',
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open CER dashboard and wait for data table to load
  await app.open('/dashboard/assets/cer');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(screen.getByText('CER/CP/BALIKPAPAN/XI/2026/001')).toBeVisible();

  // Hide any floating widget that could overlay the dialog footer
  await browser.evaluate(() => {
    document.querySelectorAll('[title*="Hero Genius"]').forEach((el: any) => {
      el.style.display = 'none';
    });
  });

  // 3. Open AssetApprovalDialog via "Tinjau" button
  const tinjauBtn = browser.locator('button:has-text("Tinjau")').first();
  await expect(tinjauBtn).toBeVisible();
  await tinjauBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // In AssetApprovalDialog: Switch to "Coretan Tangan" tab
  const coretanTab = browser.locator('button:has-text("Coretan Tangan")').first();
  await expect(coretanTab).toBeVisible();
  await coretanTab.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Canvas is visible
  const canvas = browser.locator('canvas').first();
  await expect(canvas).toBeVisible();

  // Draw on the canvas
  const box = await canvas.boundingBox();
  if (box) {
    await browser.mouse.move(box.x + 30, box.y + 30);
    await browser.mouse.down();
    await browser.mouse.move(box.x + 90, box.y + 60);
    await browser.mouse.move(box.x + 150, box.y + 30);
    await browser.mouse.up();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Scroll all scrollable panels down so the signature info bar is fully in view
  await browser.evaluate(() => {
    document.querySelectorAll('.overflow-y-auto').forEach((el) => {
      el.scrollTop = 500;
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // VERIFY: Status tanda tangan terisi is visible
  await expect(browser.locator('text=Tanda tangan terisi')).toBeVisible();

  // VERIFY: The single save button inside SignaturePad is visible
  const saveBtn = browser.locator('button:has-text("Simpan TTD Ini ke Profil HERO")').first();
  await expect(saveBtn).toBeVisible();

  // VERIFY: The duplicate button "Simpan Coretan Ini ke Profil HERO Saya" is completely removed
  await expect(browser.locator('text=Simpan Coretan Ini ke Profil HERO Saya')).not.toBeVisible();

  // Take screenshot of the clean single save button in AssetApprovalDialog
  await app.screenshot('01-asset-approval-single-save-button');
});
