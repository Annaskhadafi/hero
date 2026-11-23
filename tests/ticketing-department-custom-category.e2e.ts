import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify ticketing target department, assignee PIC, and custom category features', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials (71261 / Chitra#71261) targeting /mobile/dashboard
  await loginToHero(app, screen, browser, '/mobile/dashboard');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // If still on sign-in, explicitly fill and submit
  const emailInput = browser.locator('#email, input[name="username"]').first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill('71261');
    const passwordInput = browser.locator('#password, input[name="password"]').first();
    await passwordInput.fill('Chitra#71261');
    const submitBtn = browser.locator('button:has-text("Masuk ke HERO")').first();
    await submitBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Dismiss greeting/announcement modal if present
  const dismissBtn = browser.locator('button:has-text("TUTUP / MENGERTI"), button:has-text("Mengerti"), button:has-text("Tutup")').first();
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Ensure /mobile/dashboard is loaded
  await app.open('/mobile/dashboard');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Verify Troubleshoot Widget is present
  const widgetTitle = browser.locator('h2:has-text("Troubleshoot & Tiket Kendala")').first();
  await expect(widgetTitle).toBeVisible({ timeout: 30000 });

  // 3. Open "Lapor Kendala / Buat Tiket" Quick Modal
  const createTicketBtn = browser.locator('button:has-text("Buat Tiket")').first();
  await expect(createTicketBtn).toBeVisible({ timeout: 10000 });
  await createTicketBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const dialogTitle = browser.locator('div[role="dialog"] :has-text("Lapor Kendala / Buat Tiket")').first();
  await expect(dialogTitle).toBeVisible({ timeout: 10000 });

  // 4. Fill Title & Unit
  const titleInput = browser.locator('div[role="dialog"] input[placeholder*="Gagal sinkron"]').first();
  await titleInput.fill('Uji Coba Kendala AC Ruang Server dan Tiket Kustom');

  const unitInput = browser.locator('div[role="dialog"] input[placeholder*="Timesheet V2"]').first();
  await unitInput.fill('SRV-AC-01');

  // 5. Test Custom Category selection (select with value "__custom__")
  const categorySelect = browser.locator('div[role="dialog"] select').filter({ has: browser.locator('option[value="__custom__"]') }).first();
  await expect(categorySelect).toBeVisible();
  await categorySelect.selectOption({ value: '__custom__' });
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Verify Custom Category input appears and fill it
  const customCatInput = browser.locator('div[role="dialog"] input[placeholder*="Kerusakan AC Kantor"]').first();
  await expect(customCatInput).toBeVisible();
  await customCatInput.fill('Fasilitas & Pendingin Ruang Server (Custom)');

  // 6. Test Departemen Tujuan selection
  const deptSelect = browser.locator('div[role="dialog"] select').filter({ has: browser.locator('option:has-text("-- Pilih Departemen --")') }).first();
  await expect(deptSelect).toBeVisible();
  await deptSelect.selectOption({ index: 2 });
  await new Promise((resolve) => setTimeout(resolve, 800));

  // 7. Verify PIC select is visible
  const picSelect = browser.locator('div[role="dialog"] select').filter({ has: browser.locator('option:has-text("-- Otomatis / Antrean Dept --")') }).first();
  await expect(picSelect).toBeVisible();

  // 8. Fill Description
  const descTextarea = browser.locator('div[role="dialog"] textarea[placeholder*="Jelaskan kondisi"]').first();
  await descTextarea.fill('Temperatur ruangan server mengalami kenaikan di atas ambang batas normal dan membutuhkan penanganan segera.');

  // Capture Screenshot 1: Mobile Quick Report Dialog with Custom Category & Target Department
  await app.screenshot('01-ticketing-custom-category-and-target-dept');

  // 9. Submit Ticket Form
  const submitBtn = browser.locator('div[role="dialog"] button:has-text("Kirim Laporan")').first();
  await submitBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 10. Verify Dialog Closed
  await expect(dialogTitle).not.toBeVisible();

  // Capture Screenshot 2: Mobile Dashboard after Ticket Created
  await app.screenshot('02-mobile-dashboard-after-ticket-created');

  // 11. Navigate to Settings Helpdesk to verify Admin Category Management
  await app.open('/dashboard/helpdesk/settings');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const settingsHeading = browser.locator('h1:has-text("Pengaturan Service Desk")').first();
  await expect(settingsHeading).toBeVisible({ timeout: 25000 });

  // Verify "+ Tambah Kategori Baru" Button is present
  const addCategoryBtn = browser.locator('button:has-text("+ Tambah Kategori Baru")').first();
  await expect(addCategoryBtn).toBeVisible({ timeout: 15000 });
  await addCategoryBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Fill Category form inside open dialog
  const catNameInput = browser.locator('input[placeholder*="Kerusakan AC & Pendingin Server"]').last();
  await expect(catNameInput).toBeVisible({ timeout: 15000 });
  await catNameInput.fill('Jaringan IoT & Sensor Telematika');

  // Capture Screenshot 3: Settings Add Category Dialog
  await app.screenshot('03-settings-add-category-dialog');
});
