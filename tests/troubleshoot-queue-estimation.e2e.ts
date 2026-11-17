import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify service desk queue number and dynamic handling estimation', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials and target /dashboard/helpdesk
  await loginToHero(app, screen, browser, '/dashboard/helpdesk');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Open "+ Buat Tiket" dialog
  const buatTiketBtn = browser.locator('button:has-text("+ Buat Tiket")').first();
  await expect(buatTiketBtn).toBeVisible({ timeout: 45000 });
  await buatTiketBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. Fill in ticket details
  const titleInput = browser.locator('div[role="dialog"] input[type="text"]').first();
  await expect(titleInput).toBeVisible({ timeout: 15000 });
  await titleInput.fill('Kendala Sinkronisasi Roster & Memory Spike HERO Site');

  const descTextarea = browser.locator('div[role="dialog"] textarea').first();
  await expect(descTextarea).toBeVisible({ timeout: 15000 });
  await descTextarea.fill('Ditemukan spike memori pada server sinkronisasi roster kerja site saat pergantian shift.');

  // 4. Submit form
  const submitBtn = browser.locator('div[role="dialog"] button:has-text("Simpan & Buat Tiket")').first();
  await submitBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // 5. Verify Ticket Creation Success Dialog with Queue Number and Estimation
  const successModalTitle = browser.locator('h2:has-text("Tiket Berhasil Didaftarkan!")').first();
  await expect(successModalTitle).toBeVisible({ timeout: 30000 });

  const queueBadge = browser.locator('span:has-text("ANTRIAN #")').first();
  await expect(queueBadge).toBeVisible();

  const estHeading = browser.locator('span:has-text("Perkiraan Estimasi Penanganan")').first();
  await expect(estHeading).toBeVisible();

  // Capture Screenshot 1: Success Modal with Prominent Queue Number & Handling Estimation
  await app.screenshot('001-01-ticket-created-queue-success-modal');

  // 6. Click "Buka Detail Tiket" from success modal
  const viewDetailBtn = browser.locator('button:has-text("Buka Detail Tiket")').first();
  await expect(viewDetailBtn).toBeVisible();
  await viewDetailBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 7. Verify Queue & Estimation Card in Selected Ticket Inspector Panel
  const queueCardTitle = browser.locator('div:has-text("Status Antrian Pengerjaan")').first();
  await expect(queueCardTitle).toBeVisible({ timeout: 15000 });

  const estStartLabel = browser.locator('span:has-text("Est. Mulai Ditangani")').first();
  await expect(estStartLabel).toBeVisible();

  // Capture Screenshot 2: Ticket Inspector with Queue & Estimation Card
  await app.screenshot('002-02-ticket-detail-queue-and-estimation-card');

  // 8. Verify Queue Badges (Q#) in Ticket Table List
  const queueTableBadge = browser.locator('span:has-text("Q#")').first();
  await expect(queueTableBadge).toBeVisible({ timeout: 15000 });

  // Capture Screenshot 3: Ticket List & Kanban Cards with Q# Badges
  await app.screenshot('003-03-ticket-list-queue-badges');
});
