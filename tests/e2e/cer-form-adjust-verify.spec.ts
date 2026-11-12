import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Verify CER Form Adjustments: No Site in Info Permohonan, Deskripsi header, and Prominent Qty Input', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });

  const screenshotDir = path.resolve(
    'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-adjust'
  );
  fs.mkdirSync(screenshotDir, { recursive: true });

  // 1. Login with standard credentials
  console.log('Navigating to login page...');
  await page.goto('/sign-in', { timeout: 45000 });
  await page.waitForTimeout(2500); // Ensure React hydration completes

  const usernameInput = page.locator('input[placeholder*="email atau SN"], #email, input[name="username"]').first();
  const passwordInput = page.locator('input[placeholder*="kata sandi"], #password, input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first();

  await usernameInput.click();
  await usernameInput.fill('71261');
  await passwordInput.click();
  await passwordInput.fill('Chitra#71261');
  await page.waitForTimeout(600);
  await submitButton.click();

  console.log('Submitted login credentials. Waiting for redirect...');
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  console.log('Login successful, on dashboard.');

  // 2. Navigate to CER page
  console.log('Navigating to CER page...');
  await page.goto('/dashboard/assets/cer', { timeout: 45000 });
  await page.waitForTimeout(2500);

  // 3. Switch to "Buat Form CER" Tab
  const buatTab = page.locator('button[role="tab"]:has-text("Buat Form CER")');
  await buatTab.click();
  await page.waitForTimeout(1500);

  // Verify Card 1: 1. Informasi Permohonan
  const infoCard = page.locator('div:has-text("1. Informasi Permohonan")').first();
  await expect(infoCard).toBeVisible();

  // Verify that "Cabang / Site" is NOT in Informasi Permohonan
  const siteSelect = page.locator('label:has-text("Cabang / Site")');
  await expect(siteSelect).toHaveCount(0);

  // Verify Departemen and Kategori Aset are visible
  await expect(page.locator('label:has-text("Departemen")')).toBeVisible();
  await expect(page.locator('label:has-text("Kategori Aset")')).toBeVisible();

  // Capture Card 1 screenshot
  await page.screenshot({
    path: path.join(screenshotDir, '01_cer_form_step1_info_permohonan_no_site.png'),
    fullPage: false,
  });

  // Verify that "Jenis Lampiran Tersedia" is completely removed
  const lampiranChecklist = page.locator('label:has-text("Jenis Lampiran Tersedia")');
  await expect(lampiranChecklist).toHaveCount(0);

  // Scroll to Card 3: 3. Justifikasi & Rekanan Vendor
  const justifikasiCard = page.locator('div:has-text("3. Justifikasi & Rekanan Vendor")').first();
  await justifikasiCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Capture Card 3 screenshot
  await page.screenshot({
    path: path.join(screenshotDir, '01b_cer_form_card3_no_jenis_lampiran.png'),
    fullPage: false,
  });

  // Scroll to Card 4: 4. Rincian Unit / Item CapEx
  const unitCard = page.locator('div:has-text("4. Rincian Unit / Item CapEx")').first();
  await unitCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Verify table header "Deskripsi" exists and "Deskripsi & Spesifikasi" does not
  await expect(page.locator('th:has-text("Deskripsi")').first()).toBeVisible();
  await expect(page.locator('th:has-text("Deskripsi & Spesifikasi")')).toHaveCount(0);

  // Verify Qty input stepper
  const qtyInput = page.locator('input[type="number"][placeholder="1"]').first();
  await expect(qtyInput).toBeVisible();

  // Test clicking '+' button to increase Qty to 2
  const plusBtn = page.locator('button[title="Tambah"]').first();
  await plusBtn.click();
  await page.waitForTimeout(500);
  await expect(qtyInput).toHaveValue('2');

  // Type in Description
  const descInput = page.locator('input[placeholder="Deskripsi barang modal..."]').first();
  await descInput.fill('Laptop Asus ROG Strix G16 2026 Core i9');

  // Capture Card 4 screenshot
  await page.screenshot({
    path: path.join(screenshotDir, '02_cer_form_unit_details_deskripsi_qty.png'),
    fullPage: false,
  });

  // Capture fullPage screenshot showing no site and no jenis lampiran
  await page.screenshot({
    path: path.join(screenshotDir, '01_cer_form_full_cleaned.png'),
    fullPage: true,
  });

  console.log('Test completed successfully and screenshots saved!');
});
