// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'outputs/screenshots/cer-workflow')
const ARTIFACT_SCREENSHOT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-workflow')

test.describe('CER Flexible Approval Workflow & Matrix Builder Verification', () => {
  test.setTimeout(180000)

  test('Capture Form CER, Step 2 Live Approval Chain & Matrix Builder', async ({ page }) => {
    // Ensure output directories exist
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
    fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true })

    // 1. Authenticate with standard system credentials
    await page.goto('/sign-in')
    await page.getByPlaceholder('Masukkan email atau SN').fill('mochamad.khadafi@chitraparatama.co.id')
    await page.getByPlaceholder('Masukkan kata sandi').fill('Chitra#71261')
    await page.getByRole('button', { name: 'Masuk ke HERO' }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 35000 })
    console.log('Login successful.')

    // 2. Go to CER Page
    console.log('Navigating to CER Page...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // ==========================================
    // PART A: Matriks Approval Tab Verification
    // ==========================================
    console.log('Testing Matriks Approval tab...')
    const matrixTab = page.locator('button[role="tab"]:has-text("Matriks Approval")')
    await expect(matrixTab).toBeVisible({ timeout: 15000 })
    await matrixTab.click()
    await page.waitForTimeout(2000)

    // Verify matrix builder is rendered
    await expect(page.locator('text=Dynamic Approval Matrix Builder')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Acknowledge Leader-1')).toBeVisible()
    await expect(page.locator('text=Budget Validator (Head of Finance)')).toBeVisible()
    await expect(page.locator('text=Budget Validator (Finance BP Manager)')).toBeVisible()
    await expect(page.locator('text=Checked by Finance')).toBeVisible()

    // Screenshot 4: Matrix Builder
    const ssMatrix = path.join(ARTIFACT_SCREENSHOT_DIR, '04_cer_approval_matrix_builder.png')
    await page.screenshot({ path: ssMatrix, fullPage: true })
    fs.copyFileSync(ssMatrix, path.join(SCREENSHOT_DIR, '04_cer_approval_matrix_builder.png'))
    console.log('Saved screenshot 04_cer_approval_matrix_builder.png')

    // Click Edit on a step to capture Step Configuration Modal
    const editBtn = page.locator('button:has-text("Edit")').first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await page.waitForTimeout(800)
      await expect(page.locator('text=Konfigurasi Langkah Persetujuan')).toBeVisible()

      const ssEdit = path.join(ARTIFACT_SCREENSHOT_DIR, '05_cer_matrix_step_edit_modal.png')
      await page.screenshot({ path: ssEdit })
      fs.copyFileSync(ssEdit, path.join(SCREENSHOT_DIR, '05_cer_matrix_step_edit_modal.png'))
      console.log('Saved screenshot 05_cer_matrix_step_edit_modal.png')

      await page.locator('button:has-text("Batal")').click()
      await page.waitForTimeout(500)
    }

    // ==========================================
    // PART B: Daftar Pengajuan Tab & Actions
    // ==========================================
    console.log('Testing Daftar Pengajuan tab...')
    const requestsTab = page.locator('button[role="tab"]:has-text("Daftar Pengajuan")')
    await requestsTab.click()
    await page.waitForTimeout(1000)

    const ssTable = path.join(ARTIFACT_SCREENSHOT_DIR, '06_cer_table_requests.png')
    await page.screenshot({ path: ssTable, fullPage: true })
    fs.copyFileSync(ssTable, path.join(SCREENSHOT_DIR, '06_cer_table_requests.png'))
    console.log('Saved screenshot 06_cer_table_requests.png')

    // ==========================================
    // PART C: Buat Form CER (Step 1 -> Step 2)
    // ==========================================
    console.log('Testing Form CER Wizard...')
    const createTab = page.locator('button[role="tab"]:has-text("Buat Form CER")')
    await createTab.click()
    await page.waitForTimeout(1000)

    // Fill Step 1 required fields
    await page.locator('input[placeholder*="Pengadaan Laptop"]').fill('Pengadaan 2 Unit Laptop Developer High Performance')
    await page.locator('input[placeholder*="Nama Vendor"]').fill('PT Mega Komputindo Perkasa')
    await page.locator('textarea[placeholder*="justifikasi operasional"]').fill('Peremajaan unit laptop developer untuk percepatan deployment modul CER dan Budget Controller sistem HERO.')

    // Check attachment checkbox to satisfy validation
    const checkbox = page.locator('input[type="checkbox"]').first()
    if (await checkbox.isVisible()) {
      await checkbox.check()
    }

    // Fill Item row 1
    await page.locator('input[placeholder="Nama & Spesifikasi Barang..."]').first().fill('ThinkPad T14s Gen 4 AMD Ryzen 7 PRO 32GB RAM 1TB SSD')
    await page.locator('table input[type="number"]').first().fill('2')
    await page.locator('table input[type="number"]').nth(1).fill('24500000')

    await page.waitForTimeout(1000)

    // Capture Step 1
    const ssStep1 = path.join(ARTIFACT_SCREENSHOT_DIR, '02_cer_form_step1_budget_selection.png')
    await page.screenshot({ path: ssStep1, fullPage: true })
    fs.copyFileSync(ssStep1, path.join(SCREENSHOT_DIR, '02_cer_form_step1_budget_selection.png'))
    console.log(`Saved screenshot Step 1: ${ssStep1}`)

    // Click Lanjut ke Step 2 (Review)
    const nextBtn = page.getByRole('button', { name: /Lanjut ke Step 2/i })
    await nextBtn.click()
    await page.waitForTimeout(3000)

    // Ensure Step 2 Live Approval Chain is rendered
    await expect(page.locator('text=Alur Persetujuan (Live Approval Chain)')).toBeVisible({ timeout: 20000 })

    // Capture Step 2 Live Approval Chain Preview
    const ssStep2 = path.join(ARTIFACT_SCREENSHOT_DIR, '03_cer_form_step2_approval_chain.png')
    await page.screenshot({ path: ssStep2, fullPage: true })
    fs.copyFileSync(ssStep2, path.join(SCREENSHOT_DIR, '03_cer_form_step2_approval_chain.png'))
    console.log(`Saved screenshot Step 2: ${ssStep2}`)

    console.log('ALL E2E VERIFICATIONS PASSED SUCCESSFULLY!')
  })
})
