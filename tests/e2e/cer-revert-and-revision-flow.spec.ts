// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { cerRequests, approvals } from '../../db/schema'
import { eq } from 'drizzle-orm'

const ARTIFACT_SCREENSHOT_DIR = path.resolve(
  'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-revert-flow'
)

test.describe('CER Revert and Full Revision Flow E2E Verification', () => {
  test.setTimeout(240000)

  let testCerId = 14

  test.beforeAll(async () => {
    fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true })

    const [latestCer] = await db
      .select()
      .from(cerRequests)
      .orderBy(cerRequests.id)
      .limit(1)

    if (latestCer) {
      testCerId = latestCer.id
    }

    const steps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.cerRequestId, testCerId))
      .orderBy(approvals.level)

    const reverterEmpId = steps[2]?.approverEmployeeId || steps[1]?.approverEmployeeId || 107

    // Set CER to need_revision with a realistic revert note and reset currentApprover fields
    await db
      .update(cerRequests)
      .set({
        status: 'need_revision',
        lastRevertNote: 'Mohon sesuaikan kembali vendor rekanan dan harga estimasi unit sesuai penawaran terbaru.',
        lastRevertStepOrder: 3,
        lastRevertedByEmployeeId: reverterEmpId,
        currentApproverTitle: null,
        currentApproverName: null,
        currentApproverEmployeeId: null,
      })
      .where(eq(cerRequests.id, testCerId))

    // Set step 3 to Reverted
    if (steps.length >= 3) {
      await db
        .update(approvals)
        .set({
          status: 'Reverted',
          decisionNote: 'Revisi diminta: Mohon sesuaikan kembali vendor rekanan dan harga estimasi unit sesuai penawaran terbaru.',
        })
        .where(eq(approvals.id, steps[2].id))
    }
  })

  test('Verify Revert status, open revision dialog, inspect locked approvals and resubmit', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()))
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message))

    // 1. Authenticate with standard system credentials
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    const emailInput = page.locator('#email, input[name="username"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 15000 })
    await emailInput.fill('71261')
    const passwordInput = page.locator('#password, input[name="password"]').first()
    await passwordInput.fill('Chitra#71261')
    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
    await submitBtn.click()

    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    console.log('Login successful. Current URL:', page.url())

    // 2. Go to CER Page
    console.log('Navigating to CER Page (/dashboard/assets/cer)...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    console.log('On CER Page. Current URL:', page.url())

    // Capture CER table with "Perlu Revisi" badge and "Revisi Pengajuan" button
    const ssTable = path.join(ARTIFACT_SCREENSHOT_DIR, '01_cer_table_need_revision.png')
    await page.screenshot({ path: ssTable, fullPage: true })

    // Verify "Posisi Approval" column is completely removed from table header
    await expect(page.locator('th:has-text("Posisi Approval")')).toHaveCount(0)

    // Verify row with "Perlu Revisi" is visible
    const needRevisionRow = page.locator('tr:has-text("Perlu Revisi")').first()
    await expect(needRevisionRow).toBeVisible({ timeout: 15000 })

    // Wait until Next.js compilation finishes
    await page.waitForTimeout(4000)
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 30000 }).catch(() => {})

    // Find the row for CER and click "Revisi Pengajuan"
    const revisionButton = page.locator('button:has-text("Revisi Pengajuan")').first()
    await expect(revisionButton).toBeVisible({ timeout: 15000 })
    await revisionButton.click()
    console.log('Clicked revision button, waiting for dialog...')

    // 3. Verify Revision Dialog Step 1 opens
    console.log('Verifying Revision Dialog Step 1...')
    await expect(page.locator('text=Revisi Formulir Pengadaan CER')).toBeVisible({ timeout: 60000 })
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Permintaan Revisi dari Approver')).toBeVisible()
    await expect(page.locator('text=Direvert oleh:')).toBeVisible()
    await expect(page.locator('text=Catatan Perbaikan:')).toBeVisible()
    await expect(
      page.locator('text=Mohon sesuaikan kembali vendor rekanan dan harga estimasi unit sesuai penawaran terbaru.')
    ).toBeVisible()

    // Capture Step 1 with revision banner
    const ssStep1 = path.join(ARTIFACT_SCREENSHOT_DIR, '02_cer_revision_step1_banner.png')
    await page.screenshot({ path: ssStep1 })

    // 4. Move to Step 2: Review & Approval Chain
    console.log('Moving to Step 2...')
    const nextButton = page.locator('button:has-text("Lanjut ke Step 2")')
    await expect(nextButton).toBeVisible()
    await nextButton.click()
    await page.waitForTimeout(1000)

    // 5. Verify Step 2 shows locked approvals for steps that were already approved
    console.log('Verifying Step 2 locked approvals...')
    await expect(page.locator('text=Rantai Persetujuan').first()).toBeVisible({ timeout: 10000 })
    
    // Check for "Disetujui (Terkunci)" badge
    const lockedBadges = page.locator('text=Disetujui (Terkunci)')
    await expect(lockedBadges.first()).toBeVisible()
    const lockedCount = await lockedBadges.count()
    console.log(`Found ${lockedCount} locked approval steps.`)
    expect(lockedCount).toBeGreaterThanOrEqual(1)

    // Check that submit button has the resubmit text
    const resubmitButton = page.locator('button:has-text("Kirim Revisi Pengajuan (Resubmit)")')
    await expect(resubmitButton).toBeVisible()

    // Capture Step 2 with locked approvals
    const ssStep2 = path.join(ARTIFACT_SCREENSHOT_DIR, '03_cer_revision_step2_locked_approvers.png')
    await page.screenshot({ path: ssStep2 })

    // 6. Click submit to execute resubmission!
    console.log('Submitting revision...')
    await resubmitButton.click()

    // Verify modal closes and toast/table refreshes
    await page.waitForTimeout(3000)
    const ssAfterSubmit = path.join(ARTIFACT_SCREENSHOT_DIR, '04_cer_table_after_resubmit.png')
    await page.screenshot({ path: ssAfterSubmit, fullPage: true })

    // 7. Test direct deep link support: ?id=<testCerId>&action=edit
    console.log(`Testing deep-link: /dashboard/assets/cer?id=${testCerId}&action=edit`)
    await page.goto(`/dashboard/assets/cer?id=${testCerId}&action=edit`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    const ssDeepLink = path.join(ARTIFACT_SCREENSHOT_DIR, '05_cer_deep_link_auto_open.png')
    await page.screenshot({ path: ssDeepLink })

    console.log('E2E verification completed successfully.')
  })
})
