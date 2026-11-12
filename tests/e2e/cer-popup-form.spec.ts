// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-popup')
const OUTPUT_DIR = path.join(process.cwd(), 'outputs/screenshots/cer-popup')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
})

test.describe('CER Pop-up Form Dialog & 2-Row Capex Items Verification', () => {
  test.setTimeout(180000)

  test('Verifikasi Tab Dihapus, Form CER Muncul Pop-up Modal Lega, & Rincian Item 2 Baris', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()))
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message))

    // 1. Authenticate with standard system credentials
    await page.goto('/dashboard')
    await page.waitForTimeout(1500)

    if (page.url().includes('/sign-in')) {
      const emailInput = page.locator('#email, input[name="username"]').first()
      await emailInput.waitFor({ state: 'visible', timeout: 10000 })
      await emailInput.fill('71261')
      const passwordInput = page.locator('#password, input[name="password"]').first()
      await passwordInput.fill('Chitra#71261')
      const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
      await submitBtn.click()
      await page.waitForTimeout(3000)
    }

    // 2. Go to CER Page
    console.log('Navigating to CER Page (/dashboard/assets/cer)...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2500)

    // =========================================================================
    // PART A: Verifikasi Tab "Buat Form CER" Telah Dihapus
    // =========================================================================
    const tabsList = page.locator('[role="tablist"]')
    await expect(tabsList).toBeVisible({ timeout: 15000 })

    // Verify Tab "Daftar Pengajuan" and "Penerimaan & BAST" exist
    await expect(page.locator('button[role="tab"]:has-text("Daftar Pengajuan")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Penerimaan & BAST")')).toBeVisible()

    // Verify Tab "Buat Form CER" DOES NOT exist in tabs list
    const createTab = page.locator('button[role="tab"]:has-text("Buat Form CER")')
    await expect(createTab).not.toBeVisible()

    // Screenshot 1: Halaman CER hanya 2 tab
    const ss1Output = path.join(OUTPUT_DIR, '01_cer_page_two_tabs.png')
    const ss1Artifact = path.join(ARTIFACT_DIR, '01_cer_page_two_tabs.png')
    await page.screenshot({ path: ss1Output, fullPage: false })
    fs.copyFileSync(ss1Output, ss1Artifact)
    console.log('📸 Screenshot saved: 01_cer_page_two_tabs.png')

    // =========================================================================
    // PART B: Verifikasi Tombol Header "Buat Form CER" Membuka Pop-up Modal
    // =========================================================================
    const openCreateBtn = page.locator('button:has-text("Buat Form CER")')
    await expect(openCreateBtn).toBeVisible({ timeout: 10000 })
    await openCreateBtn.click()
    await page.waitForTimeout(1200)

    // Modal dialog should appear
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await expect(dialog.locator('text=Formulir Pengadaan Aset (CER)')).toBeVisible()
    await expect(dialog.locator('text=1. Input Data & Rincian')).toBeVisible()

    // Screenshot 2: Modal Pop-up Step 1
    const ss2Output = path.join(OUTPUT_DIR, '02_cer_popup_modal_step1.png')
    const ss2Artifact = path.join(ARTIFACT_DIR, '02_cer_popup_modal_step1.png')
    await page.screenshot({ path: ss2Output, fullPage: false })
    fs.copyFileSync(ss2Output, ss2Artifact)
    console.log('📸 Screenshot saved: 02_cer_popup_modal_step1.png')

    // =========================================================================
    // PART C: Verifikasi "Rincian Unit / Item CapEx" dalam Susunan 2 Baris
    // =========================================================================
    const itemsCard = dialog.locator('text=3. Rincian Unit / Item CapEx').locator('xpath=ancestor::div[contains(@class, "rounded-xl") or contains(@class, "border-slate-200")]').first()
    await expect(itemsCard).toBeVisible()

    // Verify Labels on Row 1: Deskripsi, Qty, Harga Satuan, Total Harga
    await expect(itemsCard.locator('label:has-text("Deskripsi Barang Modal")')).toBeVisible()
    await expect(itemsCard.locator('label:has-text("Qty")')).toBeVisible()
    await expect(itemsCard.locator('label:has-text("Harga Satuan (Rp)")')).toBeVisible()
    await expect(itemsCard.locator('label:has-text("Total Harga")')).toBeVisible()

    // Verify Labels on Row 2: Alokasi, Pemakai / Holder, Estimasi Umur Teknis
    await expect(itemsCard.locator('label:has-text("Alokasi (Site/Dept)")')).toBeVisible()
    await expect(itemsCard.locator('label:has-text("Pemakai / Holder Aset")')).toBeVisible()
    await expect(itemsCard.locator('label:has-text("Estimasi Umur Teknis")')).toBeVisible()

    // Fill Item 1 fields
    const descInput = itemsCard.locator('input[placeholder*="Laptop Dell"]').first()
    await descInput.fill('Laptop Developer High End 32GB RAM')

    const priceInput = itemsCard.locator('input[type="number"][placeholder="0"]').first()
    await priceInput.fill('25000000')

    // Stepper Qty -> Click plus to make it 2
    const plusBtn = itemsCard.locator('button:has-text("+")').first()
    await plusBtn.click()
    await page.waitForTimeout(500)

    // Verify Total Harga is Rp 50.000.000
    await expect(itemsCard.locator('text=Rp 50.000.000').first()).toBeVisible()

    // Fill Row 2 fields
    await itemsCard.locator('input[placeholder*="Site Balikpapan"]').first().fill('Site Balikpapan / IT Dept')
    await itemsCard.locator('input[placeholder*="Nama pemakai"]').first().fill('Budi Santoso')
    await itemsCard.locator('input[placeholder*="3-5 Tahun"]').first().fill('4 Tahun')

    // Test Add Unit button
    const addUnitBtn = itemsCard.locator('button:has-text("Tambah Unit")')
    await addUnitBtn.click()
    await page.waitForTimeout(600)

    // Screenshot 3: Item Card dengan 2 baris terstruktur
    const ss3Output = path.join(OUTPUT_DIR, '03_cer_items_2row_layout.png')
    const ss3Artifact = path.join(ARTIFACT_DIR, '03_cer_items_2row_layout.png')
    await page.screenshot({ path: ss3Output, fullPage: false })
    fs.copyFileSync(ss3Output, ss3Artifact)
    console.log('📸 Screenshot saved: 03_cer_items_2row_layout.png')

    // Remove the 2nd item
    const trashBtns = itemsCard.locator('button[title="Hapus Unit"]')
    await expect(trashBtns).toHaveCount(2)
    await trashBtns.nth(1).click()
    await page.waitForTimeout(500)
    await expect(itemsCard.locator('button[title="Hapus Unit"]')).toHaveCount(1)

    // =========================================================================
    // PART D: Transisi Step 1 ke Step 2 (Review & Live Approval Matrix Preview)
    // =========================================================================
    // Fill remaining required fields in Step 1
    await dialog.locator('input[placeholder*="Pengadaan 2 Unit Laptop"]').fill('Pengadaan Laptop Developer High End 32GB RAM')
    await dialog.locator('input[placeholder*="PT Mega Komputindo"]').fill('PT Mega Komputindo Perkasa')
    await dialog.locator('textarea[placeholder*="Jelaskan kebutuhan pengadaan"]').fill('Kebutuhan operasional tim engineering HERO untuk percepatan deployment modul CER dan Budget Controller.')

    // Click "Lanjut ke Step 2 (Review)"
    const nextStepBtn = dialog.locator('button:has-text("Lanjut ke Step 2")')
    await expect(nextStepBtn).toBeVisible()
    await nextStepBtn.click()
    await page.waitForTimeout(2000)

    // Verify Step 2 is active
    await expect(dialog.locator('text=1. Ringkasan Pengajuan CER')).toBeVisible({ timeout: 10000 })
    await expect(dialog.locator('text=2. Dampak Anggaran (Budget Controller)')).toBeVisible()
    await expect(dialog.locator('text=3. Alur Persetujuan (Live Approval Chain)')).toBeVisible()
    await expect(dialog.locator('button:has-text("Kembali ke Step 1")')).toBeVisible()
    await expect(dialog.locator('button:has-text("Kirim Pengajuan CER")')).toBeVisible()

    // Screenshot 4: Step 2 Review & Live Approval Chain Preview
    const ss4Output = path.join(OUTPUT_DIR, '04_cer_popup_modal_step2_review.png')
    const ss4Artifact = path.join(ARTIFACT_DIR, '04_cer_popup_modal_step2_review.png')
    await page.screenshot({ path: ss4Output, fullPage: false })
    fs.copyFileSync(ss4Output, ss4Artifact)
    console.log('📸 Screenshot saved: 04_cer_popup_modal_step2_review.png')

    // Click Batal to close the modal safely without creating test garbage
    const cancelBtn = dialog.locator('button:has-text("Batal")')
    await cancelBtn.click()
    await page.waitForTimeout(800)

    // Modal should now be closed
    await expect(dialog).not.toBeVisible()

    // Screenshot 5: Closed modal returning to table
    const ss5Output = path.join(OUTPUT_DIR, '05_cer_popup_modal_closed.png')
    const ss5Artifact = path.join(ARTIFACT_DIR, '05_cer_popup_modal_closed.png')
    await page.screenshot({ path: ss5Output, fullPage: false })
    fs.copyFileSync(ss5Output, ss5Artifact)
    console.log('📸 Screenshot saved: 05_cer_popup_modal_closed.png')
  })
})
