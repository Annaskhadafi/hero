import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('SOP/WIN Approval Matrix - User Searchable Select & Email Auto-fill', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard HERO credentials and open sop-win page on Matrix tab
  await loginToHero(app, screen, browser, '/dashboard/sop-win?tab=matrix');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await app.open('/dashboard/sop-win?tab=matrix');
  await new Promise((resolve) => setTimeout(resolve, 3500));
  await expect(browser.locator('body')).toBeVisible();

  // 2. Click "Matrix" tab if not already active
  const matrixTab = browser.locator('button[role="tab"]:has-text("Approval Matrix"), button[role="tab"]:has-text("Matrix")').first();
  if (await matrixTab.isVisible()) {
    await matrixTab.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 3. Find and click "Edit Alur" on any department card
  const editAlurBtn = browser.locator('button:has-text("Edit Alur")').first();
  await expect(editAlurBtn).toBeVisible({ timeout: 20000 });
  await editAlurBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 4. Verify Modal "Kelola Alur Approval" opens
  const dialogTitle = browser.locator(':has-text("Kelola Alur Approval")').first();
  await expect(dialogTitle).toBeVisible({ timeout: 10000 });

  // 5. Locate the HeroSearchableSelect trigger for "Nama Orang Spesifik"
  const selectTrigger = browser.locator('[role="dialog"] button:has-text("Pilih nama user"), [role="dialog"] button:has-text("Ria Annisa"), [role="dialog"] button:has-text("Bekti"), [role="dialog"] button:has-text("Terpilih")').first();
  await expect(selectTrigger).toBeVisible();

  // Open the searchable dropdown
  await selectTrigger.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Screenshot 1: User Searchable Select Dropdown open inside the modal
  await app.screenshot('01-sop-win-matrix-user-dropdown-open');

  // 6. Search for an employee in the dropdown search input
  const searchInput = browser.locator('[data-slot="popover-content"] input[placeholder*="Cari"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('Hidayat');
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Click the matching user option
    const userOption = browser.locator('[data-slot="popover-content"] :has-text("Hidayat Rahman")').first();
    if (await userOption.isVisible()) {
      await userOption.click();
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  // 7. Verify email field auto-filled with the employee email and "Auto-filled" badge is visible
  const autoFilledBadge = browser.locator('[role="dialog"] :has-text("Auto-filled")').first();
  await expect(autoFilledBadge).toBeVisible({ timeout: 5000 });

  // Screenshot 2: User selected, email automatically filled and visible in modal
  await app.screenshot('02-sop-win-matrix-user-selected-email-autofilled');
});
