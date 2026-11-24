// @ts-nocheck
import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1')
const LOCAL_OUTPUT_DIR = path.resolve('outputs/screenshots/cer-approval')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(LOCAL_OUTPUT_DIR, { recursive: true })
})

test.describe('CER Form: Febrian Dani Dual Roles & Evo Dwi Co-Approval for Asset Tagging', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120000)

  test('Verify Febrian Dani is locked ONLY as Budget Controller, unlocked as Managerial, and Evo Dwi has co-approval badge', async ({
    page,
  }) => {
    // 1. Set desktop viewport & navigate to sign-in
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    const emailInput = page.locator('input[placeholder*="email atau SN" i], #email, input[name="username"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 15000 })
    await emailInput.fill('71261')
    const passwordInput = page.locator('input[type="password"], #password, input[name="password"]').first()
    await passwordInput.fill('Chitra#71261')
    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
    await submitBtn.click()

    await page.waitForURL('**/dashboard/**', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // 2. Navigate to CER Page
    console.log('Navigating to CER Page (/dashboard/assets/cer)...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000)

    // 3. Open "Buat Form CER" dialog
    const openCreateBtn = page.locator('button:has-text("Buat Form CER")').first()
    await expect(openCreateBtn).toBeVisible({ timeout: 15000 })
    await openCreateBtn.click()
    await page.waitForTimeout(1500)

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 15000 })

    // 4. Fill Step 1 Required Fields
    const subjectInput = dialog.locator('input[placeholder*="Laptop Developer"]').first()
    await subjectInput.fill(`Pengadaan Unit Kerja Role Test ${Date.now().toString().slice(-4)}`)

    const vendorInput = dialog.locator('input[placeholder*="Mega Komputindo"]').first()
    await vendorInput.fill('PT Mitra Solusi Mandiri')

    const purposeTextarea = dialog.locator('textarea[placeholder*="kebutuhan pengadaan"]').first()
    await purposeTextarea.fill('Pengujian pembedaan role Febrian Dani (Managerial vs Budget Controller) dan Co-Approval Evo Dwi.')

    const itemDescInput = dialog.locator('input[placeholder*="Laptop Dell Latitude"]').first()
    await itemDescInput.fill('Workstation Engineer Spesifikasi Tinggi')

    const itemPriceInput = dialog.locator('input[type="number"][placeholder="0"]').first()
    await itemPriceInput.fill('32000000')

    await page.waitForTimeout(1000)

    // 5. Click "Lanjut ke Step 2"
    const nextBtn = dialog.locator('button:has-text("Lanjut ke Step 2")').first()
    await expect(nextBtn).toBeVisible()
    await nextBtn.click()
    await page.waitForTimeout(3000)

    // Verify Step 2 is active
    await expect(dialog.locator('text=3. Rantai Persetujuan & Otorisasi')).toBeVisible({ timeout: 15000 })

    // =========================================================================
    // VERIFIKASI 1: BUDGET CONTROLLER FEBRIAN DANI & AMAMA IRA LOCKED (WAJIB)
    // =========================================================================
    // Find Febrian Dani specifically as Budget Validator (Step 4)
    const daniBudgetRow = dialog
      .locator('.rounded-lg.border', { hasText: 'Febrian Dani' })
      .filter({ hasText: 'Budget Validator' })
      .first()
    await expect(daniBudgetRow).toBeVisible({ timeout: 10000 })
    await expect(daniBudgetRow.locator('text=Wajib')).toBeVisible()
    const daniBudgetTrash = daniBudgetRow.locator('button[title="Hapus Approver"]')
    await expect(daniBudgetTrash).toHaveCount(0)
    console.log('✓ Verified: Febrian Dani as Budget Controller is permanently locked with "Wajib" badge and NO delete button.')

    // Find Amama Ira as Budget Controller
    const amamaBudgetRow = dialog.locator('.rounded-lg.border', { hasText: 'Amama Ira' }).first()
    await expect(amamaBudgetRow).toBeVisible({ timeout: 10000 })
    await expect(amamaBudgetRow.locator('text=Wajib')).toBeVisible()
    const amamaBudgetTrash = amamaBudgetRow.locator('button[title="Hapus Approver"]')
    await expect(amamaBudgetTrash).toHaveCount(0)
    console.log('✓ Verified: Amama Ira as Budget Controller is permanently locked with "Wajib" badge and NO delete button.')

    // =========================================================================
    // VERIFIKASI 2: FEBRIAN DANI SEBAGAI MANAGERIAL (DEPT MANAGER) TIDAK DIKUNCI
    // =========================================================================
    const daniManagerialRow = dialog
      .locator('.rounded-lg.border', { hasText: 'Febrian Dani' })
      .filter({ hasText: 'Department Manager' })
      .first()
    await expect(daniManagerialRow).toBeVisible({ timeout: 10000 })
    // Verify Managerial step does NOT have "Wajib" lock badge
    await expect(daniManagerialRow.locator('text=Wajib')).toHaveCount(0)
    // Verify Managerial step DOES have active "Hapus Approver" delete button
    const daniManagerialTrash = daniManagerialRow.locator('button[title="Hapus Approver"]')
    await expect(daniManagerialTrash).toBeVisible()
    console.log('✓ Verified: Febrian Dani as Department Manager (Managerial) is UNLOCKED with active delete button.')

    // =========================================================================
    // VERIFIKASI 3: ASSET TAGGING CO-APPROVAL (EVO DWI)
    // =========================================================================
    const assetTaggingRow = dialog.locator('.rounded-lg.border', { hasText: 'Asset Tagging' }).first()
    await expect(assetTaggingRow).toBeVisible({ timeout: 10000 })
    // Verify badge: "CC & Co-Approve: Evo Dwi (Finance Tagging)"
    await expect(assetTaggingRow.locator('text=CC & Co-Approve: Evo Dwi (Finance Tagging)')).toBeVisible()
    // Verify subtitle: "(CC & Co-Approval: Evo Dwi)"
    await expect(assetTaggingRow.locator('text=(CC & Co-Approval: Evo Dwi)')).toBeVisible()
    // Verify Wajib lock badge
    await expect(assetTaggingRow.locator('text=Wajib')).toBeVisible()
    const taggingTrash = assetTaggingRow.locator('button[title="Hapus Approver"]')
    await expect(taggingTrash).toHaveCount(0)
    console.log('✓ Verified: Asset Tagging prominently displays "CC & Co-Approve: Evo Dwi (Finance Tagging)" and is locked.')

    // Capture screenshot 1: Both roles of Febrian Dani (Dept Manager vs Budget Validator) and Asset Tagging
    const ss1Artifact = path.join(ARTIFACT_DIR, '01_febrian_roles_budget_locked_vs_managerial_unlocked.png')
    const ss1Local = path.join(LOCAL_OUTPUT_DIR, '01_febrian_roles_budget_locked_vs_managerial_unlocked.png')
    await page.screenshot({ path: ss1Artifact, fullPage: false })
    await page.screenshot({ path: ss1Local, fullPage: false })
    console.log('✓ Captured screenshot 01_febrian_roles_budget_locked_vs_managerial_unlocked.png')

    // =========================================================================
    // VERIFIKASI 4: TEST MENGHAPUS STEP MANAGERIAL FEBRIAN DANI
    // =========================================================================
    // Click delete on Febrian Dani's managerial step
    await daniManagerialTrash.click()
    await page.waitForTimeout(1000)

    // After deleting the managerial step, Febrian Dani should STILL exist as Budget Validator!
    const remainingDaniRows = dialog.locator('.rounded-lg.border', { hasText: 'Febrian Dani' })
    await expect(remainingDaniRows).toHaveCount(1)
    await expect(remainingDaniRows.first().locator('text=Budget Validator')).toBeVisible()
    await expect(remainingDaniRows.first().locator('text=Wajib')).toBeVisible()
    console.log('✓ Verified: Managerial step deleted successfully while Budget Validator remains locked!')

    // Capture screenshot 2: After deleting managerial step, Budget Validator remains locked
    const ss2Artifact = path.join(ARTIFACT_DIR, '02_asset_tagging_evo_coapproval_badge.png')
    const ss2Local = path.join(LOCAL_OUTPUT_DIR, '02_asset_tagging_evo_coapproval_badge.png')
    await page.screenshot({ path: ss2Artifact, fullPage: false })
    await page.screenshot({ path: ss2Local, fullPage: false })
    console.log('✓ Captured screenshot 02_asset_tagging_evo_coapproval_badge.png')

    // Close dialog
    const closeBtn = dialog.locator('button:has-text("Batal")').first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    }
  })
})
