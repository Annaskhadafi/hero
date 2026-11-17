import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify excellence troubleshooting and ticketing mobile workspace', { timeout: 300000 }, async ({
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

  // Capture Screenshot 1: Mobile Troubleshoot Overview
  await app.screenshot('01-mobile-troubleshoot-overview');

  // 6. Test Interactive Tab Switching: Kategori
  await tabKategori.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const temuanTitle = browser.locator('h3:has-text("Temuan per Kategori")').first();
  await expect(temuanTitle).toBeVisible();

  // 7. Test Interactive Tab Switching: Site MTTR
  await tabSites.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const sitesTitle = browser.locator('h3:has-text("Performa & MTTR per Site")').first();
  await expect(sitesTitle).toBeVisible();

  // 8. Return to Alur Tiket & Open Ticket Inspector Bottom Sheet
  await tabAlur.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const firstTicketCard = browser.locator('div[class*="border-l-4"]').first();
  if (await firstTicketCard.isVisible().catch(() => false)) {
    await firstTicketCard.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Verify Bottom Sheet opens
  const auditTitle = browser.locator('text=Riwayat Aktivitas & Log Penanganan').first();
  await expect(auditTitle).toBeVisible({ timeout: 15000 });

  // Capture Screenshot 2: Mobile Ticket Inspector Bottom Sheet
  await app.screenshot('02-mobile-troubleshoot-inspector');

  // 9. Close Inspector Sheet
  const closeBtn = browser.locator('button[aria-label="Tutup Detail Tiket"]').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  } else {
    await browser.keyboard.press('Escape');
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 10. Test Create Ticket Button & Dialog
  const buatTiketBtn = browser.locator('button:has-text("Buat Tiket")').first();
  await expect(buatTiketBtn).toBeVisible();
  await buatTiketBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const dialogCreateTitle = browser.locator('div[role="dialog"] :has-text("Lapor Kendala / Buat Tiket")').first();
  await expect(dialogCreateTitle).toBeVisible({ timeout: 10000 });

  // Capture Screenshot 3: Mobile Lapor Kendala Form Dialog
  await app.screenshot('03-mobile-troubleshoot-create-dialog');
});
