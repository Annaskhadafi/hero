import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify authentic troubleshooting and ticketing mobile workflow without dummy data', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);

  // 2. Open /mobile/helpdesk with active session
  await app.open('/mobile/helpdesk');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. Verify Mobile Header and Title
  const mobileHeader = browser.locator('h1:has-text("Troubleshoot & Tiket")').first();
  await expect(mobileHeader).toBeVisible({ timeout: 45000 });

  // 4. Verify Quick KPI Cards
  const kpiTotalOpen = browser.locator('text=Total Open').first();
  const kpiKritis = browser.locator('text=Kritis').first();
  const kpiOverdue = browser.locator('text=Overdue').first();
  const kpiJaringan = browser.locator('text=Jaringan').first();

  await expect(kpiTotalOpen).toBeVisible();
  await expect(kpiKritis).toBeVisible();
  await expect(kpiOverdue).toBeVisible();
  await expect(kpiJaringan).toBeVisible();

  // 5. Verify Section Tabs (Alur Tiket, Kategori, Site MTTR)
  const tabAlur = browser.locator('button:has-text("Alur Tiket")').first();
  const tabKategori = browser.locator('button:has-text("Kategori")').first();
  const tabSites = browser.locator('button:has-text("Site MTTR")').first();

  await expect(tabAlur).toBeVisible();
  await expect(tabKategori).toBeVisible();
  await expect(tabSites).toBeVisible();

  // 6. Test Action: Buat Tiket Baru from Mobile
  const buatTiketBtn = browser.locator('button:has-text("Buat Tiket")').first();
  await expect(buatTiketBtn).toBeVisible();
  await buatTiketBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const dialogCreateTitle = browser.locator('div[role="dialog"] :has-text("Lapor Kendala / Buat Tiket")').first();
  await expect(dialogCreateTitle).toBeVisible({ timeout: 10000 });

  // Fill mobile ticket form
  const titleInput = browser.locator('div[role="dialog"] input[placeholder*="Gagal sinkron"]').first();
  await titleInput.fill('Kendala Sinyal VSAT Intermiten di Site Sangatta');

  const unitInput = browser.locator('div[role="dialog"] input[placeholder*="Timesheet V2"]').first();
  await unitInput.fill('Jaringan VSAT');

  const descTextarea = browser.locator('div[role="dialog"] textarea[placeholder*="Rincian kendala"]').first();
  await descTextarea.fill('Perangkat terminal VSAT mengalami flapping setiap 30 menit di area operasional Sangatta.');

  // Capture Screenshot 1: Mobile Lapor Kendala Form Dialog
  await app.screenshot('01-mobile-troubleshoot-create-dialog');

  // Submit Mobile Form
  const submitBtn = browser.locator('div[role="dialog"] button:has-text("Kirim Laporan")').first();
  await submitBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 7. Verify Ticket Appears on Mobile
  const createdTicket = browser.locator('text=Kendala Sinyal VSAT Intermiten').first();
  await expect(createdTicket).toBeVisible({ timeout: 15000 });

  // Capture Screenshot 2: Mobile Troubleshoot Overview with Real Ticket
  await app.screenshot('02-mobile-troubleshoot-overview');

  // 8. Open Mobile Ticket Inspector Bottom Sheet
  const ticketCard = browser.locator('[data-testid^="mobile-ticket-card-"]').first();
  await ticketCard.click();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Verify Bottom Sheet opens
  const auditTitle = browser.locator('text=Riwayat Aktivitas & Log Penanganan').first();
  await expect(auditTitle).toBeVisible({ timeout: 15000 });

  // Capture Screenshot 3: Mobile Ticket Inspector Bottom Sheet
  await app.screenshot('03-mobile-troubleshoot-inspector');
});
