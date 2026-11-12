import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('Verify Centralized CER Workflow in Workflow Studio & Cleaned CER Page', async ({ page }) => {
  test.setTimeout(180000);

  const screenshotDir = path.resolve(
    'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-workflow'
  );
  const backupDir = path.join(process.cwd(), 'outputs/screenshots/cer-workflow');
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  // 1. Login with standard credentials
  console.log('Navigating to login page...');
  await page.goto('/sign-in', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000); // Wait for React hydration

  const usernameInput = page.locator('input[placeholder*="email atau SN"], #email, input[name="username"]').first();
  const passwordInput = page.locator('input[placeholder*="kata sandi"], #password, input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first();

  await usernameInput.click();
  await usernameInput.fill('71261');
  await passwordInput.click();
  await passwordInput.fill('Chitra#71261');
  await page.waitForTimeout(500);
  await submitButton.click();

  console.log('Submitted login credentials. Waiting for redirect...');
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  console.log('Login successful, on dashboard.');

  // ========================================================
  // PART A: Verify Cleaned CER Page (No ad-hoc Matrix Tab)
  // ========================================================
  console.log('Navigating to CER page...');
  await page.goto('/dashboard/assets/cer', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);

  // Verify Heading
  await expect(page.getByRole('heading', { name: 'Pengadaan Aset (CER)' })).toBeVisible({ timeout: 15000 });

  // Verify that only the 3 clean operational tabs exist:
  await expect(page.locator('button[role="tab"]:has-text("Daftar Pengajuan")')).toBeVisible();
  await expect(page.locator('button[role="tab"]:has-text("Buat Form CER")')).toBeVisible();
  await expect(page.locator('button[role="tab"]:has-text("Penerimaan & BAST")')).toBeVisible();

  // Verify that "Matriks Approval" tab is completely removed from CER page
  const adhocMatrixTab = page.locator('button[role="tab"]:has-text("Matriks Approval")');
  await expect(adhocMatrixTab).not.toBeVisible();
  console.log('Ad-hoc Matriks Approval tab successfully removed from CER page.');

  // Screenshot 08: Cleaned CER Page
  const ssCleanedPath = path.join(screenshotDir, '08_cer_dashboard_cleaned_tabs.png');
  await page.screenshot({ path: ssCleanedPath, fullPage: true });
  fs.copyFileSync(ssCleanedPath, path.join(backupDir, '08_cer_dashboard_cleaned_tabs.png'));
  console.log('Screenshot 08_cer_dashboard_cleaned_tabs.png saved.');

  // ========================================================
  // PART B: Verify Form CER Step 2 Live Preview (Driven by Studio Matrix)
  // ========================================================
  console.log('Testing Form CER Wizard...');
  const createTab = page.locator('button[role="tab"]:has-text("Buat Form CER")');
  await createTab.click();
  await page.waitForTimeout(2000);

  // Fill Step 1 Minimal inputs to advance to Step 2
  const subjectInput = page.locator('input[placeholder*="Pengadaan Laptop"]');
  await expect(subjectInput).toBeVisible({ timeout: 10000 });
  await subjectInput.fill('Pengadaan 2 Unit Laptop Developer High Performance');

  const vendorInput = page.locator('input[placeholder*="Nama Vendor"]');
  if (await vendorInput.isVisible()) {
    await vendorInput.fill('PT Sentra Teknologi Nusantara');
  }

  const purposeInput = page.locator('textarea[placeholder*="justifikasi operasional"]');
  if (await purposeInput.isVisible()) {
    await purposeInput.fill(
      'Peremajaan unit laptop developer untuk percepatan deployment modul CER dan Budget Controller sistem HERO.'
    );
  }

  // Select an attachment checklist checkbox
  const attachmentBox = page.locator('input[type="checkbox"]').first();
  if (await attachmentBox.isVisible()) {
    await attachmentBox.check();
  }

  // Fill Item row 1
  const descInput = page.locator('input[placeholder*="Nama & Spesifikasi Barang"]').first();
  if (await descInput.isVisible()) {
    await descInput.fill('ThinkPad T14s Gen 4 AMD Ryzen 7 PRO 32GB RAM 1TB SSD');
  }

  const qtyInput = page.locator('table input[type="number"]').first();
  if (await qtyInput.isVisible()) {
    await qtyInput.fill('2');
  }

  const priceInput = page.locator('table input[type="number"]').nth(1);
  if (await priceInput.isVisible()) {
    await priceInput.fill('24500000');
  }

  await page.waitForTimeout(1000);

  // Click Lanjut ke Step 2
  const nextBtn = page.getByRole('button', { name: /Lanjut ke Step 2/i });
  await expect(nextBtn).toBeVisible();
  await nextBtn.click();
  await page.waitForTimeout(3000);

  // Verify Step 2 Live Approval Chain Preview
  await expect(page.locator('text=Live Approval Chain').first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator('text=Dual Paralel').first()).toBeVisible({ timeout: 10000 });

  // Screenshot 10: Step 2 Approval Chain Preview
  const ssStep2Path = path.join(screenshotDir, '10_cer_form_step2_live_approval_chain.png');
  await page.screenshot({ path: ssStep2Path, fullPage: true });
  fs.copyFileSync(ssStep2Path, path.join(backupDir, '10_cer_form_step2_live_approval_chain.png'));
  console.log('Screenshot 10_cer_form_step2_live_approval_chain.png saved.');

  // ========================================================
  // PART C: Verify Workflow Studio Centralized Management
  // ========================================================
  console.log('Navigating to Workflow Studio...');
  await page.goto('/dashboard/workflow-studio', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3000);

  // Verify Workflow Studio Header
  await expect(page.locator('text=Workflow Studio').first()).toBeVisible({ timeout: 15000 });

  // Verify Pengadaan Aset (CER) is present in the table
  const cerWorkflowRow = page.locator('tr:has-text("Pengadaan Aset (CER)")').first();
  await expect(cerWorkflowRow).toBeVisible({ timeout: 15000 });
  console.log('Pengadaan Aset (CER) is visible in Workflow Studio list.');

  // Verify it has status Active
  await expect(cerWorkflowRow.locator('select').first()).toHaveValue('true');

  // Screenshot 09: Workflow Studio with CER
  const ssStudioPath = path.join(screenshotDir, '09_workflow_studio_cer_master_matrix.png');
  await page.screenshot({ path: ssStudioPath, fullPage: true });
  fs.copyFileSync(ssStudioPath, path.join(backupDir, '09_workflow_studio_cer_master_matrix.png'));
  console.log('Screenshot 09_workflow_studio_cer_master_matrix.png saved.');

  console.log('ALL WORKFLOW STUDIO & CER MIGRATION TESTS PASSED SUCCESSFULLY!');
});
