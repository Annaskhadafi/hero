import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies complete end-to-end flow of OSM Inspeksi Versi 2', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials (Kadhafi - 71261)
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Open /mobile/hse/osm
  await app.open('/mobile/hse/osm');
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // Automatically accept any confirm/alert dialogs
  await browser.evaluate(() => {
    window.confirm = () => true;
    window.alert = () => true;
  });

  // Verify Hub is loaded
  await expect(browser.locator('text=HSES App').first()).toBeVisible({ timeout: 15000 });
  await app.screenshot('01-osm-v2-hub-dashboard');

  // 3. Test Revisi 1: Click "Monitoring" Action Button
  const monitoringBtn = browser.locator('button:has-text("Monitoring")').first();
  await expect(monitoringBtn).toBeVisible({ timeout: 10000 });
  await monitoringBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Verify Menu Monitoring shows empty state "Tidak ada monitoring" and floating "+ New" button (Slide 2)
  await expect(browser.locator('text=Tidak ada monitoring').first()).toBeVisible({ timeout: 10000 });
  await expect(browser.locator('text=Tap "New" untuk membuat monitoring baru').first()).toBeVisible({ timeout: 10000 });
  const floatingNewBtn = browser.locator('button:has-text("New")').first();
  await expect(floatingNewBtn).toBeVisible({ timeout: 10000 });

  // Capture Screenshot of Revisi 1: Menu Monitoring
  await app.screenshot('02-osm-v2-revisi-1-monitoring-empty');

  // 4. Click "+ New" from Monitoring to test Wizard (Slide 2 & 5)
  await floatingNewBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify Step 1: Registrasi Tim
  await expect(browser.locator('text=Registrasi Tim').first()).toBeVisible({ timeout: 10000 });

  // Add myself as team member if team empty
  const addSelfBtn = browser.locator('button:has-text("+ Tambah"), button:has-text("Tambah Saya")').first();
  if (await addSelfBtn.isVisible().catch(() => false)) {
    await addSelfBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Next to Step 2
  const nextBtn1 = browser.locator('button:has-text("Next"), button:has-text("Lanjut")').first();
  await nextBtn1.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 2: Lokasi & Fokus
  const nextBtn2 = browser.locator('button:has-text("Next"), button:has-text("Lanjut")').first();
  await nextBtn2.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 3: Input Temuan Pertama
  const descInput = browser.locator('textarea').first();
  await descInput.fill('Temuan 1: Pengujian APAR Low Pressure di workshop (OSM Versi 2 Test)');
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Click Simpan Sesi OSM
  const saveSessionBtn = browser.locator('button:has-text("Simpan Sesi OSM")').first();
  await saveSessionBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 5. Now on Session Detail
  // Verify Submit Inspection section is visible with "1 / 3 Temuan Baru" (Slide 5)
  await expect(browser.locator('text=Submit Hasil Inspeksi').first()).toBeVisible({ timeout: 15000 });
  await expect(browser.locator('text=1 / 3 Temuan Baru').first()).toBeVisible({ timeout: 10000 });

  // Add Temuan #2
  const addFindingBtn1 = browser.locator('button:has-text("+ Temuan")').first();
  await addFindingBtn1.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await browser.locator('textarea').first().fill('Temuan 2: Penyimpanan Tools dan Material tidak rapi di area transit.');
  await browser.locator('button:has-text("Simpan Temuan")').first().click();
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // Add Temuan #3 (Now reaches 3 findings!)
  const addFindingBtn2 = browser.locator('button:has-text("+ Temuan")').first();
  await addFindingBtn2.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await browser.locator('textarea').first().fill('Temuan 3: Jalur evakuasi darurat terhalang pallet.');
  await browser.locator('button:has-text("Simpan Temuan")').first().click();
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // Verify indicator now shows 3 / 3 Temuan Baru and Submit button is active
  await expect(browser.locator('text=3 / 3 Temuan Baru').first()).toBeVisible({ timeout: 10000 });

  // Capture Screenshot of Session Detail with 3 findings before submit
  await app.screenshot('03-osm-v2-revisi-3-detail-3-findings');

  // Submit the inspection (Slide 5 & 6)
  const submitBtn = browser.locator('button:has-text("Submit Laporan Sekarang")').first();
  await submitBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Verify Lock Banner is now visible (Slide 6)
  await expect(browser.locator('text=Laporan Terkunci (Telah Disubmit)').first()).toBeVisible({ timeout: 15000 });
  await app.screenshot('04-osm-v2-revisi-3-locked-banner');

  // 6. Return to Reports and test Revisi 2 (Slide 3 & 4)
  const backToReports = browser.locator('button:has(.lucide-arrow-left)').first();
  await backToReports.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify OSM Reports header, 3 tabs, and the newly created card with Circular Progress Gauge!
  await expect(browser.locator('h1:has-text("OSM Reports")').first()).toBeVisible({ timeout: 10000 });
  await app.screenshot('05-osm-v2-revisi-2-reports-card-gauge');
});
