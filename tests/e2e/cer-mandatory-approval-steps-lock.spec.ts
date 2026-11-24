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

test.describe('CER Form: Lock Mandatory Approval Steps (Budget Validator, Director, Asset Tagging)', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120000)

  test('Verify Budget Validator (Amama & Dani), Director Hidayat (cc Freshya), and Asset Tagging (cc Evo) are locked without delete buttons', async ({
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

    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), { timeout: 30000 })
    await page.waitForTimeout(2000)

    // 2. Navigate to CER Page
    console.log('Navigating to CER Page (/dashboard/assets/cer)...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
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
    await subjectInput.fill(`Pengadaan Unit Kerja E2E Lock Test ${Date.now().toString().slice(-4)}`)

    const vendorInput = dialog.locator('input[placeholder*="Mega Komputindo"]').first()
    await vendorInput.fill('PT Mitra Solusi Nusantara')

    // Fill Purpose
    const purposeTextarea = dialog.locator('textarea[placeholder*="kebutuhan pengadaan"]').first()
    await purposeTextarea.fill('Pengujian sistem penguncian alur approval wajib CER (Budget Validator, Director, dan Asset Tagging).')

    // Fill Item Description & Price
    const itemDescInput = dialog.locator('input[placeholder*="Laptop Dell Latitude"]').first()
    await itemDescInput.fill('Unit Pengadaan Server Dev E2E')

    const itemPriceInput = dialog.locator('input[type="number"][placeholder="0"]').first()
    await itemPriceInput.fill('25000000')

    await page.waitForTimeout(1000)

    // 5. Click "Lanjut ke Step 2"
    const nextBtn = dialog.locator('button:has-text("Lanjut ke Step 2")').first()
    await expect(nextBtn).toBeVisible()
    await nextBtn.click()
    await page.waitForTimeout(3000)

    // Verify Step 2 is active
    await expect(dialog.locator('text=3. Rantai Persetujuan & Otorisasi')).toBeVisible({ timeout: 15000 })

    // =========================================================================
    // VERIFIKASI 1: BUDGET VALIDATOR (AMAMA IRA AMALIA & FEBRIAN DANI)
    // =========================================================================
    // Find Amama Ira row
    const amamaRow = dialog.locator('.rounded-lg.border', { hasText: 'Amama Ira' }).first()
    await expect(amamaRow).toBeVisible({ timeout: 10000 })
    // Verify Amama Ira has "Wajib" lock badge
    await expect(amamaRow.locator('text=Wajib')).toBeVisible()
    // Verify Amama Ira row has NO delete button (Trash2)
    const amamaTrash = amamaRow.locator('button[title="Hapus Approver"]')
    await expect(amamaTrash).toHaveCount(0)
    console.log('✓ Verified: Budget Validator Amama Ira is locked with "Wajib" badge and NO delete button!')

    // Find Febrian Dani row as Budget Validator
    const daniRow = dialog
      .locator('.rounded-lg.border', { hasText: 'Febrian Dani' })
      .filter({ hasText: 'Budget Validator' })
      .first()
    await expect(daniRow).toBeVisible({ timeout: 10000 })
    // Verify Febrian Dani has "Wajib" lock badge
    await expect(daniRow.locator('text=Wajib')).toBeVisible()
    // Verify Febrian Dani row has NO delete button (Trash2)
    const daniTrash = daniRow.locator('button[title="Hapus Approver"]')
    await expect(daniTrash).toHaveCount(0)
    console.log('✓ Verified: Budget Validator Febrian Dani is locked with "Wajib" badge and NO delete button!')

    // =========================================================================
    // VERIFIKASI 2: DIRECTOR HIDAYAT (CC FRESHYA)
    // =========================================================================
    const directorRow = dialog.locator('.rounded-lg.border', { hasText: 'Hidayat Rahman' }).first()
    await expect(directorRow).toBeVisible({ timeout: 10000 })
    // Verify Director has "CC & Co-Approve: Freshya (Board Secretary)"
    await expect(directorRow.locator('text=Freshya (Board Secretary)')).toBeVisible()
    // Verify Director has "Wajib" lock badge
    await expect(directorRow.locator('text=Wajib')).toBeVisible()
    // Verify Director row has NO delete button (Trash2)
    const dirTrash = directorRow.locator('button[title="Hapus Approver"]')
    await expect(dirTrash).toHaveCount(0)
    console.log('✓ Verified: Director Hidayat Rahman (cc Freshya) is locked with "Wajib" badge and NO delete button!')

    // =========================================================================
    // VERIFIKASI 3: ASSET TAGGING (CC EVO)
    // =========================================================================
    const assetTaggingRow = dialog.locator('.rounded-lg.border', { hasText: 'Asset Tagging' }).first()
    await expect(assetTaggingRow).toBeVisible({ timeout: 10000 })
    // Verify Asset Tagging has "CC & Co-Approve: Evo Dwi"
    await expect(assetTaggingRow.locator('text=Evo Dwi').first()).toBeVisible()
    // Verify Asset Tagging has "Wajib" lock badge
    await expect(assetTaggingRow.locator('text=Wajib')).toBeVisible()
    // Verify Asset Tagging row has NO delete button (Trash2)
    const taggingTrash = assetTaggingRow.locator('button[title="Hapus Approver"]')
    await expect(taggingTrash).toHaveCount(0)
    console.log('✓ Verified: Asset Tagging (cc Evo) is locked with "Wajib" badge and NO delete button!')

    // =========================================================================
    // VERIFIKASI 4: STEP OPSIONAL LAINNYA TETAP MEMILIKI TOMBOL HAPUS
    // =========================================================================
    // Non-mandatory steps (e.g. IT Validation or Atasan Langsung or Dept Manager) should still have delete button
    const deleteButtons = dialog.locator('button[title="Hapus Approver"]')
    const deleteCount = await deleteButtons.count()
    console.log(`Found ${deleteCount} delete button(s) for non-mandatory step(s).`)
    expect(deleteCount).toBeGreaterThan(0)

    // Capture screenshots
    const ss1PathArtifact = path.join(ARTIFACT_DIR, '01_cer_form_step2_locked_mandatory_steps.png')
    const ss1PathLocal = path.join(LOCAL_OUTPUT_DIR, '01_cer_form_step2_locked_mandatory_steps.png')
    await page.screenshot({ path: ss1PathArtifact, fullPage: false })
    await page.screenshot({ path: ss1PathLocal, fullPage: false })
    console.log('✓ Captured screenshot 01_cer_form_step2_locked_mandatory_steps.png')

    // Close dialog
    const closeBtn = dialog.locator('button:has-text("Batal")').first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    }
  })
})
