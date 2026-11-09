// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Form Studio - Analytics Dashboard and Export Integration', () => {
  test('verify custom identity labels, custom fields, and export in analytics dashboard', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Login to HERO
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('#email, input[name="username"]').first();
    const passwordInput = page.locator('#password, input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first();

    await emailInput.fill('71261');
    await passwordInput.fill('Chitra#71261');
    await submitBtn.click();
    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), { timeout: 20000 });

    // 2. Open Form Analytics for Template 152789
    await page.goto('/dashboard/form-studio/152789/analytics');
    await page.waitForLoadState('networkidle');

    // Verify analytics title and KPI cards
    await expect(page.locator('text=Analitik:')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=Export ke Excel (.xlsx)')).toBeVisible();

    // 3. Switch to Tab Respon Individual
    const responsesTab = page.locator('button[role="tab"]:has-text("Respon Individual")');
    await expect(responsesTab).toBeVisible({ timeout: 15000 });
    await responsesTab.click();
    await page.waitForTimeout(1000);

    // 4. Verify Aturan Identitas Aktif overview
    await expect(page.locator('text=Aturan Identitas Aktif:')).toBeVisible();

    // 5. Verify Dynamic Custom Field Column in Table
    await expect(page.locator('th:has-text("Nomor Induk Karyawan (NIK)")').or(page.locator('th:has-text("NIK")')).first()).toBeVisible({ timeout: 10000 });

    // 6. Screenshot of Analytics Responses Table
    await page.screenshot({ path: 'C:/Users/Anas/.gemini/antigravity/brain/db61e7ab-a9cd-4f68-a170-e1b96c16bb52/form-analytics-custom-identity-table.png' });

    // 7. Click Detail button on first submission row to open Detail Modal
    const detailBtn = page.locator('button:has-text("Detail")').first();
    if (await detailBtn.isVisible()) {
      await detailBtn.click();
      await page.waitForTimeout(500);

      // Verify Modal opens and displays custom identity fields
      await expect(page.locator('text=Detail Respon')).toBeVisible();
      await expect(page.locator('text=Custom Identity Fields:').first()).toBeVisible();

      // Screenshot of Respondent Detail Modal
      await page.screenshot({ path: 'C:/Users/Anas/.gemini/antigravity/brain/db61e7ab-a9cd-4f68-a170-e1b96c16bb52/form-analytics-respondent-detail-modal.png' });

      // Close modal
      const closeBtn = page.locator('button:has-text("Close"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }

    // 8. Test Export to Excel
    const excelBtn = page.locator('button:has-text("Export ke Excel (.xlsx)")');
    await expect(excelBtn).toBeVisible();
    await excelBtn.click();
    await page.waitForTimeout(3000);

    // Verify toast or success feedback
    await expect(page.locator('text=Berhasil mengekspor').or(page.locator('text=respon ke format Excel'))).toBeVisible({ timeout: 15000 });
  });
});
