// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Form Builder - Customizable Rules and Custom Fields', () => {
  test('verify custom identity labels, custom identity fields in builder and public form', async ({ page }) => {
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

    // 2. Open Form Builder for Customer Survey 2026
    await page.goto('/dashboard/form-studio/152789/builder');
    await page.waitForLoadState('networkidle');

    // 3. Switch to Aturan Tab
    const aturanTab = page.locator('button[role="tab"]:has-text("Aturan")');
    await expect(aturanTab).toBeVisible({ timeout: 15000 });
    await aturanTab.click();
    await page.waitForTimeout(500);

    // 4. Verify Akses & Responden Section and Custom Label Inputs
    await expect(page.locator('text=Akses & Responden')).toBeVisible();
    await expect(page.locator('text=Wajibkan Identitas (Nama)')).toBeVisible();
    await expect(page.locator('text=Wajibkan Email')).toBeVisible();
    await expect(page.locator('text=Custom Field Identitas')).toBeVisible();

    // 5. Add a Custom Identity Field
    const addFieldBtn = page.locator('button:has-text("Tambah Field")');
    await expect(addFieldBtn).toBeVisible();
    await addFieldBtn.click();
    await page.waitForTimeout(500);

    // Customize the new custom field
    const labelInput = page.locator('input[placeholder*="NIK / Jabatan"]').last();
    await labelInput.fill('Nomor Induk Karyawan (NIK)');

    const placeholderInput = page.locator('input[placeholder*="Contoh: 71261"]').last();
    await placeholderInput.fill('Masukkan NIK Anda (misal: 71261)');

    // Verify canvas updates in real time
    await expect(page.locator('text=Field Identitas aktif:')).toBeVisible();

    // Screenshot of builder with rules & custom fields
    await page.screenshot({ path: 'C:/Users/Anas/.gemini/antigravity/brain/db61e7ab-a9cd-4f68-a170-e1b96c16bb52/form-builder-custom-rules-screenshot.png' });

    // 6. Save changes
    const saveBtn = page.locator('button:has-text("Simpan")').last();
    await saveBtn.click();
    await page.waitForTimeout(3000);

    // 7. Open Public Form
    await page.goto('/form/f/customer-survey-2026');
    await page.waitForLoadState('networkidle');

    // 8. Verify Custom Identity Field is displayed
    await expect(page.locator('text=Nomor Induk Karyawan (NIK)').first()).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: 'C:/Users/Anas/.gemini/antigravity/brain/db61e7ab-a9cd-4f68-a170-e1b96c16bb52/public-form-custom-identity-screenshot.png' });

    // 9. Fill in identity fields safely
    const nameField = page.locator('input[placeholder*="nama lengkap"], input[placeholder*="Nama"]').first();
    if (await nameField.isVisible()) {
      await nameField.fill('Budi Santoso');
    }

    const emailField = page.locator('input[type="email"]').first();
    if (await emailField.isVisible()) {
      await emailField.fill('budi.santoso@mining-partner.com');
    }

    const phoneField = page.locator('input[type="tel"]').first();
    if (await phoneField.isVisible()) {
      await phoneField.fill('081234567890');
    }

    const companyField = page.locator('input[placeholder*="PT"]').first();
    if (await companyField.isVisible()) {
      await companyField.fill('PT Mitra Tambang Nusantara');
    }

    const deptField = page.locator('input[placeholder*="Plant"]').first();
    if (await deptField.isVisible()) {
      await deptField.fill('Procurement & Supply Chain');
    }

    const customFields = page.locator('input[placeholder*="Masukkan NIK Anda"]');
    const cCount = await customFields.count();
    for (let i = 0; i < cCount; i++) {
      await customFields.nth(i).fill('71261');
    }

    // 10. Start questionnaire
    const startBtn = page.locator('button:has-text("Mulai Mengisi Kuesioner")');
    await startBtn.click();
    await page.waitForTimeout(2000);

    // Verify questions rendered
    await expect(page.locator('text=Tenaga Penjual').first()).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: 'C:/Users/Anas/.gemini/antigravity/brain/db61e7ab-a9cd-4f68-a170-e1b96c16bb52/public-form-questionnaire-rendered.png' });
  });
});
