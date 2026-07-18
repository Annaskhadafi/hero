// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('EWH and Unit Utility E2E Flow', () => {
  const dummyUnitCode = 'TEST-DT999';
  const dummyUnitName = 'Dummy Dump Truck for E2E';

  test('User views EWH dashboard, manages Unit master, and views Unit Utility dashboard', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Login
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/sign-in');
    await page.fill('#d-email', 'employee@hero.com');
    await page.fill('#d-password', 'password123');
    await page.click('form:has(#d-email) button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45000 });
 
    // 2. Visit EWH Dashboard
    await page.goto('/dashboard/ewh');
    // Verify header title is present
    await expect(page.locator('h1')).toContainText('EWH');
    // Verify elements such as "Total Karyawan" card or summary cards
    await expect(page.locator('text=Total Karyawan')).toBeVisible();
 
    // 3. Visit Unit Utility Dashboard
    await page.goto('/dashboard/unit-utility');
    await expect(page.locator('h1')).toContainText('Unit Utility');
    await expect(page.locator('text=Total Unit Aktif')).toBeVisible();
 
    // 4. Manage Unit Master (CRUD Test)
    await page.click('button:has-text("Master Unit")');
    await expect(page).toHaveURL(/\/dashboard\/unit-utility\/master/, { timeout: 45000 });
 
    // Create a dummy unit
    await page.click('button:has-text("Tambah Unit")');
    await page.fill('input[placeholder="DT001"]', dummyUnitCode);
    await page.fill('input[placeholder="Dump Truck 001"]', dummyUnitName);
    await page.fill('input[placeholder="CAT 785C"]', 'Model-Test-999');
    
    await page.click('div[role="dialog"] button:has-text("Tambah Unit")');
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Verify the unit is displayed in the table list
    await expect(page.locator(`tr:has-text("${dummyUnitCode}")`)).toBeVisible({ timeout: 15000 });
    
    // Edit the dummy unit
    await page.click(`tr:has-text("${dummyUnitCode}") button:has(svg.lucide-pencil)`);
    const editInput = page.locator('div[role="dialog"] input[placeholder="Dump Truck 001"]');
    await expect(editInput).toHaveValue(dummyUnitName);
    await editInput.fill('Edited E2E Unit Name');
    await page.click('div[role="dialog"] button:has-text("Simpan Perubahan")');
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Verify the update is displayed in the table list
    await expect(page.locator('text=Edited E2E Unit Name')).toBeVisible({ timeout: 15000 });
 
    // Delete the dummy unit (clean up)
    await page.click(`tr:has-text("${dummyUnitCode}") button.text-destructive`);
    await page.click('div[role="dialog"] button:has-text("Ya, Hapus")');
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
 
    // Verify the unit is removed from the table list
    await expect(page.locator(`text=${dummyUnitCode}`)).not.toBeVisible({ timeout: 15000 });
 
    console.log('EWH & Unit Utility E2E test completed successfully and cleaned up.');
  });
 
  test('User configures and views EWH Teams', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Login
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/sign-in');
    await page.fill('#d-email', 'employee@hero.com');
    await page.fill('#d-password', 'password123');
    await page.click('form:has(#d-email) button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45000 });
 
    // 2. Visit EWH Dashboard
    await page.goto('/dashboard/ewh');
    await expect(page.locator('h1')).toContainText('EWH');
 
    // 3. Switch to Per Team Tab
    await page.click('button:has-text("Per Team")');
    await expect(page.locator('text=Belum ada team yang terdaftar')).toBeVisible();
 
    // 4. Create EWH Team
    await page.click('button:has-text("Tambah Team")');
    await page.fill('input[placeholder*="Contoh: Crew A"]', 'E2E Test Team');
    
    // Select a section from the Select dropdown
    await page.click('button:has-text("Pilih Section Team…")');
    await page.click('div[role="listbox"] [role="option"] >> nth=0');
    
    // Select first employee checkbox label in the scroll container
    await page.click('div[role="dialog"] div[class*="max-h"] label:first-of-type');
    
    await page.click('div[role="dialog"] button:has-text("Tambah Team")');
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
 
    // 5. Verify the Team is created
    await page.click('button:has-text("Per Team")');
    await expect(page.locator('text=E2E Test Team')).toBeVisible({ timeout: 15000 });
 
    // 6. Edit Team name
    await page.click('tr:has-text("E2E Test Team") button >> nth=0');
    await page.fill('input[placeholder*="Contoh: Crew A"]', 'E2E Test Team Edited');
    await page.click('div[role="dialog"] button:has-text("Simpan Perubahan")');
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    await page.click('button:has-text("Per Team")');
    await expect(page.locator('text=E2E Test Team Edited')).toBeVisible({ timeout: 15000 });
 
    // 7. Clean up - Delete Team
    await page.click('tr:has-text("E2E Test Team Edited") button.text-destructive');
    await page.click('div[role="dialog"] button:has-text("Ya, Hapus")');
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await page.click('button:has-text("Per Team")');
    await expect(page.locator('text=E2E Test Team Edited')).not.toBeVisible({ timeout: 15000 });

    console.log('EWH Teams E2E test completed successfully and cleaned up.');
  });
});
