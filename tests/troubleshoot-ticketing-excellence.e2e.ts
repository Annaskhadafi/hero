import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify excellence troubleshooting and ticketing dashboard matches reference layout', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Perform login with standard credentials targeting helpdesk
  await loginToHero(app, screen, browser, { targetUrl: '/dashboard/helpdesk' });

  // 2. Ensure /dashboard/helpdesk is open with active session
  await app.open('/dashboard/helpdesk');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. Verify Section 1: Alur Tiket (Kanban Board with 5 Status Columns)
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

  // 4. Verify Section 2: Daftar Tiket Troubleshoot & Detail Tiket (Split View)
  const daftarTiketTitle = browser.locator('h2:has-text("2. Daftar Tiket Troubleshoot")').first();
  await expect(daftarTiketTitle).toBeVisible();

  const detailTiketTitle = browser.locator('h3:has-text("Detail Tiket")').first();
  await expect(detailTiketTitle).toBeVisible();

  // 5. Verify Section 3: Temuan per Kategori (Horizontal Bar Chart)
  const temuanKategoriTitle = browser.locator('h3:has-text("3. Temuan per Kategori")').first();
  await expect(temuanKategoriTitle).toBeVisible();

  // 6. Verify Section 4: Ringkasan per Site
  const ringkasanSiteTitle = browser.locator('h3:has-text("4. Ringkasan per Site")').first();
  await expect(ringkasanSiteTitle).toBeVisible();

  // Capture Screenshot 1: Primary Overview of 4 Sections Matching Reference
  await app.screenshot('01-excellence-troubleshoot-overview');

  // 7. Test Interactive Ticket Selection: Click a ticket in the table
  const ticketTkt42 = browser.locator('td:has-text("TKT-0042")').first();
  if (await ticketTkt42.isVisible().catch(() => false)) {
    await ticketTkt42.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Capture Screenshot 2: Active Inspector Panel with Ticket Details & Activities
  await app.screenshot('02-excellence-troubleshoot-inspector-selected');

  // 8. Test Action Button: Click "+ Buat Tiket Baru"
  const createBtn = browser.locator('button:has-text("Buat Tiket Baru")').first();
  await expect(createBtn).toBeVisible();
  await createBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Verify dialog is open
  const dialogTitle = browser.locator('div[role="dialog"] :has-text("Lapor Kendala / Buat Tiket")').first();
  await expect(dialogTitle).toBeVisible({ timeout: 10000 });

  // Capture Screenshot 3: Create Ticket Form Dialog with Smart Troubleshooting
  await app.screenshot('03-excellence-troubleshoot-create-dialog');
});
