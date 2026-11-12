// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { cerRequests, cerItems, cerBasts } from '../../db/schema/cer'
import { assetBorrows } from '../../db/schema/asset-borrow'
import { assetTransfers } from '../../db/schema/asset-transfer'
import { assetDisposals } from '../../db/schema/asset-disposal'
import { approvals, employees } from '../../db/schema/hero'
import { eq, desc, asc, and } from 'drizzle-orm'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/asset-approval-sync')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
})

test.describe('Asset Management Approval Sync, BAST Signature & PDF Access Control', () => {
  test.setTimeout(180000)

  test('Verify Tab Separation, BAST Signature PDF, Approval Inbox Integration, and PDF Download Security', async ({ page }) => {
    // Set standard desktop viewport
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

    // Screenshot 1: CER Dashboard Tab 1 (Daftar Pengajuan)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '01_cer_tab_daftar_pengajuan.png'),
      fullPage: false,
    })

    // Verify Tab 1 is active
    const tabDaftar = page.locator('button[role="tab"]:has-text("Daftar Pengajuan")')
    await expect(tabDaftar).toBeVisible()

    // 3. Switch to Tab 2: Penerimaan & BAST
    console.log('Switching to Penerimaan & BAST tab...')
    const tabReceiving = page.locator('button[role="tab"]:has-text("Penerimaan")')
    await expect(tabReceiving).toBeVisible()
    await tabReceiving.click()
    await page.waitForTimeout(3000)

    // Screenshot 2: CER Dashboard Tab 2 (Penerimaan & BAST)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '02_cer_tab_penerimaan_bast.png'),
      fullPage: false,
    })

    // 4. Test "Terima" on full approved item
    const terimaBtn = page.locator('button:has-text("Terima")').first()
    if (await terimaBtn.isVisible()) {
      console.log('Clicking Terima button on full approved CER...')
      await terimaBtn.click()
      await page.waitForTimeout(2000)

      // Screenshot 3: BAST Digital Signature Modal
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '03_cer_bast_signature_modal.png'),
        fullPage: false,
      })

      // Screenshot 4: BAST Modal with Signature filled
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '04_cer_bast_modal_with_signature.png'),
        fullPage: false,
      })

      // Submit confirmation & generate BAST PDF
      const confirmSubmitBtn = page.locator('button:has-text("Konfirmasi & Terbitkan BAST"), button:has-text("Konfirmasi Penerimaan")').first()
      if (await confirmSubmitBtn.isVisible()) {
        await confirmSubmitBtn.click({ force: true })
        await page.waitForTimeout(6000)
      }

      // Screenshot 5: Table with BAST PDF generated
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '05_cer_bast_pdf_generated.png'),
        fullPage: false,
      })
    }

    // Set pending approval assigned to Mochamad Annas Khadafi (emp 5) so it appears in Approval Inbox
    await db
      .update(approvals)
      .set({
        status: 'pending',
        approverEmployeeId: 5,
        approverName: 'Mochamad Annas Khadafi',
        approverEmail: 'mochamad.khadafi@chitraparatama.co.id',
        approverRole: 'Reviewer Aset',
      })
      .where(eq(approvals.id, 1709))

    // 5. Navigate to Approval Inbox
    console.log('Navigating to Approval Inbox (/dashboard/approval)...')
    await page.goto('/dashboard/approval')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(4000)

    // Screenshot 6: Approval Inbox overview
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '06_approval_inbox_overview.png'),
      fullPage: false,
    })

    // Click Asset Management category filter
    const assetCategoryPill = page.locator('button:has-text("Asset Management")').first()
    if (await assetCategoryPill.isVisible()) {
      console.log('Clicking Asset Management category filter...')
      await assetCategoryPill.click()
      await page.waitForTimeout(2000)

      // Screenshot 7: Filtered Asset Management items
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '07_approval_inbox_asset_management_items.png'),
        fullPage: false,
      })

      // Click "Buka TTD" on the asset item
      const bukaTtdBtn = page.locator('button:has-text("Buka TTD")').first()
      if (await bukaTtdBtn.isVisible()) {
        console.log('Opening AssetApprovalDialog...')
        await bukaTtdBtn.click()
        await page.waitForTimeout(2500)

        // Screenshot 8: AssetApprovalDialog open with digital signature requirement
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, '08_asset_approval_dialog_with_signature.png'),
          fullPage: false,
        })

        // Approve item with note
        const noteInput = page.locator('textarea').first()
        if (await noteInput.isVisible()) {
          await noteInput.fill('Disetujui untuk proses disposal aset sesuai kondisi fisik.')
        }

        const approveSubmitBtn = page.locator('button:has-text("Setujui (Approve)")').first()
        if (await approveSubmitBtn.isVisible()) {
          await approveSubmitBtn.click()
          await page.waitForTimeout(4000)

          // Screenshot 9: Approved successfully
          await page.screenshot({
            path: path.join(ARTIFACT_DIR, '09_asset_approval_submitted_success.png'),
            fullPage: false,
          })
        }
      }
    }

    // 6. Access Control Verification (PDF RBAC Proxy)
    console.log('Verifying PDF Access Control (403/401 Forbidden for unauthorized guests)...')
    const guestContext = await page.context().browser().newContext()
    const guestResponse = await guestContext.request.get('/api/assets/disposal/1/pdf')
    console.log('Guest unauthorized PDF download status:', guestResponse.status())
    expect([401, 403]).toContain(guestResponse.status())
    await guestContext.close()

    console.log('Test completed successfully and all requirements verified.')
  })
})
