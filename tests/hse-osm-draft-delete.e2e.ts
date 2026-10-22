import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies draft OSM deletion feature and header subtitle update', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials (Kadhafi - 71261)
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // ----------------------------------------------------
  // PART 1: DESKTOP OSM - Actions Dropdown & Subtitle without KPC
  // ----------------------------------------------------
  await app.open('/dashboard/hse/osm');
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // Scroll down to table and find row Actions button
  const actionsDropdownBtn = browser.locator('button:has-text("Actions")').first();
  await expect(actionsDropdownBtn).toBeVisible({ timeout: 15000 });
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Open Actions Dropdown
  await actionsDropdownBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Screenshot 1: Desktop table with dropdown menu
  await app.screenshot('01-desktop-osm-actions-dropdown');

  // Click "Lihat Detail"
  const viewDetailItem = browser.locator('text=Lihat Detail').first();
  await viewDetailItem.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify modal is open and subtitle matches "HSE Department - PT Chitra Paratama"
  await expect(browser.locator('text=Laporan On the Spot Monitoring (OSM)').first()).toBeVisible({ timeout: 15000 });
  await expect(browser.locator('text=HSE Department - PT Chitra Paratama').first()).toBeVisible({ timeout: 15000 });

  // Screenshot 2: Desktop Modal Header with updated subtitle (without KPC)
  await app.screenshot('02-desktop-osm-modal-header-no-kpc');

  // Close modal with Escape or clicking backdrop
  await browser.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // ----------------------------------------------------
  // PART 2: MOBILE OSM - Create Draft & Delete
  // ----------------------------------------------------
  await app.open('/mobile/hse/osm');
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // Click "Monitoring" to create a fresh draft session
  const monitoringBtn = browser.locator('button:has-text("Monitoring")').first();
  await expect(monitoringBtn).toBeVisible({ timeout: 10000 });
  await monitoringBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Click "+ New"
  const newBtn = browser.locator('button:has-text("New")').first();
  await newBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Step 1: Registrasi Tim - Click Next
  const nextBtn1 = browser.locator('button:has-text("Next"), button:has-text("Lanjut")').first();
  await nextBtn1.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 2: Lokasi & Fokus - Click Next
  const nextBtn2 = browser.locator('button:has-text("Next"), button:has-text("Lanjut")').first();
  await nextBtn2.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 3: Input Temuan - Fill text & Simpan
  const descInput = browser.locator('textarea').first();
  await descInput.fill('Temuan Draft Uji Coba Penghapusan');
  const simpanBtn = browser.locator('button:has-text("Simpan"), button:has-text("Save")').first();
  await simpanBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Now we are in session_detail of this draft session!
  // Screenshot 3: In session_detail with "Hapus Draft" button
  await app.screenshot('03-mobile-osm-session-detail-draft');

  // Go to OSM Reports
  const backBtn = browser.locator('button:has-text("OSM Reports"), button:has-text("Reports"), button:has-text("Back")').first();
  await app.open('/mobile/hse/osm');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const reportBtn = browser.locator('button:has-text("Report")').first();
  await reportBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Select "Created" tab
  const createdTab = browser.locator('button:has-text("Created")').first();
  await createdTab.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Screenshot 4: Mobile Reports showing draft card with "DRAFT" badge & red "Hapus" button
  await app.screenshot('04-mobile-osm-reports-draft-card');

  // Click "Hapus" on the draft card
  const deleteBtn = browser.locator('button:has-text("Hapus")').first();
  await expect(deleteBtn).toBeVisible({ timeout: 10000 });
  await deleteBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Screenshot 5: Confirmation dialog
  await app.screenshot('05-mobile-osm-delete-confirm-dialog');

  // Confirm delete
  const confirmDeleteBtn = browser.locator('button:has-text("Ya, Hapus")').first();
  await confirmDeleteBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Screenshot 6: Verified deleted
  await app.screenshot('06-mobile-osm-after-delete');
});
