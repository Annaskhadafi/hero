// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { cerRequests, cerItems, approvals } from '../../db/schema'
import { eq } from 'drizzle-orm'

const ARTIFACT_SCREENSHOT_DIR = path.resolve(
  'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-finance-check-simple-input'
)

test.describe('CER Finance Check & Asset Tagging Simple Input Verification', () => {
  test.setTimeout(180000)

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

    // Set test CER to pending_finance_check so that "Input No. Aset" button appears
    await db
      .update(cerRequests)
      .set({
        status: 'pending_finance_check',
        kelompokAset: null,
      })
      .where(eq(cerRequests.id, testCerId))
  })

  test('Verify Finance Check Modal: Plain text input without dropdown, mode toggle, or quick chips', async ({ page }) => {
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

    await page.waitForResponse(
      (res) => res.url().includes('/api/auth/sign-in') && res.status() === 200,
      { timeout: 30000 }
    ).catch(() => {})
    await page.waitForTimeout(2000)

    // 2. Navigate to CER Page
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)

    // 3. Find and click "Input No. Aset" button on the pending CER row
    const inputAssetBtn = page.locator('button:has-text("Input No. Aset")').first()
    await expect(inputAssetBtn).toBeVisible({ timeout: 20000 })
    await inputAssetBtn.click()
    await page.waitForTimeout(1500)

    // 4. Verify Finance Check Modal is Open
    const modalTitle = page.locator('text=Checked by Finance (Input Kelompok & Nomor Aset)').first()
    await expect(modalTitle).toBeVisible()

    // 5. Verify the category input:
    // a. An <input id="kelompok-aset"> exists and is visible
    const categoryInput = page.locator('input#kelompok-aset')
    await expect(categoryInput).toBeVisible()

    // b. Assert that dropdown (<select>, [role="combobox"]) does NOT exist in the category section
    const categoryDropdown = page.locator('button[role="combobox"]:has-text("Pilih Kelompok Aset")')
    await expect(categoryDropdown).toHaveCount(0)

    // c. Assert that mode toggle buttons ("Pilih dari Kategori Tersimpan" or "Ketik Kategori Baru") DO NOT exist
    const modeToggleSaved = page.locator('button:has-text("Pilih dari Kategori Tersimpan")')
    await expect(modeToggleSaved).toHaveCount(0)
    const modeToggleNew = page.locator('button:has-text("Ketik Kategori Baru")')
    await expect(modeToggleNew).toHaveCount(0)

    // d. Assert that "Pilihan cepat:" chips container DOES NOT exist
    const quickChipsLabel = page.locator('text=Pilihan cepat:')
    await expect(quickChipsLabel).toHaveCount(0)

    // 6. Test typing directly into the input field
    const testCategoryText = 'Kelompok 1 (Masa Manfaat 4 Tahun) - IT Hardware'
    await categoryInput.fill(testCategoryText)
    await expect(categoryInput).toHaveValue(testCategoryText)

    // Wait for items to finish loading
    const itemLoader = page.locator('text=Memuat item...')
    if (await itemLoader.isVisible()) {
      await itemLoader.waitFor({ state: 'detached', timeout: 20000 })
    }

    // Fill unit asset numbers if empty
    const unitAssetInputs = page.locator('input[placeholder*="Ketik Nomor Aset"]')
    await expect(unitAssetInputs.first()).toBeVisible({ timeout: 15000 })
    const count = await unitAssetInputs.count()
    for (let i = 0; i < count; i++) {
      await unitAssetInputs.nth(i).fill(`AST-TEST-${i + 1}`)
    }

    // 7. Capture visual proof of the clean modal
    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '01_finance_check_clean_text_input.png')
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
    })
    console.log('Saved screenshot to:', screenshotPath)

    // 8. Submit form and verify successful persistence
    const saveBtn = page.locator('button:has-text("Simpan & Terbitkan Dokumen Resmi")').first()
    await expect(saveBtn).toBeEnabled({ timeout: 15000 })
    await saveBtn.click()

    await page.waitForTimeout(4000)

    // Verify DB updated
    const [updatedCer] = await db
      .select()
      .from(cerRequests)
      .where(eq(cerRequests.id, testCerId))
    expect(updatedCer.kelompokAset).toBe(testCategoryText)
    console.log('Database verification successful! Saved kelompokAset:', updatedCer.kelompokAset)
  })
})
