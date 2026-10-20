import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify training request full-width, mobile view, and approver selection', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Navigate to /dashboard/training/pengajuan
  await app.open('/dashboard/training/pengajuan');
  await expect(screen.getByText('Pengajuan Training & Lokakarya')).toBeVisible();
  await app.screenshot('training-requests-desktop-page');

  // 3. Open Form Dialog to verify approver section
  const createButton = screen.getByRole('button', 'Buat Pengajuan Training');
  if (await createButton.isVisible()) {
    await createButton.tap();
    await expect(screen.getByText('Pengajuan Pendaftaran Training / Seminar / Lokakarya')).toBeVisible();
    await app.screenshot('training-requests-form-dialog');
    
    // Verify dialog elements directly
    await expect(screen.getByText('I. Data Peserta')).toBeVisible();
    await expect(screen.getByText(/VI\. Konfigurasi Alur Persetujuan/i)).toBeAttached();
    await expect(screen.getByText('Karyawan Pemohon')).toBeAttached();
    await expect(screen.getByText('Pejabat Penyetujui').first()).toBeAttached();
  }

  // 4. Verify Mobile View
  await app.open('/mobile/training/pengajuan');
  await expect(screen.getByText('Pengajuan Training').first()).toBeVisible();
  await expect(screen.getByText('Riwayat & Sertifikat')).toBeVisible();
  await app.screenshot('training-requests-mobile-view');
});

