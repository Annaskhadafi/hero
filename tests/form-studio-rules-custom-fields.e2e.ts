import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify form builder customizable identity rules and custom fields', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Open Form Studio List
  await app.open('/dashboard/form-studio');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();

  // 3. Open Form Builder for Customer Survey 2026
  await app.open('/dashboard/form-studio/152789/builder');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // 4. Switch to Aturan Tab
  const aturanTab = screen.getByRole('tab', { name: /aturan/i });
  await aturanTab.tap();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 4. Verify Akses & Responden Section and Custom Label Inputs
  await expect(screen.getByText('Akses & Responden')).toBeVisible();
  await expect(screen.getByText('Wajibkan Identitas (Nama)')).toBeVisible();
  await expect(screen.getByText('Wajibkan Email')).toBeVisible();
  await expect(screen.getByText('Custom Field Identitas')).toBeVisible();

  // 5. Add a Custom Identity Field
  const addCustomFieldBtn = screen.getByRole('button', { name: /tambah field/i });
  await addCustomFieldBtn.tap();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify custom field card appeared
  await expect(screen.getByText(/#\d+ Field Kustom/).first()).toBeVisible();

  // Customize custom field label
  const customFieldLabelInputs = screen.getByPlaceholder(/misal: NIK \/ Jabatan/i);
  await customFieldLabelInputs.last().fill('Nomor Induk Karyawan (NIK)');

  const customFieldPlaceholderInputs = screen.getByPlaceholder(/contoh: 71261/i);
  await customFieldPlaceholderInputs.last().fill('Masukkan NIK Anda (misal: 71261)');

  // Take screenshot of Form Studio Builder with customized rules & custom field
  await app.screenshot('form-builder-custom-rules-and-fields');

  // 6. Save Form Settings
  const saveBtn = screen.getByRole('button', { name: /simpan/i });
  if (await saveBtn.isVisible()) {
    await saveBtn.tap();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // 7. Open Public Form to verify customer-facing custom fields
  await app.open('/form/f/customer-survey-2026');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await expect(browser.locator('body')).toBeVisible();

  // Verify Identity Gate displays standard fields and the new custom field
  await expect(screen.getByText(/Nomor Induk Karyawan \(NIK\)/i).first()).toBeVisible();
  await app.screenshot('public-form-custom-identity-fields-rendered');

  // 8. Fill in identity data including the custom field
  const nameInput = screen.getByPlaceholder(/nama lengkap/i);
  await nameInput.fill('Budi Santoso');

  const emailInput = screen.getByPlaceholder(/nama@email.com/i);
  await emailInput.fill('budi.santoso@mining-partner.com');

  const phoneInput = screen.getByPlaceholder(/08123456789/i);
  if (await phoneInput.isVisible()) {
    await phoneInput.fill('081234567890');
  }

  const companyInput = screen.getByPlaceholder(/contoh: pt/i);
  if (await companyInput.isVisible()) {
    await companyInput.fill('PT Mitra Tambang Nusantara');
  }

  const deptInput = screen.getByPlaceholder(/plant \/ logistic/i);
  if (await deptInput.isVisible()) {
    await deptInput.fill('Procurement & Supply Chain');
  }

  const customInputs = screen.getByPlaceholder(/masukkan nik anda/i);
  const count = await customInputs.count();
  for (let i = 0; i < count; i++) {
    await customInputs.nth(i).fill('71261');
  }

  // Submit Identity Gate
  const startBtn = screen.getByRole('button', { name: /Mulai Mengisi Kuesioner/i });
  await startBtn.tap();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify transition to questionnaire
  await expect(screen.getByText(/Tenaga Penjual/i).first()).toBeVisible();
  await expect(screen.getByText(/Skala penilaian: 1/i)).toBeVisible();
  await app.screenshot('public-form-started-with-custom-fields');
});
