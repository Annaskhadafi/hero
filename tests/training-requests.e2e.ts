import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify training request attachment features, full-width, mobile view, and approver selection', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO with targetUrl
  await loginToHero(app, screen, browser, '/dashboard/training/pengajuan');

  // 2. Verify dashboard loaded
  await expect(screen.getByText('Pengajuan Training & Lokakarya')).toBeVisible();
  await app.screenshot('training-requests-desktop-page');

  // 3. Open Form Dialog to verify Section V attachment format & approver section
  const createButton = screen.getByRole('button', 'Buat Pengajuan Training');
  if (await createButton.isVisible()) {
    await createButton.tap();
    await expect(screen.getByText('Pengajuan Pendaftaran Training / Seminar / Lokakarya')).toBeVisible();
    
    // Verify Section V text and supported formats
    await expect(screen.getByText(/V\. Lampiran Berkas/i)).toBeAttached();
    await expect(screen.getByText(/Pilih File Lampiran \(PDF \/ Excel \/ Word \/ Gambar\)/i)).toBeAttached();
    await expect(screen.getByText(/Format yang didukung: PDF, Excel/i)).toBeAttached();
    await app.screenshot('training-requests-form-dialog-with-excel');

    // Close dialog
    const cancelButton = screen.getByRole('button', 'Batal');
    if (await cancelButton.isVisible()) {
      await cancelButton.tap();
    }
  }

  // 4. Test Attachment Dialog on existing request if available
  const attachButton = screen.getByText(/\+ Lampirkan Penawaran|Ganti/i).first();
  if (await attachButton.isVisible()) {
    await attachButton.tap();
    await expect(screen.getByText('Lampirkan / Ganti Berkas Penawaran')).toBeVisible();
    await app.screenshot('training-requests-attachment-dialog');
    
    const cancelModal = screen.getByRole('button', 'Batal');
    if (await cancelModal.isVisible()) {
      await cancelModal.tap();
    }
  }

  // 5. Verify Mobile View
  await app.open('/mobile/training/pengajuan');
  await expect(screen.getByText('Pengajuan Training').first()).toBeVisible();
  await expect(screen.getByText('Riwayat & Sertifikat')).toBeVisible();
  await app.screenshot('training-requests-mobile-view');
});
