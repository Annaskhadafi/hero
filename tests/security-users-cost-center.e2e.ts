import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify cost center column and dialog inputs in user management directory', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);

  // 2. Open /dashboard/security/users
  await app.open('/dashboard/security/users');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 3. Verify Table Header contains "Cost Center"
  const costCenterHeader = browser.locator('th:has-text("Cost Center")').first();
  await expect(costCenterHeader).toBeVisible({ timeout: 45000 });

  // Capture Screenshot 1: Directory table with Cost Center column
  await app.screenshot('01-security-users-cost-center-table');

  // 4. Click "+ Tambah Pengguna" or "Tambah Pengguna"
  const addUserBtn = browser.locator('button:has-text("Tambah Pengguna")').first();
  await expect(addUserBtn).toBeVisible();
  await addUserBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify Cost Center field in Create Dialog
  const costCenterCreateInput = browser.locator('div[role="dialog"] input[name="costCenter"]').first();
  await expect(costCenterCreateInput).toBeVisible();

  // Capture Screenshot 2: Create user dialog with Cost Center input
  await app.screenshot('02-security-users-create-dialog-cost-center');

  // Close create dialog
  const closeBtn = browser.locator('div[role="dialog"] button:has-text("Batal"), div[role="dialog"] button:has-text("Close"), div[role="dialog"] button[aria-label="Close"]').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 5. Open Manage User (Row Action) on the first user row
  const firstRowManageBtn = browser.locator('button[aria-label^="Kelola"]').first();
  if (await firstRowManageBtn.isVisible()) {
    await firstRowManageBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Verify Cost Center field in Edit Dialog (Profile Tab)
    const costCenterEditInput = browser.locator('div[role="dialog"] input[name="costCenter"]').first();
    await expect(costCenterEditInput).toBeVisible();

    // Capture Screenshot 3: Edit user dialog with Cost Center input
    await app.screenshot('03-security-users-edit-dialog-cost-center');

    // Close edit dialog
    const closeEditBtn = browser.locator('div[role="dialog"] button:has-text("Batal"), div[role="dialog"] button:has-text("Close"), div[role="dialog"] button[aria-label="Close"]').first();
    if (await closeEditBtn.isVisible()) {
      await closeEditBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 6. Verify "Export Terfilter" button is visible and active
  const exportBtn = browser.locator('button:has-text("Export Terfilter")').first();
  await expect(exportBtn).toBeVisible();

  // 7. Verify Import Data modal with "Download template / data existing" button
  const importDataBtn = browser.locator('button:has-text("Import Data")').first();
  if (await importDataBtn.isVisible()) {
    await importDataBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const downloadTemplateBtn = browser.locator('button:has-text("Download template / data existing")').first();
    await expect(downloadTemplateBtn).toBeVisible();

    // Capture Screenshot 4: Import Update Modal with download template button
    await app.screenshot('04-security-users-export-and-import-update-modal');

    // Close import modal
    const closeImportBtn = browser.locator('div[role="dialog"] button:has-text("Batal"), div[role="dialog"] button:has-text("Close"), div[role="dialog"] button[aria-label="Close"]').first();
    if (await closeImportBtn.isVisible()) {
      await closeImportBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 8. Test Tab Karyawan Permanen
  const permanentTab = browser.locator('button:has-text("Karyawan Permanen")').first();
  if (await permanentTab.isVisible()) {
    await permanentTab.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const permCostCenterTh = browser.locator('th:has-text("Cost Center")').first();
    await expect(permCostCenterTh).toBeVisible({ timeout: 15000 });
    await app.screenshot('05-security-users-permanent-tab-cost-center');
  }

  // 9. Test Tab Karyawan Kontrak
  const contractTab = browser.locator('button:has-text("Karyawan Kontrak")').first();
  if (await contractTab.isVisible()) {
    await contractTab.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const contractCostCenterTh = browser.locator('th:has-text("Cost Center")').first();
    await expect(contractCostCenterTh).toBeVisible({ timeout: 15000 });
    await app.screenshot('06-security-users-contract-tab-cost-center');
  }
});
