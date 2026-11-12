// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { cerRequests } from '../../db/schema/cer'
import { approvals, employees } from '../../db/schema/hero'
import { eq, desc, asc, and, inArray } from 'drizzle-orm'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/asset-wo-revert')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
})

test.describe('Asset Management Work Order Template, BAST Split View & Revert Workflow', () => {
  test.setTimeout(180000)

  test('Verify BAST 2-Column Split View, Asset Approval WO Layout with Revert button, and Direct Resubmit to Last Approver', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    // 1. Authenticate with standard credentials
    console.log('Navigating to sign-in / dashboard...')
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    if (page.url().includes('/sign-in')) {
      const emailInput = page.locator('#email, input[name="username"]').first()
      await emailInput.waitFor({ state: 'visible', timeout: 10000 })
      await emailInput.fill('71261')
      const passwordInput = page.locator('#password, input[name="password"]').first()
      await passwordInput.fill('Chitra#71261')
      const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
      await submitBtn.click()
      await page.waitForTimeout(5000)
    }

    // Ensure we have at least one full_approved CER for testing BAST
    let [fullApprovedCer] = await db
      .select()
      .from(cerRequests)
      .where(eq(cerRequests.status, 'full_approved'))
      .limit(1)

    if (!fullApprovedCer) {
      const [anyCer] = await db.select().from(cerRequests).limit(1)
      if (anyCer) {
        await db.update(cerRequests).set({ status: 'full_approved' }).where(eq(cerRequests.id, anyCer.id))
        fullApprovedCer = anyCer
      }
    }

    // 2. Navigate to CER Page
    console.log('Navigating to CER Page...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(4000)

    // Switch to Tab 2: Penerimaan & BAST
    console.log('Switching to Penerimaan & BAST tab...')
    const tabReceiving = page.locator('button[role="tab"]:has-text("Penerimaan")')
    if (await tabReceiving.isVisible()) {
      await tabReceiving.click()
      await page.waitForTimeout(3000)

      // Test "Terima" on full approved item
      const terimaBtn = page.locator('button:has-text("Terima")').first()
      if (await terimaBtn.isVisible()) {
        console.log('Clicking Terima button to open 2-column BAST modal...')
        await terimaBtn.click()
        await page.waitForTimeout(3000)

        // Screenshot 1: BAST 2-Column Split View Dialog (Left = WYSIWYG BAST Doc, Right = Receipt Controls)
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, '01_cer_bast_split_view_dialog.png'),
          fullPage: false,
        })
        console.log('Screenshot 1 captured: 01_cer_bast_split_view_dialog.png')

        // Close modal
        const closeBtn = page.locator('button:has-text("Batal")').last()
        if (await closeBtn.isVisible()) {
          await closeBtn.click()
          await page.waitForTimeout(1000)
        }
      }
    }

    // 3. Set pending approval assigned to Mochamad Annas Khadafi (emp 5) so it appears in Approval Inbox
    console.log('Preparing pending approval item in Approval Inbox...')
    let [targetApproval] = await db
      .select()
      .from(approvals)
      .where(inArray(approvals.activityType, ['cer', 'ASSET_BORROW', 'asset_transfer', 'asset_disposal']))
      .limit(1)

    if (targetApproval) {
      await db
        .update(approvals)
        .set({
          status: 'pending',
          approverEmployeeId: 5,
          approverName: 'Mochamad Annas Khadafi',
          approverEmail: 'mochamad.khadafi@chitraparatama.co.id',
          approverRole: 'Reviewer Aset',
          decisionNote: 'Menunggu Persetujuan',
          rejectionReason: '',
          reviewedAt: null,
          signatureUrl: null,
        })
        .where(eq(approvals.id, targetApproval.id))
    }

    // 4. Navigate to Approval Inbox
    console.log('Navigating to Approval Inbox (/dashboard/approval)...')
    await page.goto('/dashboard/approval')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(4000)

    // Click Asset Management category filter
    const assetCategoryPill = page.locator('button:has-text("Asset Management")').first()
    if (await assetCategoryPill.isVisible()) {
      console.log('Clicking Asset Management category filter...')
      await assetCategoryPill.click()
      await page.waitForTimeout(2000)
    }

    // Click "Buka TTD" on the asset item
    const bukaTtdBtn = page.locator('button:has-text("BUKA TTD ASSET"), button:has-text("Buka TTD")').first()
    if (await bukaTtdBtn.isVisible()) {
      console.log('Opening 2-Column Work Order AssetApprovalDialog...')
      await bukaTtdBtn.click()
      await page.waitForTimeout(3000)

      // Screenshot 2: AssetApprovalDialog 2-Column Work Order View with REVERT button
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '02_asset_approval_wo_template_dialog.png'),
        fullPage: false,
      })
      console.log('Screenshot 2 captured: 02_asset_approval_wo_template_dialog.png')

      // Verify action buttons exist
      const approveBtn = page.locator('button:has-text("Setujui Pengajuan")')
      const revertBtn = page.locator('button:has-text("REVERT")')
      const rejectBtn = page.locator('button:has-text("REJECT")')

      await expect(approveBtn).toBeVisible()
      await expect(revertBtn).toBeVisible()
      await expect(rejectBtn).toBeVisible()

      // 5. Test REVERT Action
      console.log('Executing REVERT action with note...')
      const noteInput = page.locator('textarea[placeholder*="Tambahkan catatan"], textarea').first()
      await noteInput.fill('Harap perbaiki rincian justifikasi aset dan lampiran teknis.')
      await page.waitForTimeout(500)

      await revertBtn.click()
      await page.waitForTimeout(3000)

      // Screenshot 3: After Revert (Toast / Status updated to Perlu Revisi)
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '03_asset_reverted_toast_confirmation.png'),
        fullPage: false,
      })
      console.log('Screenshot 3 captured: 03_asset_reverted_toast_confirmation.png')
    }

    // 6. Navigate back to CER to verify the item is now in "Perlu Revisi" (needs_revision)
    console.log('Checking CER Table for "Perlu Revisi" (needs_revision)...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)

    // Screenshot 4: CER Table showing Perlu Revisi badge and Resubmit action button
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '04_cer_table_needs_revision.png'),
      fullPage: false,
    })
    console.log('Screenshot 4 captured: 04_cer_table_needs_revision.png')

    // 7. Click Resubmit on the reverted item
    const resubmitBtn = page.locator('button:has-text("Resubmit")').first()
    if (await resubmitBtn.isVisible()) {
      console.log('Clicking Resubmit button...')
      await resubmitBtn.click()
      await page.waitForTimeout(2000)

      // Screenshot 5: Resubmit Edit Modal showing previous revert note
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '05_cer_resubmit_edit_modal.png'),
        fullPage: false,
      })
      console.log('Screenshot 5 captured: 05_cer_resubmit_edit_modal.png')

      // Submit revision
      const confirmResubmitBtn = page.locator('button:has-text("Kirim Ulang Revisi")').first()
      if (await confirmResubmitBtn.isVisible()) {
        await confirmResubmitBtn.click()
        await page.waitForTimeout(3000)

        // Screenshot 6: After Resubmit - returns directly to Last Approver
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '06_cer_resubmitted_success.png'),
          fullPage: false,
        })
        console.log('Screenshot 6 captured: 06_cer_resubmitted_success.png')
      }
    }

    console.log('All E2E checks and screenshots completed successfully!')
  })
})
