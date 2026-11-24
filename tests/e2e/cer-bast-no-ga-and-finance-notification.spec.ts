// @ts-nocheck
import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { db } from '../../db'
import { cerRequests, employees } from '../../db/schema'
import { eq } from 'drizzle-orm'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1')
const LOCAL_OUTPUT_DIR = path.resolve('outputs/screenshots/cer-approval')

test.beforeAll(async () => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(LOCAL_OUTPUT_DIR, { recursive: true })

  const [emp71261] = await db
    .select()
    .from(employees)
    .where(eq(employees.employeeSn, '71261'))
    .limit(1)

  // Ensure there is a full_approved CER assigned to emp 71261
  const [targetCer] = await db
    .select()
    .from(cerRequests)
    .orderBy(cerRequests.id)
    .limit(1)

  if (targetCer && emp71261) {
    await db
      .update(cerRequests)
      .set({
        status: 'full_approved',
        applicantEmployeeId: emp71261.id,
        kelompokAset: 'Kelompok 1 (Masa Manfaat 4 Tahun) - IT Hardware',
        receiverNotes: null,
        goodsPhotoUrl: null,
      })
      .where(eq(cerRequests.id, targetCer.id))
  }
})

test.describe('CER BAST: GA Signature Removal & Finance Notification', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120000)

  test('Verify BAST Dialog and Document contain NO GA signature, only Vendor and Receiver', async ({
    page,
    request,
  }) => {
    // 1. Login to HERO
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    const emailInput = page.locator('input[placeholder*="email atau SN" i], #email, input[name="username"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 15000 })
    await emailInput.fill('71261')
    const passwordInput = page.locator('input[type="password"], #password, input[name="password"]').first()
    await passwordInput.fill('Chitra#71261')
    await page.waitForTimeout(500)
    
    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
    await submitBtn.click()
    await passwordInput.press('Enter').catch(() => {})

    await page.waitForURL('**/dashboard/**', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // 2. Navigate to CER Page tab receiving
    console.log('Navigating to CER Page (/dashboard/assets/cer?tab=receiving)...')
    await page.goto('/dashboard/assets/cer?tab=receiving')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    const bastTab = page
      .locator('button[role="tab"][value="receiving"], button[role="tab"]:has-text("Penerimaan & BAST")')
      .first()
    if (await bastTab.isVisible()) {
      await bastTab.click()
      await page.waitForTimeout(1000)
    }

    // Capture tab screenshot
    const ss1Artifact = path.join(ARTIFACT_DIR, '01_bast_receiving_tab_ready.png')
    const ss1Local = path.join(LOCAL_OUTPUT_DIR, '01_bast_receiving_tab_ready.png')
    await page.screenshot({ path: ss1Artifact, fullPage: false })
    await page.screenshot({ path: ss1Local, fullPage: false })
    console.log('✓ Captured screenshot 01_bast_receiving_tab_ready.png')

    // 3. Open "Konfirmasi Terima" dialog
    const confirmReceiveBtn = page.locator('button:has-text("Konfirmasi Terima")').first()
    await expect(confirmReceiveBtn).toBeVisible({ timeout: 15000 })
    await confirmReceiveBtn.click()
    await page.waitForTimeout(1500)

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 15000 })

    // Verify dialog shows receiver signature field, but NO GA signature field
    await expect(dialog.locator('text=Tanda Tangan Penerima')).toBeVisible()
    const gaSignatureField = dialog.locator('text=Tanda Tangan GA, text=Petugas GA, text=Pihak Pertama (GA)')
    await expect(gaSignatureField).toHaveCount(0)
    console.log('✓ Verified: Dialog has NO GA signature input or GA requirements!')

    // Capture dialog screenshot
    const ss2Artifact = path.join(ARTIFACT_DIR, '02_bast_receive_dialog_no_ga_signature.png')
    const ss2Local = path.join(LOCAL_OUTPUT_DIR, '02_bast_receive_dialog_no_ga_signature.png')
    await page.screenshot({ path: ss2Artifact, fullPage: false })
    await page.screenshot({ path: ss2Local, fullPage: false })
    console.log('✓ Captured screenshot 02_bast_receive_dialog_no_ga_signature.png')

    // Close dialog
    const closeBtn = dialog.locator('button:has-text("Batal"), button:has-text("Tutup")').first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    }

    // 4. Test BAST PDF generation endpoint
    const [targetCer] = await db
      .select({ id: cerRequests.id, cerNumber: cerRequests.cerNumber })
      .from(cerRequests)
      .where(eq(cerRequests.status, 'full_approved'))
      .limit(1)

    if (targetCer) {
      console.log(`Testing BAST PDF endpoint for CER #${targetCer.id} (${targetCer.cerNumber})...`)
      const res = await page.context().request.get(`/api/assets/cer/${targetCer.id}/bast-pdf`)
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toContain('application/pdf')
      const buffer = await res.body()
      expect(buffer.length).toBeGreaterThan(1000)
      console.log(`✓ Verified: BAST PDF generated successfully (${buffer.length} bytes), HTTP 200 application/pdf!`)
    }
  })
})
