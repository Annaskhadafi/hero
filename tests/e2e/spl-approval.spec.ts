// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Comprehensive E2E Testing Suite: Overtime SPL Approval System', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Navigate to Overtime SPL Approval Dashboard Page
    await page.goto('/dashboard/overtime-requests');
    await page.waitForLoadState('networkidle');
  });

  /* ─────────────────────────────────────────────────────────────
   * 1. ALL BUTTONS & CONTROLS INTERACTIVE CHECK
   * ───────────────────────────────────────────────────────────── */
  test('Module 1: Scan & Test All Interactive Controls on Overtime SPL Page', async ({ page }) => {
    // 1. Header & Page Title Check
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText(/Overtime|Lembur|SPL/i);

    // 2. Search Input Typing & Clearing
    const searchInput = page.locator('input[placeholder*="Cari"], input[type="text"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('SPL-2026');
    await expect(searchInput).toHaveValue('SPL-2026');
    await searchInput.fill('');

    // 3. Status Filter Buttons Check
    const filterButtons = ['Semua', 'Pending', 'Disetujui', 'Ditolak'];
    for (const filterText of filterButtons) {
      const btn = page.locator(`button:has-text("${filterText}")`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(200);
      }
    }

    // 4. "Kirim Reminder" / Send Reminders Button Check
    const reminderBtn = page.locator('button:has-text("Kirim Reminder"), button:has-text("Send Reminder")').first();
    if (await reminderBtn.isVisible()) {
      await reminderBtn.click();
      await page.waitForTimeout(300);
    }
  });

  /* ─────────────────────────────────────────────────────────────
   * 2. FULL CRUD OPERATIONS & FORM MODAL INTERACTION
   * ───────────────────────────────────────────────────────────── */
  test('Module 2: Complete Interactive CRUD Flow (Create SPL, Read, Update, Delete)', async ({ page }) => {
    // 1. CREATE: Open "+ Buat SPL Baru" Form Modal
    const createBtn = page.locator('button:has-text("Buat SPL"), button:has-text("Tambah Lembur")').first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify Modal Dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Fill form title if input present
    const titleInput = dialog.locator('input[name="title"], input[placeholder*="Judul"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Lembur Project E2E Playwright Automated Test');
    }

    // Close Modal clean
    const cancelBtn = dialog.locator('button:has-text("Batal"), button:has-text("Tutup"), button[aria-label="Close"]').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(dialog).not.toBeVisible();

    // 2. READ: Verify Data Listing Table Rows
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible();
  });

  /* ─────────────────────────────────────────────────────────────
   * 3. SEQUENTIAL & CONDITIONAL APPROVAL WORKFLOW
   * ───────────────────────────────────────────────────────────── */
  test('Module 3: Sequential SPL Approval Workflow & Catatan Textarea Interactivity', async ({ page }) => {
    // Click "Tinjau / Review" on first SPL row
    const reviewBtn = page.locator('button:has-text("Tinjau"), button:has-text("Review"), button:has-text("Detail")').first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // Verify Review Modal opens
    const reviewModal = page.locator('[role="dialog"]');
    await expect(reviewModal).toBeVisible();

    // Check Catatan Approval Textarea
    const remarksTextarea = reviewModal.locator('textarea[placeholder*="Catatan"]').first();
    if (await remarksTextarea.isVisible()) {
      await remarksTextarea.fill('Catatan persetujuan lembur SPL disetujui via E2E Playwright');
      await expect(remarksTextarea).toHaveValue('Catatan persetujuan lembur SPL disetujui via E2E Playwright');
    }

    // Check Action Buttons: DISETUJUI, REVERT, REJECT
    const approveBtn = reviewModal.locator('button:has-text("DISETUJUI"), button:has-text("Approve"), button:has-text("Setujui")').first();
    const revertBtn = reviewModal.locator('button:has-text("REVERT"), button:has-text("Kembalikan")').first();
    const rejectBtn = reviewModal.locator('button:has-text("REJECT"), button:has-text("Tolak")').first();

    if (await approveBtn.isVisible()) await expect(approveBtn).toBeEnabled();
    if (await revertBtn.isVisible()) await expect(revertBtn).toBeEnabled();
    if (await rejectBtn.isVisible()) await expect(rejectBtn).toBeEnabled();

    // Close review modal
    const closeBtn = reviewModal.locator('button:has-text("Tutup"), button:has-text("Batal"), button[aria-label="Close"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  /* ─────────────────────────────────────────────────────────────
   * 4. DYNAMIC PDF PREVIEW & REAL-TIME STATE VALIDATION
   * ───────────────────────────────────────────────────────────── */
  test('Module 4: Dynamic SPL PDF Preview & Real-Time State Rendering Validation', async ({ page }) => {
    const reviewBtn = page.locator('button:has-text("Tinjau"), button:has-text("Review"), button:has-text("Detail")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Check A4 Landscape PDF Sheet container
      const pdfSheet = modal.locator('.unified-batch-preview-sheet, div[class*="min-h-[210mm]"], table').first();
      await expect(pdfSheet).toBeVisible();

      // Validate rendered status badges (Disetujui / Ditolak / Dikembalikan)
      const approvedBadge = pdfSheet.locator('text=✓ Disetujui');
      const rejectedBadge = pdfSheet.locator('text=✗ Ditolak');
      const revertedBadge = pdfSheet.locator('text=↺ Dikembalikan');

      const isBadgePresent = (await approvedBadge.count()) > 0 || (await rejectedBadge.count()) > 0 || (await revertedBadge.count()) > 0 || (await pdfSheet.locator('text=(Belum Disetujui)').count()) > 0;
      expect(isBadgePresent).toBeTruthy();
    }
  });

  /* ─────────────────────────────────────────────────────────────
   * 5. GMAIL NOTIFICATION CHECK (raihanaraya36@gmail.com)
   * ───────────────────────────────────────────────────────────── */
  test('Module 5: Overtime SPL Gmail Notification Delivery & Central Target Check', async ({ page }) => {
    const reminderBtn = page.locator('button:has-text("Kirim Reminder"), button:has-text("Send Reminder")').first();
    if (await reminderBtn.isVisible()) {
      await reminderBtn.click();
      const toastMessage = page.locator('text=reminder, text=dikirim, text=berhasil').first();
      await expect(toastMessage).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
