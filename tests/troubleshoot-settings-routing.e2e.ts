import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify service desk dedicated settings routing pic and problem templates', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and target /dashboard/helpdesk
  await loginToHero(app, screen, browser, '/dashboard/helpdesk');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. Verify Shortcut Button: Pengaturan Routing & Template in Header
  const settingsBtn = browser.locator('a:has-text("Pengaturan Routing & Template")').first();
  await expect(settingsBtn).toBeVisible({ timeout: 45000 });

  // 4. Click shortcut button to navigate to /dashboard/helpdesk/settings
  await settingsBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 5. Verify Settings Page Header & Tab Matriks Routing
  const settingsTitle = browser.locator('h1:has-text("Pengaturan Service Desk: Routing PIC & Master Template")').first();
  await expect(settingsTitle).toBeVisible({ timeout: 30000 });

  const tabRouting = browser.locator('button:has-text("Matriks Routing PIC Kategori")').first();
  await expect(tabRouting).toBeVisible();

  // Capture Screenshot 1: Halaman Terpisah - Matriks Routing PIC per Kategori ("Masalah Apa ke Siapa")
  await app.screenshot('001-01-settings-category-routing-matrix');

  // 6. Test Modal "Atur PIC & SLA" on a Category
  const aturPicBtn = browser.locator('button:has-text("Atur PIC & SLA")').first();
  await expect(aturPicBtn).toBeVisible();
  await aturPicBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify Modal Form Opens
  const modalRoutingTitle = browser.locator('h2:has-text("Atur Routing PIC")').first();
  await expect(modalRoutingTitle).toBeVisible();

  // Capture Screenshot 2: Modal Atur Routing PIC Kategori
  await app.screenshot('002-02-settings-modal-edit-category-routing');

  // Close Category Routing Modal
  const cancelCatBtn = browser.locator('div[role="dialog"] button:has-text("Batal")').first();
  await cancelCatBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 800));

  // 7. Switch to Tab 2: Master Template Kendala
  const tabTemplates = browser.locator('button:has-text("Master Template Kendala")').first();
  await tabTemplates.click();
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Verify Table of Templates
  const templateTable = browser.locator('table').first();
  await expect(templateTable).toBeVisible();

  // Capture Screenshot 3: Master Template Kendala List
  await app.screenshot('003-03-settings-templates-list');

  // 8. Navigate back to /dashboard/helpdesk
  const backBtn = browser.locator('a:has-text("Kembali ke Helpdesk Command Center")').first();
  await backBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 9. Open "+ Buat Tiket" to test Auto-Populate feature
  const buatTiketBtn = browser.locator('button:has-text("+ Buat Tiket")').first();
  await expect(buatTiketBtn).toBeVisible();
  await buatTiketBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify "Pilih Template Cepat (Opsional)" Dropdown
  const selectTemplateTrigger = browser.locator('button:has-text("Pilih Template Kendala")').first();
  if (await selectTemplateTrigger.isVisible()) {
    await selectTemplateTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Choose second problem template option (first real template, since 0 is Tanpa Template)
    const tplOption = browser.locator('div[role="option"]').nth(1);
    if (await tplOption.isVisible()) {
      await tplOption.click();
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  // Capture Screenshot 4: Form Buat Tiket Auto-Populated from Template
  await app.screenshot('004-04-troubleshoot-create-ticket-auto-populated');

  // Submit the auto-populated ticket
  const submitBtn = browser.locator('div[role="dialog"] button:has-text("Simpan & Buat Tiket")').first();
  await submitBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));
});
