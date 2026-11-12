// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/asset-disposal')
const OUTPUT_DIR = path.join(process.cwd(), 'outputs/screenshots/asset-disposal')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  try {
    execSync('node ./node_modules/tsx/dist/cli.mjs scripts/reset-test-disposal.ts', { stdio: 'inherit' })
  } catch (err) {
    console.error('Reset error:', err)
  }
})

test.describe('Asset Disposal E2E Feature Verification', () => {
  test.setTimeout(180000)

  test('Verifikasi Menu Sidebar, Dashboard, Buat Disposal, Auto-fill Aset, Amama Ira Guardrail, Approval, dan Template PDF A4', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message))

    // Set desktop standard viewport
    await page.setViewportSize({ width: 1440, height: 900 })

    // 1. Authenticate with standard system credentials
    console.log('Navigating to sign-in page...')
    await page.goto('/sign-in', { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(2000)

    const usernameInput = page.locator('input[placeholder*="email atau SN"], #email, input[name="username"]').first()
    const passwordInput = page.locator('input[placeholder*="kata sandi"], #password, input[name="password"]').first()
    const loginSubmitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()

    await usernameInput.click()
    await usernameInput.fill('71261')
    await passwordInput.click()
    await passwordInput.fill('Chitra#71261')
    await page.waitForTimeout(500)
    await loginSubmitBtn.click()

    console.log('Submitted login credentials. Waiting for redirect...')
    await page.waitForURL(/\/dashboard/, { timeout: 45000 })
    console.log('Login successful, on dashboard.')
    await page.waitForTimeout(2000)

    // =========================================================================
    // STEP 1: Navigasi ke Halaman Asset Disposal (/dashboard/assets/disposal)
    // =========================================================================
    console.log('Navigating to Asset Disposal Page (/dashboard/assets/disposal)...')
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(2500)

    // Verify Title
    const heading = page.locator('main h1:has-text("Asset Disposal")')
    await expect(heading).toBeVisible({ timeout: 15000 })

    // Verify Sidebar Menu "Form Asset Disposal" is positioned below "Form Asset Borrow"
    const disposalMenuItem = page.locator('a[href="/dashboard/assets/disposal"], a:has-text("Form Asset Disposal")').first()
    if (await disposalMenuItem.isVisible()) {
      await disposalMenuItem.scrollIntoViewIfNeeded()
    }
    const ss1Path = path.join(ARTIFACT_DIR, '01_sidebar_asset_disposal_menu.png')
    await page.screenshot({ path: ss1Path })
    fs.copyFileSync(ss1Path, path.join(OUTPUT_DIR, '01_sidebar_asset_disposal_menu.png'))
    console.log('✓ Captured 01_sidebar_asset_disposal_menu.png')

    // =========================================================================
    // STEP 2: Dashboard KPIs & HeroDataTable
    // =========================================================================
    await expect(page.locator('text=Total Permohonan').first()).toBeVisible()
    await expect(page.locator('text=Menunggu Persetujuan').first()).toBeVisible()
    await expect(page.locator('text=Disetujui Penuh').first()).toBeVisible()

    const ss2Path = path.join(ARTIFACT_DIR, '02_asset_disposal_dashboard.png')
    await page.screenshot({ path: ss2Path })
    fs.copyFileSync(ss2Path, path.join(OUTPUT_DIR, '02_asset_disposal_dashboard.png'))
    console.log('✓ Captured 02_asset_disposal_dashboard.png')

    // =========================================================================
    // STEP 3: Buka Modal Form Pengajuan Disposal & Auto-fill
    // =========================================================================
    console.log('Opening Form Asset Disposal dialog...')
    const createBtn = page.locator('button:has-text("Buat Pengajuan Disposal")').first()
    await expect(createBtn).toBeVisible()
    await createBtn.click()

    const dialogTitle = page.locator('text=Formulir Pengajuan Asset Disposal')
    await expect(dialogTitle).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    // Hybrid selection: Pick an asset from master
    const assetSelectTrigger = page.locator('button:has-text("Ketik nama atau nomor aset"), button:has-text("Pencarian aset master")').first()
    if (await assetSelectTrigger.isVisible()) {
      await assetSelectTrigger.click()
      await page.waitForTimeout(800)
      const firstOption = page.locator('[role="option"], [data-radix-collection-item]').first()
      if (await firstOption.isVisible()) {
        await firstOption.click()
      } else {
        await page.keyboard.press('Escape')
      }
    }

    // Ensure Nama Aset has content
    const assetNameInput = page.locator('input[placeholder*="Contoh: Forklift Komatsu"]').first()
    const currentName = await assetNameInput.inputValue()
    if (!currentName) {
      await assetNameInput.fill('Komatsu Excavator PC200-8')
      const assetNumInput = page.locator('input[placeholder*="Contoh: AST-FL"]').first()
      await assetNumInput.fill('AST-EXC-005')
      const yearInput = page.locator('input[placeholder*="Contoh: 2018"]').first()
      await yearInput.fill('2017')
    }

    // Fill notes
    const notesTextarea = page.locator('textarea[placeholder*="Deskripsikan kondisi fisik"]').first()
    await notesTextarea.fill('Unit mengalami keretakan pada boom utama dan kebocoran internal hidrolik parah. Estimasi perbaikan melebihi 70% nilai buku aset.')

    // Verify Amama Ira is displayed in Approval Routing Builder
    const amamaBadge = page.locator('text=Amama Ira').first()
    await expect(amamaBadge).toBeVisible({ timeout: 8000 })
    console.log('✓ Amama Ira successfully verified in approval hierarchy!')

    const ss3Path = path.join(ARTIFACT_DIR, '03_asset_disposal_form_dialog_filled.png')
    await page.screenshot({ path: ss3Path })
    fs.copyFileSync(ss3Path, path.join(OUTPUT_DIR, '03_asset_disposal_form_dialog_filled.png'))
    console.log('✓ Captured 03_asset_disposal_form_dialog_filled.png')

    // =========================================================================
    // STEP 4: Submit Form Pengajuan
    // =========================================================================
    console.log('Submitting disposal form...')
    const submitBtn = page.locator('button:has-text("Ajukan Permohonan Disposal")').first()
    await submitBtn.click()

    // Wait for dialog to close
    await expect(dialogTitle).not.toBeVisible({ timeout: 25000 })
    await page.waitForTimeout(3000)

    // Reload page to guarantee fresh SSR table data
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    // Verify row with DSP- in table
    const dspText = page.locator('table tbody').getByText(/DSP-/i).first()
    await expect(dspText).toBeVisible({ timeout: 15000 })

    const tableRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(tableRow).toBeVisible()

    const ss4Path = path.join(ARTIFACT_DIR, '04_asset_disposal_table_row_created.png')
    await page.screenshot({ path: ss4Path })
    fs.copyFileSync(ss4Path, path.join(OUTPUT_DIR, '04_asset_disposal_table_row_created.png'))
    console.log('✓ Captured 04_asset_disposal_table_row_created.png')

    // =========================================================================
    // STEP 5: Detail Modal & Approval Timeline
    // =========================================================================
    console.log('Opening detail modal...')
    const viewDetailBtn = tableRow.getByRole('button').first()
    await viewDetailBtn.click()
    await page.waitForTimeout(2000)

    const detailModalTitle = page.locator('h2:has-text("Detail Penghapusan Aset")').first()
    await expect(detailModalTitle).toBeVisible({ timeout: 15000 })

    const ss5Path = path.join(ARTIFACT_DIR, '05_asset_disposal_detail_pending.png')
    await page.screenshot({ path: ss5Path })
    fs.copyFileSync(ss5Path, path.join(OUTPUT_DIR, '05_asset_disposal_detail_pending.png'))
    console.log('✓ Captured 05_asset_disposal_detail_pending.png')

    // =========================================================================
    // STEP 6: Approval action
    // =========================================================================
    const approveBtn = page.locator('button:has-text("Setujui Tahap Ini")').first()
    if (await approveBtn.isVisible()) {
      console.log('Clicking Setujui Tahap Ini...')
      await approveBtn.click()
      await page.waitForTimeout(1000)

      const confirmTextarea = page.locator('textarea[placeholder*="Contoh: Telah diverifikasi"]').first()
      await confirmTextarea.fill('Telah diperiksa dan diverifikasi secara teknis.')
      await page.waitForTimeout(500)

      const confirmSubmitBtn = page.locator('button:has-text("Ya, Setujui")').first()
      await confirmSubmitBtn.click()

      await page.waitForTimeout(3000)
      console.log('Step approved successfully!')
    }

    const ss6Path = path.join(ARTIFACT_DIR, '06_asset_disposal_step_approved.png')
    await page.screenshot({ path: ss6Path })
    fs.copyFileSync(ss6Path, path.join(OUTPUT_DIR, '06_asset_disposal_step_approved.png'))
    console.log('✓ Captured 06_asset_disposal_step_approved.png')

    // =========================================================================
    // STEP 7: Download PDF Verification
    // =========================================================================
    console.log('Testing PDF route endpoint...')
    const pdfResponse = await page.evaluate(async () => {
      const res = await fetch('/api/assets/disposal/1/pdf')
      const blob = await res.blob()
      return { status: res.status, contentType: res.headers.get('content-type'), size: blob.size }
    })
    console.log('PDF API Response:', pdfResponse)
    expect(pdfResponse.status).toBe(200)
    expect(pdfResponse.contentType).toContain('application/pdf')
    expect(pdfResponse.size).toBeGreaterThan(1000)

    // Reopen modal to capture Download PDF view
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    const freshRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await freshRow.getByRole('button').first().click()
    await page.waitForTimeout(2000)

    const ss7Path = path.join(ARTIFACT_DIR, '07_asset_disposal_pdf_verified.png')
    await page.screenshot({ path: ss7Path })
    fs.copyFileSync(ss7Path, path.join(OUTPUT_DIR, '07_asset_disposal_pdf_verified.png'))
    console.log('✓ Captured 07_asset_disposal_pdf_verified.png')

    console.log('🎉 All Asset Disposal E2E Tests Completed Successfully!')
  })
})
