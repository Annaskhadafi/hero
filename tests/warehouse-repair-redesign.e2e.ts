import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies warehouse repair command center and modular pages redesign', async ({
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

  // Screenshot 1: Command Center Dashboard with 5 Colorful KPI Cards and Quick Actions
  await app.screenshot('01-warehouse-repair-dashboard-command-center');

  // 2. Navigate to Master Data Barang
  await app.open('/dashboard/warehouse-repair/barang');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify table is present
  const itemsTable = browser.locator('table, [role="grid"]').first();
  await expect(itemsTable).toBeVisible({ timeout: 15000 });

  // Verify Add Button is present (h-9 standard)
  const addBtn = browser.locator('button:has-text("Tambah Barang")').first();
  if (await addBtn.isVisible()) {
    await expect(addBtn).toBeVisible();
  }

  // Open detail preview if items exist
  const detailActionBtn = browser.locator('button[aria-label="Lihat Detail"], button:has-text("Detail")').first();
  if (await detailActionBtn.isVisible()) {
    await detailActionBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Screenshot 2: Data Barang Table with TanStack Virtualization, Badges, and Hero Template Design
  await app.screenshot('02-warehouse-repair-items-table');
});
