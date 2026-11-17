import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies Asset Transfer module: 2 tabs (Daftar Transfer read-only & Daftar Transfer Saya with actions), mandatory signature, row actions (Tinjau, Batalkan, PDF), A4 Portrait approval, and Central Approval Inbox (/dashboard/approval) integration', { timeout: 240000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser, {
    username: '71261',
    targetUrl: '/dashboard/assets/transfer',
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open Asset Transfer Dashboard
  await app.open('/dashboard/assets/transfer');
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await expect(browser.locator('body')).toBeVisible();

  // Verify Page Title (Asset Transfer)
  await expect(screen.getByRole('heading', /Asset Transfer|Transfer Aset/i)).toBeVisible();

  // Verify KPI Cards
  await expect(screen.getByText('Total Pengajuan')).toBeVisible();
  await expect(screen.getByText('Menunggu Persetujuan')).toBeVisible();

  // Verify Separate Columns: "Nama Aset" and "Nomor Aset"
  await expect(screen.getByRole('columnheader', 'Nama Aset', { exact: false })).toBeVisible();
  await expect(screen.getByRole('columnheader', 'Nomor Aset', { exact: false })).toBeVisible();

  // Verify Admin Export Buttons & Date Range Picker
  await expect(browser.locator('button:has-text("Excel")')).toBeVisible();
  await expect(browser.locator('button:has-text("PDF")').first()).toBeVisible();
  await expect(screen.getByText(/Rentang Tanggal Ekspor/i)).toBeVisible();

  // Verify Both Tabs are present: "Daftar Transfer" and "Daftar Transfer Saya"
  const tabDaftarTransfer = browser.locator('button[role="tab"]:has-text("Daftar Transfer")').first();
  const tabDaftarTransferSaya = browser.locator('button[role="tab"]:has-text("Daftar Transfer Saya")').first();
  await expect(tabDaftarTransfer).toBeVisible();
  await expect(tabDaftarTransferSaya).toBeVisible();

  // TAB 1 VERIFICATION (Daftar Transfer - Public Read-Only for All Users)
  // Ensure Tab 1 is active by default
  await expect(tabDaftarTransfer).toHaveAttribute('data-state', 'active');

  // Verify Tab 1 action columns contain read-only indicator "-" and NO action buttons
  await expect(browser.locator('table tbody tr:has-text("-")').first()).toBeVisible();
  const tab1TinjauBtn = browser.locator('table tbody tr button:has-text("Tinjau")');
  await expect(tab1TinjauBtn).not.toBeVisible();
  const tab1BatalkanBtn = browser.locator('table tbody tr button:has-text("Batalkan")');
  await expect(tab1BatalkanBtn).not.toBeVisible();

  // Screenshot 1: Tab 1 "Daftar Transfer" (Public Read-Only, no action buttons)
  await app.screenshot('01-asset-transfer-tab-daftar-transfer-readonly');

  // 3. Open Buat Transfer Aset dialog
  const createBtn = browser.locator('button:has-text("Buat Transfer Aset")').first();
  await expect(createBtn).toBeVisible();
  await createBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify dialog is visible and has wider 5xl layout
  const dialog = browser.locator('div[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(browser.locator('div[role="dialog"].max-w-5xl')).toBeVisible();

  // Verify checkbox for equipment is GONE and free-text textarea is PRESENT
  await expect(dialog.getByText('Laptop / Desktop')).not.toBeVisible();

  // Verify textarea for Kelengkapan Aset is present
  const equipmentTextarea = browser.locator('div[role="dialog"] textarea[placeholder*="Contoh: Unit Laptop"]').first();
  await expect(equipmentTextarea).toBeVisible();

  // Fill in manual equipment text
  await equipmentTextarea.fill('1x Unit Laptop Lenovo ThinkPad L14, 1x Adaptor Charger Type-C 65W, 1x Tas Laptop Targus Original, 1x Mouse Wireless Logitech M170');
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Verify Section 3 (Foto Fisik), Section 5 (Catatan Tambahan), and Section 6 (Tanda Tangan Pemohon)
  await expect(screen.getByText(/3\.\s*Foto Kondisi Fisik Aset/i)).toBeVisible();
  await expect(screen.getByText(/5\.\s*Catatan Tambahan/i)).toBeVisible();
  await expect(screen.getByText(/6\.\s*Tanda Tangan Pemohon/i)).toBeVisible();

  // Screenshot 2: Modal Form with manual equipment, photo section, and Section 6 Signature
  await app.screenshot('02-asset-transfer-form-with-signature');

  // Close create dialog via Batal
  const cancelCreateBtn = browser.locator('div[role="dialog"] button:has-text("Batal")').first();
  await cancelCreateBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 4. Switch to TAB 2: "Daftar Transfer Saya" (Applicant & Admin with Action Buttons)
  await tabDaftarTransferSaya.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await expect(tabDaftarTransferSaya).toHaveAttribute('data-state', 'active');

  // Verify Eye icon / button "Lihat Detail" is NOT in the table
  const eyeBtn = browser.locator('table button[title*="Lihat Detail"], table button:has([class*="eye"])');
  await expect(eyeBtn).not.toBeVisible();

  // Verify "Tinjau" button is visible for in_review row
  const tinjauBtn = browser.locator('table tbody tr button:has-text("Tinjau")').first();
  await expect(tinjauBtn).toBeVisible();

  // Verify "Batalkan" button is visible for applicant/admin
  const batalkanBtn = browser.locator('table tbody tr button:has-text("Batalkan")').first();
  await expect(batalkanBtn).toBeVisible();

  // Verify "PDF" button is visible for approved row
  const pdfRowBtn = browser.locator('table tbody tr button:has-text("PDF")').first();
  await expect(pdfRowBtn).toBeVisible();

  // Screenshot 3: Tab 2 "Daftar Transfer Saya" with Action Buttons (Tinjau, Batalkan, PDF)
  await app.screenshot('03-asset-transfer-tab-daftar-transfer-saya-with-actions');

  // 5. Open "Tinjau" Modal (AssetApprovalDialog)
  await tinjauBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // AssetApprovalDialog should open
  const reviewDialog = browser.locator('div[role="dialog"]');
  await expect(reviewDialog).toBeVisible();

  // Verify approval review elements
  await expect(reviewDialog.getByText(/Tanda Tangan Digital/i)).toBeVisible();
  await expect(reviewDialog.getByText('Ringkasan Pengajuan')).toBeVisible();
  await expect(reviewDialog.getByText('Catatan Approval')).toBeVisible();

  // Verify 4-Party Approval Headers on Document Preview (Portrait A4)
  await expect(reviewDialog.getByText(/DIAJUKAN \(HOLDER ASAL\)/i)).toBeVisible();
  await expect(reviewDialog.getByText(/DISETUJUI \(ATASAN HOLDER ASAL\)/i)).toBeVisible();
  await expect(reviewDialog.getByText(/DITERIMA \(HOLDER BARU\)/i)).toBeVisible();
  await expect(reviewDialog.getByText(/DISETUJUI \(ATASAN HOLDER BARU\)/i)).toBeVisible();

  // Verify Physical Photo section and Additional Notes section on Document Preview (Portrait A4)
  await expect(reviewDialog.getByText(/FOTO KONDISI FISIK ASET/i)).toBeVisible();
  await expect(reviewDialog.getByText(/CATATAN \/ KETERANGAN TAMBAHAN/i)).toBeVisible();

  // Verify REVERT button is GONE (Eliminated for Asset Transfer)
  const revertBtn = browser.locator('div[role="dialog"] button:has-text("REVERT")');
  await expect(revertBtn).not.toBeVisible();

  // Verify only Setujui and Tolak buttons are present
  const approveBtn = browser.locator('div[role="dialog"] button:has-text("Setujui Pengajuan")');
  await expect(approveBtn).toBeVisible();
  const rejectBtn = browser.locator('div[role="dialog"] button:has-text("Tolak Pengajuan")');
  await expect(rejectBtn).toBeVisible();

  // Screenshot 4: A4 Portrait Asset Approval Review Dialog without Revert
  await app.screenshot('04-asset-transfer-approval-no-revert-portrait');

  // Close review dialog
  const tutupBtn = browser.locator('div[role="dialog"] button:has-text("Batal"), div[role="dialog"] button:has-text("Tutup")').first();
  if (await tutupBtn.isVisible()) {
    await tutupBtn.click();
  } else {
    await browser.keyboard.press('Escape');
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 6. Verify PDF Preview & Download Button for Approved Asset Transfer on Tab 2
  await expect(pdfRowBtn).toBeVisible();
  await pdfRowBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // PDF Preview Dialog should be visible
  const pdfDialog = browser.locator('div[role="dialog"]');
  await expect(pdfDialog).toBeVisible();
  await expect(pdfDialog.getByText(/Berita Acara Mutasi Aset/i).first()).toBeVisible();
  await expect(pdfDialog.getByText(/Disetujui Penuh/i).first()).toBeVisible();

  // Verify Download PDF button and Open New Tab link
  const downloadPdfLink = browser.locator('div[role="dialog"] a:has-text("Unduh PDF")').first();
  await expect(downloadPdfLink).toBeVisible();
  const newTabLink = browser.locator('div[role="dialog"] a:has-text("Buka Tab Baru")').first();
  await expect(newTabLink).toBeVisible();

  // Verify Document Content
  await expect(pdfDialog.getByText(/PT\. CHITRA PARATAMA/i).first()).toBeVisible();

  // Screenshot 5: PDF Preview and Download Dialog
  await app.screenshot('05-asset-transfer-pdf-preview-and-download-dialog');

  // Close PDF preview dialog via Escape or close button
  await browser.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 7. Verify Central Approval Inbox Integration (/dashboard/approval)
  await app.open('/dashboard/approval');
  await new Promise((resolve) => setTimeout(resolve, 3500));
  await expect(browser.locator('body')).toBeVisible();

  // Verify Heading or Title in Approval Page
  await expect(screen.getByRole('heading', /Persetujuan|Approval/i).first()).toBeVisible();

  // Verify Transfer Document Number is visible in Inbox
  const transferRow = browser.locator('tr:has-text("TRF-202611-0001")').first();
  await expect(transferRow).toBeVisible();

  // Click "Buka TTD ↗" on the transfer row
  const openTtdBtn = browser.locator('tr:has-text("TRF-202611-0001") button:has-text("Buka TTD")').first();
  await expect(openTtdBtn).toBeVisible();
  await openTtdBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify AssetApprovalDialog opens in Approval Workbench
  const inboxDialog = browser.locator('div[role="dialog"]');
  await expect(inboxDialog).toBeVisible();
  await expect(inboxDialog.getByText(/DIAJUKAN \(HOLDER ASAL\)/i)).toBeVisible();
  await expect(inboxDialog.getByText(/DITERIMA \(HOLDER BARU\)/i)).toBeVisible();

  // Screenshot 6: Central Approval Inbox with Asset Transfer Dialog Open
  await app.screenshot('06-asset-transfer-approval-inbox-modal');

  // Close dialog via Escape
  await browser.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 1000));
});
