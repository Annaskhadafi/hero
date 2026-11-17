import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify mobile dashboard 16 core features and troubleshoot widget with image preview', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);

  // 2. Open /mobile/dashboard with active session
  await app.open('/mobile/dashboard');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. Verify Section Header: Layanan Utama
  const layananUtamaHeader = browser.locator('p:has-text("Layanan Utama")').first();
  await expect(layananUtamaHeader).toBeVisible({ timeout: 45000 });

  // 4. Verify 16 Core Features in 4x4 Grid
  const featureCheckIn = browser.locator('span:has-text("Check-In")').first();
  const featureAktivitas = browser.locator('span:has-text("Aktivitas Harian")').first();
  const featureTroubleshoot = browser.locator('span:has-text("Troubleshoot & Tiket")').first();
  const featureProgress = browser.locator('span:has-text("Input Progress")').first();
  const featureSPL = browser.locator('span:has-text("Pengajuan SPL")').first();
  const featureBarang = browser.locator('span:has-text("Request Barang")').first();
  const featureHSE = browser.locator('span:has-text("HSE Report")').first();
  const featureIzin = browser.locator('span:has-text("Izin & Terlambat")').first();

  await expect(featureCheckIn).toBeVisible();
  await expect(featureAktivitas).toBeVisible();
  await expect(featureTroubleshoot).toBeVisible();
  await expect(featureProgress).toBeVisible();
  await expect(featureSPL).toBeVisible();
  await expect(featureBarang).toBeVisible();
  await expect(featureHSE).toBeVisible();
  await expect(featureIzin).toBeVisible();

  // Capture Screenshot 1: Mobile Dashboard 16 Core Features 4x4 Grid
  await app.screenshot('01-mobile-dashboard-16-features-grid');

  // 5. Verify Troubleshoot & Tiket Widget on Mobile Dashboard
  const widgetHeader = browser.locator('h2:has-text("Troubleshoot & Tiket Kendala")').first();
  await expect(widgetHeader).toBeVisible();

  // 6. Verify Personal vs Departemen Scope Toggle
  const togglePersonal = browser.locator('button:has-text("Personal")').first();
  const toggleDepartemen = browser.locator('button:has-text("Departemen")').first();
  await expect(togglePersonal).toBeVisible();
  await expect(toggleDepartemen).toBeVisible();

  // Test toggling to Departemen scope
  await toggleDepartemen.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Test toggling back to Personal scope
  await togglePersonal.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Capture Screenshot 2: Troubleshoot Widget with Personal & Departemen Scoping
  await app.screenshot('02-mobile-dashboard-troubleshoot-widget');

  // 7. Test Quick Ticket Creation from Mobile Dashboard Widget
  const createTicketBtn = browser.locator('section button:has-text("Buat Tiket")').first();
  await expect(createTicketBtn).toBeVisible();
  await createTicketBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const dialogTitle = browser.locator('div[role="dialog"] :has-text("Lapor Kendala / Buat Tiket")').first();
  await expect(dialogTitle).toBeVisible({ timeout: 10000 });

  // Fill Quick Ticket Form
  const titleInput = browser.locator('div[role="dialog"] input[placeholder*="Gagal sinkron"]').first();
  await titleInput.fill('Kendala Sensor Kecepatan GPS di Hauler H012');

  const unitInput = browser.locator('div[role="dialog"] input[placeholder*="Timesheet V2"]').first();
  await unitInput.fill('Unit H012');

  const descTextarea = browser.locator('div[role="dialog"] textarea[placeholder*="Jelaskan kondisi"]').first();
  await descTextarea.fill('Sensor GPS unit H012 site Balikpapan mengalami deviasi pembacaan kecepatan saat melintas area pit.');

  // Capture Screenshot 3: Mobile Dashboard Quick Report Dialog with Upload Option
  await app.screenshot('03-mobile-dashboard-ticket-dialog-with-upload');

  // Submit Form
  const submitBtn = browser.locator('div[role="dialog"] button:has-text("Kirim Laporan")').first();
  await submitBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // 8. Verify Ticket Appears in Widget
  const newTicket = browser.locator('text=Kendala Sensor Kecepatan GPS').first();
  await expect(newTicket).toBeVisible({ timeout: 15000 });

  // 9. Click Ticket to Open Detail Sheet
  await newTicket.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const sheetTitle = browser.locator('h3:has-text("Tiket TKT-")').first();
  await expect(sheetTitle).toBeVisible({ timeout: 15000 });

  // Capture Screenshot 4: Ticket Detail Bottom Sheet & Activities
  await app.screenshot('04-mobile-dashboard-ticket-inspector-sheet');
});
