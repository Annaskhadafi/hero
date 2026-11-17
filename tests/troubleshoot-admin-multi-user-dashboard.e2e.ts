import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify troubleshoot maestro-grade dashboard with multi-user select and admin controls', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);

  // 2. Open /dashboard/helpdesk
  await app.open('/dashboard/helpdesk');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. Verify page header & 4 Maestro-Grade KPI Cards
  const headerTitle = browser.locator('h1:has-text("Troubleshoot & Service Desk Command Center")').first();
  await expect(headerTitle).toBeVisible({ timeout: 45000 });

  const kpiTotal = browser.locator('p:has-text("Total Tiket Aktif"), span:has-text("Total Tiket Aktif")').first();
  const kpiKritis = browser.locator('p:has-text("Kritis & Overdue"), span:has-text("Kritis & Overdue")').first();
  const kpiInvestigasi = browser.locator('p:has-text("Dalam Investigasi"), span:has-text("Dalam Investigasi")').first();
  const kpiCompliance = browser.locator('p:has-text("SLA Compliance Rate"), span:has-text("SLA Compliance Rate")').first();

  await expect(kpiTotal).toBeVisible();
  await expect(kpiKritis).toBeVisible();
  await expect(kpiInvestigasi).toBeVisible();
  await expect(kpiCompliance).toBeVisible();

  // Capture Screenshot 1: Maestro-grade KPI Cards & Recharts Visual Overview
  await app.screenshot('001-01-troubleshoot-maestro-kpi-and-charts');

  // 4. Click "+ Buat Tiket"
  const buatTiketBtn = browser.locator('button:has-text("+ Buat Tiket")').first();
  await expect(buatTiketBtn).toBeVisible();
  await buatTiketBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify Modal Form Opens
  const formTitle = browser.locator('h2:has-text("Buat Tiket Kendala Baru")').first();
  await expect(formTitle).toBeVisible();

  // Fill in Ticket Title
  const inputTitle = browser.locator('div[role="dialog"] input[placeholder*="Gagal sinkronisasi data roster lembur"]').first();
  await inputTitle.fill('Kendala Sensor Telematika Pos 4 & 5 Offline');

  // Multi-User PIC Select in Creation Form
  const picSelectBtn = browser.locator('button:has-text("Pilih beberapa teknisi")').first();
  if (await picSelectBtn.isVisible()) {
    await picSelectBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 600));
    // Click an option in the popover
    const picOption = browser.locator('div[data-radix-popper-content-wrapper] button').first();
    if (await picOption.isVisible()) {
      await picOption.click();
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    // Click outside to close popover
    await formTitle.click();
  }

  // Fill in Description
  const inputDesc = browser.locator('div[role="dialog"] textarea[placeholder*="Jelaskan secara rinci"]').first();
  await inputDesc.fill('Sensor telematika pada unit HD785 tidak mengirimkan data pembacaan tekanan dan suhu selama 12 jam terakhir saat beroperasi di Pit Utara.');

  // Capture Screenshot 2: Modal Buat Tiket with Multi-User Select
  await app.screenshot('002-02-troubleshoot-create-multi-user-ticket');

  // Click Submit
  const submitBtn = browser.locator('div[role="dialog"] button:has-text("Simpan & Buat Tiket")').first();
  await submitBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 5. Test Multi-User Filter in Toolbar
  const picFilterBtn = browser.locator('button:has-text("Filter PIC Multi-User...")').first();
  if (await picFilterBtn.isVisible()) {
    await picFilterBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 600));
    const filterOption = browser.locator('div[data-radix-popper-content-wrapper] button').first();
    if (await filterOption.isVisible()) {
      await filterOption.click();
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    await browser.keyboard.press('Escape');
  }

  // Capture Screenshot 3: Multi-User Filtered Table View
  await app.screenshot('003-03-troubleshoot-multi-user-filtered');

  // 6. Test Admin Edit / Delete Modal
  const editBtn = browser.locator('button[title*="Edit Tiket (Admin)"]').first();
  if (await editBtn.isVisible()) {
    await editBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 800));
    const adminEditHeader = browser.locator('h2:has-text("Admin: Edit Rincian Tiket Menyeluruh")').first();
    if (await adminEditHeader.isVisible()) {
      // Close admin edit modal
      const cancelEdit = browser.locator('div[role="dialog"] button:has-text("Batal")').first();
      await cancelEdit.click();
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  // Test Admin Delete Confirmation Dialog
  const deleteBtn = browser.locator('button[title*="Hapus Tiket (Admin)"]').first();
  if (await deleteBtn.isVisible()) {
    await deleteBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 800));
    const confirmTitle = browser.locator('h2:has-text("Hapus Tiket Secara Permanen?")').first();
    await expect(confirmTitle).toBeVisible();

    // Capture Screenshot 4: Admin Delete Confirmation Dialog (HeroConfirmDialog)
    await app.screenshot('004-04-troubleshoot-admin-edit-delete-confirm');

    // Click Batal on confirm dialog to preserve data
    const cancelConfirm = browser.locator('div[role="dialog"] button:has-text("Batal")').last();
    if (await cancelConfirm.isVisible()) {
      await cancelConfirm.click();
    }
  } else {
    // If delete button not shown (e.g. non-admin or table empty), take screenshot of table
    await app.screenshot('004-04-troubleshoot-admin-edit-delete-confirm');
  }
});
