// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ARTIFACT_SCREENSHOT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-studio')
const OUTPUT_SCREENSHOT_DIR = path.join(process.cwd(), 'outputs/screenshots/cer-studio')

test.describe('CER Workflow Studio Integration Verification', () => {
  test.setTimeout(180000)

  test('Verify CER in Workflow Studio, Multi-Approver & Live Wizard Chain', async ({ page }) => {
    fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true })
    fs.mkdirSync(OUTPUT_SCREENSHOT_DIR, { recursive: true })

    // 1. Authenticate with standard system credentials
    console.log('Logging in to HERO...')
    await page.goto('/sign-in')
    await page.getByPlaceholder('Masukkan email atau SN').fill('mochamad.khadafi@chitraparatama.co.id')
    await page.getByPlaceholder('Masukkan kata sandi').fill('Chitra#71261')
    await page.getByRole('button', { name: 'Masuk ke HERO' }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 45000 })
    console.log('Login successful.')

    // 2. Navigate to Workflow Studio
    console.log('Navigating to Workflow Studio...')
    await page.goto('/dashboard/workflow-studio')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)

    // Verify Workflow Studio overview is rendered
    await expect(page.locator('text=Workflow Studio').first()).toBeVisible({ timeout: 15000 })

    // Find and click "Buat Approval" button
    const createBtn = page.getByRole('button', { name: /Buat Approval/i }).first()
    await expect(createBtn).toBeVisible({ timeout: 15000 })
    await createBtn.click()
    await page.waitForTimeout(1500)

    // Select CER Request from dropdown
    const menuSelect = page.locator('select[name="menuKey"]').first()
    await expect(menuSelect).toBeVisible({ timeout: 10000 })
    await menuSelect.selectOption('cer-request')
    await page.waitForTimeout(2000)

    // Verify CER steps & interactive AND/OR toggle badge on column header
    await expect(page.locator('text=IT / BIMA Supervisor').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Budget Validator').first()).toBeVisible({ timeout: 10000 })

    const toggleBadge = page.locator('button:has-text("AND (Semua Wajib)")').first()
    await expect(toggleBadge).toBeVisible({ timeout: 10000 })

    // Take screenshot of Workflow Studio with CER workflow configuration and AND/OR toggle
    const ssStudio = path.join(ARTIFACT_SCREENSHOT_DIR, '01_workflow_studio_cer_builder.png')
    await page.screenshot({ path: ssStudio, fullPage: true })
    fs.copyFileSync(ssStudio, path.join(OUTPUT_SCREENSHOT_DIR, '01_workflow_studio_cer_builder.png'))
    console.log('Saved screenshot 01_workflow_studio_cer_builder.png')

    // 3. Navigate to CER Page
    console.log('Navigating to CER Page...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2500)

    // Click "Buat Form CER"
    const applyBtn = page.getByRole('button', { name: /Buat Form CER/i }).first()
    await expect(applyBtn).toBeVisible({ timeout: 15000 })
    await applyBtn.click()
    await page.waitForTimeout(1500)

    // Verify title has NO "1c." -> "Form CER (Capital Expenditure Request)"
    await expect(page.locator('text=Form CER (Capital Expenditure Request)').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=1c. Form CER')).toHaveCount(0)

    // Verify dynamic Section dropdown is present
    await expect(page.locator('text=Section / Bagian').first()).toBeVisible({ timeout: 10000 })

    // Fill required fields
    const subjectInput = page.locator('input[placeholder*="Pengadaan Laptop"]').first()
    await expect(subjectInput).toBeVisible({ timeout: 5000 })
    await subjectInput.fill('Pengadaan Laptop High Performance Engineering')

    // Select Department: Finance Business Partners
    const deptSelect = page.locator('select').first()
    await deptSelect.selectOption({ label: 'Finance Business Partners' }).catch(() => {})
    await page.waitForTimeout(1000)

    // Select Section: Business Innovation & Marketing (matches Matrix 6433!)
    const secSelect = page.locator('select').nth(1)
    await secSelect.selectOption({ label: 'Business Innovation & Marketing' }).catch(() => {})
    await page.waitForTimeout(1000)

    const vendorInput = page.locator('input[placeholder*="Nama Vendor"]').first()
    await expect(vendorInput).toBeVisible({ timeout: 5000 })
    await vendorInput.fill('PT Apple Indonesia iBox')

    const purposeInput = page.locator('textarea[placeholder*="Jelaskan latar belakang"]').first()
    await expect(purposeInput).toBeVisible({ timeout: 5000 })
    await purposeInput.fill('Untuk operasional komputasi berat analisis teknis ban engineering.')

    const descInput = page.locator('input[placeholder*="Deskripsi barang modal"]').first()
    await expect(descInput).toBeVisible({ timeout: 5000 })
    await descInput.fill('MacBook Pro M3 Max 36GB RAM 1TB SSD')

    // Fill Price per unit (table input with min="0")
    const priceInput = page.locator('table input[min="0"]').first()
    await expect(priceInput).toBeVisible({ timeout: 5000 })
    await priceInput.fill('45000000')

    // Next to Step 2
    const nextBtn = page.getByRole('button', { name: /Lanjut ke Step 2/i }).first()
    await expect(nextBtn).toBeVisible({ timeout: 5000 })
    await nextBtn.click()
    await page.waitForTimeout(3000)

    // Verify Step 2 Live Approval Chain is rendered
    await expect(page.locator('text=3. Alur Persetujuan (Live Approval Chain)').first()).toBeVisible({ timeout: 15000 })

    // Verify step labels from Matrix 6433
    await expect(page.locator('text=Checked by BIMA').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Budget Validator').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Semua Wajib (AND)').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Asset Tagging').first()).toBeVisible({ timeout: 10000 })

    // Verify NO hardcoded technician validator note in label!
    await expect(page.locator('text=Technical Validation IT (Aditya Jarangmula')).toHaveCount(0)

    // Take screenshot of Live Approval Chain
    const ssChain = path.join(ARTIFACT_SCREENSHOT_DIR, '02_cer_wizard_live_chain.png')
    await page.screenshot({ path: ssChain, fullPage: true })
    fs.copyFileSync(ssChain, path.join(OUTPUT_SCREENSHOT_DIR, '02_cer_wizard_live_chain.png'))
    console.log('Saved screenshot 02_cer_wizard_live_chain.png')

    console.log('Verification completed successfully!')
  })
})
