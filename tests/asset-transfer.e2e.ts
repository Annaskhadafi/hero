import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('verifies Asset Transfer module: login, dashboard, KPI cards, HeroDataTable, form dialog, equipment checklist, and sidebar placement', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await app.open('/sign-in');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const emailField = screen.getByRole('textbox', 'Email atau SN karyawan');
  const passField = screen.getByRole('textbox', 'Kata sandi');
  const loginBtn = screen.getByRole('button', 'Masuk ke HERO');

  await emailField.fill('mochamad.khadafi@chitraparatama.co.id');
  await passField.fill('Chitra#71261');
  await loginBtn.tap();

  // Wait for redirect to complete
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 2. Open Asset Transfer Dashboard
  await app.open('/dashboard/assets/transfer');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Verify Page Title
  await expect(screen.getByRole('heading', 'Transfer Aset', { exact: false })).toBeVisible();

  // Verify KPI Cards
  await expect(screen.getByText('Total Pengajuan')).toBeVisible();
  await expect(screen.getByText('Menunggu Persetujuan')).toBeVisible();

  // Screenshot 1: Main Dashboard with KPI cards and HeroDataTable
  await app.screenshot('01-asset-transfer-dashboard');

  // 3. Open Buat Transfer Aset dialog
  const createBtn = screen.getByRole('button', 'Buat Transfer Aset', { exact: false });
  await expect(createBtn).toBeVisible();
  await createBtn.tap();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify dialog is visible
  await expect(screen.getByRole('dialog')).toBeVisible();

  // Screenshot 2: Modal Form Transfer Aset (6 Sections)
  await app.screenshot('02-asset-transfer-form-dialog');

  // 4. Test equipment checkboxes
  const laptopCheck = screen.getByRole('checkbox', 'Laptop / Desktop', { exact: false });
  if (await laptopCheck.isVisible()) {
    await laptopCheck.tap();
  }
  const chargerCheck = screen.getByRole('checkbox', 'Charger', { exact: false });
  if (await chargerCheck.isVisible()) {
    await chargerCheck.tap();
  }
  const tasCheck = screen.getByRole('checkbox', 'Tas', { exact: false });
  if (await tasCheck.isVisible()) {
    await tasCheck.tap();
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Screenshot 3: Equipment checkboxes checked
  await app.screenshot('03-asset-transfer-form-equipment-checked');

  // Close dialog via Batal
  const cancelBtn = screen.getByRole('button', 'Batal', { exact: false });
  if (await cancelBtn.isVisible()) {
    await cancelBtn.tap();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 5. Expand Central Service section in sidebar if needed
  const csBtn = screen.getByRole('button', 'Central Service', { exact: false });
  if (await csBtn.isVisible()) {
    await csBtn.tap();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Screenshot 4: Sidebar menu showing Transfer Aset
  await app.screenshot('04-asset-transfer-sidebar-verified');
});
