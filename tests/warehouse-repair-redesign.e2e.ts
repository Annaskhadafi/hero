import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies warehouse repair command center and modular pages redesign full width', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate and directly land on Warehouse Repair Command Center
  await loginToHero(app, screen, browser, '/dashboard/warehouse-repair');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify KPI Scorecard metrics are rendered
  const kpiCards = browser.locator('div:has-text("Total Ragam Part")').first();
  await expect(kpiCards).toBeVisible({ timeout: 15000 });

  // Screenshot 1: Command Center Dashboard with 5 Colorful KPI Cards and Full Width Shell
  await app.screenshot('01-warehouse-repair-dashboard-fullwidth');

  // 2. Navigate to Master Data Barang
  await app.open('/dashboard/warehouse-repair/barang');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify table is present
  const itemsTable = browser.locator('table, [role="grid"]').first();
  await expect(itemsTable).toBeVisible({ timeout: 15000 });

  // Screenshot 2: Data Barang Table Full Width
  await app.screenshot('02-warehouse-repair-items-fullwidth');

  // 3. Navigate to Laporan Barang Keluar
  await app.open('/dashboard/warehouse-repair/laporan-barang-keluar');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify Laporan Outbound table is present
  const outboundReportTable = browser.locator('table, [role="grid"]').first();
  await expect(outboundReportTable).toBeVisible({ timeout: 15000 });

  // Screenshot 3: Laporan Barang Keluar Full Width
  await app.screenshot('03-warehouse-repair-laporan-barang-keluar-fullwidth');
});
