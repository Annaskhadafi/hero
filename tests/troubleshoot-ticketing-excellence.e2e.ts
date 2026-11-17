import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify authentic troubleshooting and ticketing workflow without dummy data', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials
  await loginToHero(app, screen, browser);

  // 2. Open /dashboard/helpdesk with active session
  await app.open('/dashboard/helpdesk');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. Verify All 4 Core Sections are Present
  const alurTiketTitle = browser.locator('h2:has-text("1. Alur Tiket")').first();
  await expect(alurTiketTitle).toBeVisible({ timeout: 45000 });

  const baruCol = browser.locator('span:has-text("Baru")').first();
  const assignedCol = browser.locator('span:has-text("Assigned")').first();
  const investigasiCol = browser.locator('span:has-text("Investigasi")').first();
  const menungguPartCol = browser.locator('span:has-text("Menunggu Part")').first();
  const selesaiCol = browser.locator('span:has-text("Selesai (7 hari)")').first();

  await expect(baruCol).toBeVisible();
  await expect(assignedCol).toBeVisible();
  await expect(investigasiCol).toBeVisible();
  await expect(menungguPartCol).toBeVisible();
  await expect(selesaiCol).toBeVisible();

  const daftarTiketTitle = browser.locator('h2:has-text("2. Daftar Tiket Troubleshoot")').first();
  await expect(daftarTiketTitle).toBeVisible();

  const detailTiketTitle = browser.locator('h3:has-text("Detail Tiket")').first();
  await expect(detailTiketTitle).toBeVisible();

  const temuanKategoriTitle = browser.locator('h3:has-text("3. Temuan per Kategori")').first();
  await expect(temuanKategoriTitle).toBeVisible();

  const ringkasanSiteTitle = browser.locator('h3:has-text("4. Ringkasan per Site")').first();
  await expect(ringkasanSiteTitle).toBeVisible();

  // 4. Test Action: Buat Tiket Baru (Real User Submission)
  const createBtn = browser.locator('button:has-text("Buat Tiket Baru")').first();
  await expect(createBtn).toBeVisible();
  await createBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Verify Dialog opens
  const dialogTitle = browser.locator('div[role="dialog"] :has-text("Lapor Kendala / Buat Tiket")').first();
  await expect(dialogTitle).toBeVisible({ timeout: 10000 });

  // Fill real ticket data
  const titleInput = browser.locator('div[role="dialog"] input[placeholder*="Gagal sinkron"]').first();
  await titleInput.fill('Kendala Sinkronisasi Presensi GPS di Site Balikpapan');

  const descTextarea = browser.locator('div[role="dialog"] textarea[placeholder*="Jelaskan kondisi"]').first();
  await descTextarea.fill('Karyawan shift pagi melaporkan aplikasi mobile menampilkan radius GPS di luar jangkauan saat berada di area workshop Balikpapan.');

  const unitInput = browser.locator('div[role="dialog"] input[placeholder*="Timesheet V2"]').first();
  await unitInput.fill('Mobile App GPS');

  // Capture Screenshot 1: Create Ticket Dialog
  await app.screenshot('01-excellence-troubleshoot-create-dialog');

  // Submit Form
  const submitBtn = browser.locator('div[role="dialog"] button:has-text("Submit Tiket")').first();
  await submitBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 5. Verify Newly Created Real Ticket Appears in Table and Kanban
  const newTicketCell = browser.locator('text=Mobile App GPS').first();
  await expect(newTicketCell).toBeVisible({ timeout: 15000 });

  // Capture Screenshot 2: Overview with Real Ticket
  await app.screenshot('02-excellence-troubleshoot-overview');

  // 6. Test Interactive Ticket Selection & Inspector Panel
  const tableRow = browser.locator('tr:has-text("Mobile App GPS")').first();
  await tableRow.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify Inspector displays the selected real ticket
  const inspectorFinding = browser.locator('text=Karyawan shift pagi melaporkan aplikasi mobile').first();
  await expect(inspectorFinding).toBeVisible();

  // 7. Test Action: Tambah Catatan (Add Note)
  const addNoteBtn = browser.locator('button:has-text("Tambah Catatan")').first();
  await expect(addNoteBtn).toBeVisible();
  await addNoteBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const noteTextarea = browser.locator('div[role="dialog"] textarea[placeholder*="Tuliskan catatan teknis"]').first();
  await noteTextarea.fill('Tim IT Site Balikpapan sedang melakukan verifikasi koordinat geotagging workshop.');

  const saveNoteBtn = browser.locator('div[role="dialog"] button:has-text("Kirim Catatan")').first();
  await saveNoteBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify note appears in activity audit trail
  const activityNote = browser.locator('text=Tim IT Site Balikpapan sedang melakukan verifikasi').first();
  await expect(activityNote).toBeVisible({ timeout: 10000 });

  // 8. Test Action: Update Status (to Investigasi)
  const updateStatusBtn = browser.locator('button:has-text("Update Status")').first();
  await expect(updateStatusBtn).toBeVisible();
  await updateStatusBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const saveStatusBtn = browser.locator('div[role="dialog"] button:has-text("Simpan Perubahan")').first();
  await saveStatusBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Capture Screenshot 3: Inspector with Activities & Real Data
  await app.screenshot('03-excellence-troubleshoot-inspector-selected');
});
