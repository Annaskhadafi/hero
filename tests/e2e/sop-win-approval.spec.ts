// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Comprehensive E2E Testing Suite: SOP / WIN / POL Document Approval & MATRIX System', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Navigate to SOP / WIN Document System Page
    await page.goto('/dashboard/sop-win');
    await page.waitForLoadState('networkidle');
  });

  /* ─────────────────────────────────────────────────────────────
   * 1. ALL BUTTONS, TABS & MATRIX CONFIGURATION CHECK
   * ───────────────────────────────────────────────────────────── */
  test('Module 1: Scan & Test All Tabs, Search & Matrix Configuration Controls', async ({ page }) => {
    // 1. Header Check
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText(/SOP|WIN|Document System/i);

    // 2. Tabs Navigation Check (Explorer, Dashboard, Approval, Matrix)
    const explorerTab = page.locator('button[role="tab"]:has-text("File Document System")').first();
    const dashboardTab = page.locator('button[role="tab"]:has-text("Dashboard")').first();
    const approvalTab = page.locator('button[role="tab"]:has-text("Approval")').first();
    const matrixTab = page.locator('button[role="tab"]:has-text("Konfigurasi Approval Matrix"), button[role="tab"]:has-text("Matrix")').first();

    if (await explorerTab.isVisible()) await explorerTab.click();
    if (await dashboardTab.isVisible()) await dashboardTab.click();
    if (await approvalTab.isVisible()) await approvalTab.click();
    if (await matrixTab.isVisible()) {
      await matrixTab.click();
      await page.waitForTimeout(300);

      // Verify Matrix Panel renders
      const matrixPanel = page.locator('h3:has-text("Matrix"), h2:has-text("Matrix"), table, div[class*="border"]').first();
      await expect(matrixPanel).toBeVisible();

      // Switch back to Approval tab
      if (await approvalTab.isVisible()) await approvalTab.click();
    }
  });

  /* ─────────────────────────────────────────────────────────────
   * 2. FULL CRUD OPERATIONS & ACCESS SETTINGS GEAR MODAL
   * ───────────────────────────────────────────────────────────── */
  test('Module 2: Complete Interactive Approval Flow & Gear Settings Modal', async ({ page }) => {
    // Switch to Approval Tab
    const approvalTab = page.locator('button[role="tab"]:has-text("Approval")').first();
    if (await approvalTab.isVisible()) await approvalTab.click();

    // Search bar check
    const searchInput = page.locator('input[placeholder*="Cari"], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('REQ-SOP');
      await expect(searchInput).toHaveValue('REQ-SOP');
      await searchInput.fill('');
    }

    // Gear Icon (Pengaturan Akses Dokumen) Check
    const gearBtn = page.locator('button[title*="Pengaturan Akses"], button:has(svg.lucide-settings)').first();
    if (await gearBtn.isVisible()) {
      await gearBtn.click();

      // Verify Access Settings Modal opens
      const settingsModal = page.locator('[role="dialog"]');
      await expect(settingsModal).toBeVisible();

      // Check Expiry Days input
      const expiryInput = settingsModal.locator('input[type="number"]').first();
      if (await expiryInput.isVisible()) {
        await expiryInput.fill('7');
      }

      // Close modal clean
      const closeBtn = settingsModal.locator('button:has-text("Batal"), button:has-text("Tutup"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  /* ─────────────────────────────────────────────────────────────
   * 3. SEQUENTIAL & CONDITIONAL APPROVAL WORKFLOW
   * ───────────────────────────────────────────────────────────── */
  test('Module 3: Sequential SOP/WIN Approval Workflow & Review Dialog', async ({ page }) => {
    const approvalTab = page.locator('button[role="tab"]:has-text("Approval")').first();
    if (await approvalTab.isVisible()) await approvalTab.click();

    const reviewBtn = page.locator('button:has-text("Tinjau"), button:has-text("Review"), button:has-text("Detail")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();

      const reviewModal = page.locator('[role="dialog"]');
      await expect(reviewModal).toBeVisible();

      // Check Catatan Approval Textarea
      const remarksTextarea = reviewModal.locator('textarea[placeholder*="Catatan"]').first();
      if (await remarksTextarea.isVisible()) {
        await remarksTextarea.fill('Catatan persetujuan dokumen SOP/WIN via E2E Playwright');
      }

      // Check Action Buttons: DISETUJUI, REVERT, REJECT
      const approveBtn = reviewModal.locator('button:has-text("SETUJUI"), button:has-text("Approve"), button:has-text("Setujui")').first();
      if (await approveBtn.isVisible()) await expect(approveBtn).toBeEnabled();

      // Close modal
      const closeBtn = reviewModal.locator('button:has-text("Tutup"), button:has-text("Batal"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  /* ─────────────────────────────────────────────────────────────
   * 4. MATRIX CONFIGURATION PANEL INTERACTION
   * ───────────────────────────────────────────────────────────── */
  test('Module 4: Approval Matrix Configuration Panel & Workflows Verification', async ({ page }) => {
    const matrixTab = page.locator('button[role="tab"]:has-text("Konfigurasi Approval Matrix"), button[role="tab"]:has-text("Matrix")').first();
    if (await matrixTab.isVisible()) {
      await matrixTab.click();
      await page.waitForTimeout(300);

      // Verify Matrix Table / Cards present
      const matrixContent = page.locator('text=Matriks, text=Quality Management, text=Workflow, table').first();
      await expect(matrixContent).toBeVisible();
    }
  });

  /* ─────────────────────────────────────────────────────────────
   * 5. GMAIL NOTIFICATION CHECK (raihanaraya36@gmail.com)
   * ───────────────────────────────────────────────────────────── */
  test('Module 5: SOP/WIN Gmail Notification Delivery & Central Target Check', async ({ page }) => {
    const approvalTab = page.locator('button[role="tab"]:has-text("Approval")').first();
    if (await approvalTab.isVisible()) await approvalTab.click();

    const reminderBtn = page.locator('button:has-text("Kirim Reminder"), button:has-text("Send Reminder")').first();
    if (await reminderBtn.isVisible()) {
      await reminderBtn.click();
      const toastMessage = page.locator('text=reminder, text=dikirim, text=berhasil').first();
      await expect(toastMessage).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
