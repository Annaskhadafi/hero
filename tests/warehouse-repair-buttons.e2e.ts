import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies all buttons and dialog interactions across warehouse repair module', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate and land on Warehouse Repair Dashboard
  await loginToHero(app, screen, browser, '/dashboard/warehouse-repair');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // --- 1. TEST DASHBOARD BUTTONS ---
  // Button: Tambah Barang
  const btnTambahBarangDash = browser.locator('button:has-text("Tambah Barang")').first();
  await expect(btnTambahBarangDash).toBeVisible({ timeout: 10000 });
  await btnTambahBarangDash.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const dialogItem = browser.locator('[role="dialog"]').first();
  await expect(dialogItem).toBeVisible({ timeout: 5000 });
  const btnBatalItem = browser.locator('button:has-text("Batal")').first();
  if (await btnBatalItem.isVisible()) {
    await btnBatalItem.click();
  } else {
    await browser.keyboard.press('Escape');
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Button: Barang Masuk (Dashboard)
  const btnInboundDash = browser.locator('button:has-text("Barang Masuk")').first();
  await expect(btnInboundDash).toBeVisible();
  await btnInboundDash.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const dialogInbound = browser.locator('[role="dialog"]').first();
  await expect(dialogInbound).toBeVisible({ timeout: 5000 });
  const btnBatalInbound = browser.locator('button:has-text("Batal")').first();
  if (await btnBatalInbound.isVisible()) {
    await btnBatalInbound.click();
  } else {
    await browser.keyboard.press('Escape');
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Button: Barang Keluar (Dashboard)
  const btnOutboundDash = browser.locator('button:has-text("Barang Keluar")').first();
  await expect(btnOutboundDash).toBeVisible();
  await btnOutboundDash.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const dialogOutbound = browser.locator('[role="dialog"]').first();
  await expect(dialogOutbound).toBeVisible({ timeout: 5000 });
  const btnBatalOutbound = browser.locator('button:has-text("Batal")').first();
  if (await btnBatalOutbound.isVisible()) {
    await btnBatalOutbound.click();
  } else {
    await browser.keyboard.press('Escape');
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Button: Transfer S-Loc (Dashboard)
  const btnTransferDash = browser.locator('button:has-text("Transfer S-Loc")').first();
  await expect(btnTransferDash).toBeVisible();
  await btnTransferDash.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const dialogTransfer = browser.locator('[role="dialog"]').first();
  await expect(dialogTransfer).toBeVisible({ timeout: 5000 });
  const btnBatalTransfer = browser.locator('button:has-text("Batal")').first();
  if (await btnBatalTransfer.isVisible()) {
    await btnBatalTransfer.click();
  } else {
    await browser.keyboard.press('Escape');
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Button: Laporan Lengkap
  const btnLaporanLengkap = browser.locator('button:has-text("Laporan Lengkap")').first();
  await expect(btnLaporanLengkap).toBeVisible();

  // Screenshot 1: Dashboard buttons verified
  await app.screenshot('01-warehouse-dashboard-buttons-verified');

  // --- 2. TEST DATA BARANG PAGE BUTTONS ---
  await app.open('/dashboard/warehouse-repair/barang');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Button: Tambah Barang
  const btnTambahBarangPage = browser.locator('button:has-text("Tambah Barang")').first();
  await expect(btnTambahBarangPage).toBeVisible({ timeout: 10000 });
  await btnTambahBarangPage.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const dialogBarangPage = browser.locator('[role="dialog"]').first();
  await expect(dialogBarangPage).toBeVisible();
  const btnBatalBarangPage = browser.locator('button:has-text("Batal")').first();
  if (await btnBatalBarangPage.isVisible()) {
    await btnBatalBarangPage.click();
  } else {
    await browser.keyboard.press('Escape');
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Button: Transfer Stok
  const btnTransferStokPage = browser.locator('button:has-text("Transfer Stok")').first();
  if (await btnTransferStokPage.isVisible()) {
    await btnTransferStokPage.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const dialogTransferStok = browser.locator('[role="dialog"]').first();
    await expect(dialogTransferStok).toBeVisible();
    const btnBatalTransferStok = browser.locator('button:has-text("Batal")').first();
    if (await btnBatalTransferStok.isVisible()) {
      await btnBatalTransferStok.click();
    } else {
      await browser.keyboard.press('Escape');
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Row Action Button: Detail (Eye Icon)
  const detailActionBtn = browser.locator('button[title="Lihat Detail Barang"]').first();
  if (await detailActionBtn.isVisible()) {
    await detailActionBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const detailDialog = browser.locator('[role="dialog"]').first();
    await expect(detailDialog).toBeVisible();
    await browser.keyboard.press('Escape');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Row Action Button: Edit (FilePenLine Icon)
  const editActionBtn = browser.locator('button[title="Edit Data Barang"]').first();
  if (await editActionBtn.isVisible()) {
    await editActionBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const editDialog = browser.locator('[role="dialog"]').first();
    await expect(editDialog).toBeVisible();
    const btnBatalEdit = browser.locator('button:has-text("Batal")').first();
    if (await btnBatalEdit.isVisible()) {
      await btnBatalEdit.click();
    } else {
      await browser.keyboard.press('Escape');
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Export buttons
  const btnExportExcel = browser.locator('button:has-text("Excel"), button[aria-label*="Excel"]').first();
  if (await btnExportExcel.isVisible()) {
    await expect(btnExportExcel).toBeEnabled();
  }
  const btnExportPdf = browser.locator('button:has-text("PDF"), button[aria-label*="PDF"]').first();
  if (await btnExportPdf.isVisible()) {
    await expect(btnExportPdf).toBeEnabled();
  }

  // Screenshot 2: Data Barang buttons verified
  await app.screenshot('02-warehouse-barang-buttons-verified');

  // --- 3. TEST JENIS BARANG PAGE BUTTONS ---
  await app.open('/dashboard/warehouse-repair/jenis');
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const btnTambahJenis = browser.locator('button:has-text("Tambah Jenis")').first();
  if (await btnTambahJenis.isVisible()) {
    await btnTambahJenis.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const modalJenis = browser.locator('[role="dialog"]').first();
    await expect(modalJenis).toBeVisible();
    const btnBatalJenis = browser.locator('button:has-text("Batal")').first();
    if (await btnBatalJenis.isVisible()) {
      await btnBatalJenis.click();
    } else {
      await browser.keyboard.press('Escape');
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // --- 4. TEST SATUAN PAGE BUTTONS ---
  await app.open('/dashboard/warehouse-repair/satuan');
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const btnTambahSatuan = browser.locator('button:has-text("Tambah Satuan")').first();
  if (await btnTambahSatuan.isVisible()) {
    await btnTambahSatuan.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const modalSatuan = browser.locator('[role="dialog"]').first();
    await expect(modalSatuan).toBeVisible();
    const btnBatalSatuan = browser.locator('button:has-text("Batal")').first();
    if (await btnBatalSatuan.isVisible()) {
      await btnBatalSatuan.click();
    } else {
      await browser.keyboard.press('Escape');
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // --- 5. TEST BARANG MASUK BUTTONS ---
  await app.open('/dashboard/warehouse-repair/barang-masuk');
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const btnEntriMasuk = browser.locator('button:has-text("Entri Barang Masuk")').first();
  if (await btnEntriMasuk.isVisible()) {
    await btnEntriMasuk.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const modalEntriMasuk = browser.locator('[role="dialog"]').first();
    await expect(modalEntriMasuk).toBeVisible();
    const btnBatalEntriMasuk = browser.locator('button:has-text("Batal")').first();
    if (await btnBatalEntriMasuk.isVisible()) {
      await btnBatalEntriMasuk.click();
    } else {
      await browser.keyboard.press('Escape');
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // --- 6. TEST BARANG KELUAR BUTTONS ---
  await app.open('/dashboard/warehouse-repair/barang-keluar');
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const btnEntriKeluar = browser.locator('button:has-text("Entri Barang Keluar")').first();
  if (await btnEntriKeluar.isVisible()) {
    await btnEntriKeluar.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const modalEntriKeluar = browser.locator('[role="dialog"]').first();
    await expect(modalEntriKeluar).toBeVisible();
    const btnBatalEntriKeluar = browser.locator('button:has-text("Batal")').first();
    if (await btnBatalEntriKeluar.isVisible()) {
      await btnBatalEntriKeluar.click();
    } else {
      await browser.keyboard.press('Escape');
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Screenshot 3: Barang Keluar buttons verified
  await app.screenshot('03-warehouse-barang-keluar-buttons-verified');
});
