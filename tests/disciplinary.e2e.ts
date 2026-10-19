import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify hc disciplinary dashboard, auto letter number, signature pad, letterhead toggle, and printable 1 page letter', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Open Disciplinary Case Desk
  await app.open('/dashboard/hc/disciplinary');
  await expect(screen.getByText('Disciplinary Case & Sanction Desk')).toBeVisible();
  await app.screenshot('001-disciplinary-dashboard-overview');

  // 3. Check KPI cards & Main tabs
  const tabCategories = screen.getByText('Kategori & Custom Level SP');
  const tabLetters = screen.getByText('Arsip Surat Sanksi');

  await expect(tabCategories).toBeVisible();
  await expect(tabLetters).toBeVisible();

  // 4. Open Form Terbitkan Sanksi Disiplin
  const btnCreateAction = screen.getByRole('button', 'Terbitkan Sanksi Disiplin');
  if (await btnCreateAction.isVisible()) {
    await btnCreateAction.tap();
    await expect(screen.getByText('Terbitkan Sanksi Disiplin')).toBeVisible();
    await expect(screen.getByText('Gunakan Background Letterhead PT Chitra Paratama')).toBeVisible();
    await expect(screen.getByText('Tanda Tangan Pembuat Surat (HC)')).toBeVisible();
    await app.screenshot('002-modal-terbitkan-sanksi-disiplin');

    // Close form dialog
    const btnBatal = screen.getByRole('button', 'Batal');
    if (await btnBatal.isVisible()) {
      await btnBatal.tap();
    }
  }

  // 5. Test Tab 2: Kategori & Custom Level SP
  await tabCategories.tap();
  await expect(screen.getByText('Master Kategori Pelanggaran & Custom Tingkat SP')).toBeVisible();
  await app.screenshot('003-master-kategori-custom-level-sp');

  // Open Form Tambah Kategori
  const btnCreateCategory = screen.getByRole('button', 'Tambah Master Kategori');
  if (await btnCreateCategory.isVisible()) {
    await btnCreateCategory.tap();
    await expect(screen.getByText('Tambah Kategori Pelanggaran Baru')).toBeVisible();
    await app.screenshot('004-modal-tambah-master-kategori');

    // Close category dialog
    const btnBatalCat = screen.getByRole('button', 'Batal');
    if (await btnBatalCat.isVisible()) {
      await btnBatalCat.tap();
    }
  }

  // 6. Test Tab 3: Arsip Surat Sanksi
  await tabLetters.tap();
  await expect(screen.getByText('Galeri & Dokumen Surat Sanksi')).toBeVisible();
  await app.screenshot('005-arsip-galeri-surat-sanksi');

  // 7. Test Opening Formal Printable Letter Modal (Single page A4)
  const btnBukaSurat = screen.getByRole('button', 'Buka Surat').first();
  if (await btnBukaSurat.isVisible()) {
    await btnBukaSurat.tap();
    await expect(screen.getByText('PT CHITRA PARATAMA').first()).toBeVisible();
    await expect(screen.getByText('Cetak (1 Lembar A4)')).toBeVisible();
    await expect(screen.getByText('Letterhead BG')).toBeVisible();
    await app.screenshot('006-surat-sanksi-preview-a4');
  }

  // 8. AI Agent assertion
  await agent.assert('The Disciplinary Case Desk is fully functional with auto letter number, signature pad for issuer, letterhead toggle, clean 1-page printable letter without approval requirement, and without redundant kata resmi');
});
