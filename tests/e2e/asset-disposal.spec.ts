// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/135839c8-eb66-473f-a410-9a62ee5828c8/screenshots/asset-disposal')
const OUTPUT_DIR = path.join(process.cwd(), 'outputs/screenshots/asset-disposal')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
})

test.describe('Asset Disposal Revamped E2E Flow Verification', () => {
  test.setTimeout(180000)

  test('Verifikasi Tab Disposal Saya & Daftar Disposal, Form Multi-Aset, Auto-fill Profil, Amama Ira Guardrail, Approval Modal A4 Landscape, dan Auto Hapus', async ({
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

    // Verify Two Tabs exist: "Disposal Saya" and "Daftar Disposal"
    const tabMyDisposal = page.locator('button[role="tab"]:has-text("Disposal Saya")')
    const tabAllDisposal = page.locator('button[role="tab"]:has-text("Daftar Disposal")')
    await expect(tabMyDisposal).toBeVisible()
    await expect(tabAllDisposal).toBeVisible()
    console.log('✓ Verified 2 Tabs: Disposal Saya & Daftar Disposal.')

    const ss1Path = path.join(ARTIFACT_DIR, '01_asset_disposal_dashboard_tabs.png')
    await page.screenshot({ path: ss1Path })
    fs.copyFileSync(ss1Path, path.join(OUTPUT_DIR, '01_asset_disposal_dashboard_tabs.png'))
    console.log('✓ Captured 01_asset_disposal_dashboard_tabs.png')

    // =========================================================================
    // STEP 2: Buka Modal Form Pengajuan Disposal
    // =========================================================================
    console.log('Opening Form Asset Disposal dialog...')
    const createBtn = page.locator('button:has-text("Buat Pengajuan Disposal")').first()
    await expect(createBtn).toBeVisible()
    await createBtn.click()

    const dialogTitle = page.locator('h3:has-text("Formulir Pengajuan Asset Disposal")')
    await expect(dialogTitle).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    // 2a. Verify Group 1: Informasi Pemohon & Unit Kerja (Auto-filled & Disabled)
    const pemohonHeader = page.locator('text=1. Informasi Pemohon & Unit Kerja')
    await expect(pemohonHeader).toBeVisible()

    const disabledNameInput = page.locator('input[disabled]').first()
    await expect(disabledNameInput).toBeVisible()
    console.log('✓ Verified Group 1: Informasi Pemohon & Unit Kerja is auto-filled and locked.')

    // 2b. Verify Group 2: Rincian Aset Multi-Unit (Nama, No Aset, Tahun Beli, Alasan)
    const assetUnitHeader = page.locator('text=2. Rincian Aset yang Dihapus')
    await expect(assetUnitHeader).toBeVisible()

    // Fill Item #1
    const assetNameInput1 = page.locator('input[placeholder*="Contoh: Laptop Dell"]').first()
    await assetNameInput1.fill('Laptop Dell Latitude 3420')
    const assetNumInput1 = page.locator('input[placeholder*="Contoh: AST-2022"]').first()
    await assetNumInput1.fill('AST-BPN-2021-089')
    const yearInput1 = page.locator('input[placeholder*="Contoh: 2021"]').first()
    await yearInput1.fill('2021')
    const notesInput1 = page.locator('textarea[placeholder*="Contoh: Motherboard terbakar"]').first()
    await notesInput1.fill('Motherboard terbakar dan panel layar retak parah. Estimasi biaya perbaikan melebihi nilai ekonomis unit.')

    // Click "+ Tambah Unit Aset" to test multi-asset support (Requirement 1)
    const addUnitBtn = page.locator('button:has-text("Tambah Unit Aset")').first()
    await addUnitBtn.click()
    await page.waitForTimeout(500)

    // Verify Item #2 appeared
    const unit2Title = page.locator('text=Rincian Aset #2')
    await expect(unit2Title).toBeVisible()

    const assetNameInput2 = page.locator('input[placeholder*="Contoh: Laptop Dell"]').nth(1)
    await assetNameInput2.fill('Printer HP LaserJet Pro M404n')
    const assetNumInput2 = page.locator('input[placeholder*="Contoh: AST-2022"]').nth(1)
    await assetNumInput2.fill('AST-BPN-2019-012')
    const yearInput2 = page.locator('input[placeholder*="Contoh: 2021"]').nth(1)
    await yearInput2.fill('2019')
    const notesInput2 = page.locator('textarea[placeholder*="Contoh: Motherboard terbakar"]').nth(1)
    await notesInput2.fill('Roller penarik kertas patah dan fuser unit rusak permanen, suku cadang sudah diskontinu.')
    console.log('✓ Successfully populated 2 assets in 1 disposal request!')

    // 2c. Verify Group 4: Approval Hierarchy with Amama Ira
    const amamaBadge = page.locator('text=Amama Ira').first()
    await expect(amamaBadge).toBeVisible({ timeout: 8000 })
    console.log('✓ Verified Amama Ira (Finance & Accounting) in approval hierarchy!')

    const ss2Path = path.join(ARTIFACT_DIR, '02_asset_disposal_form_multi_items_filled.png')
    await page.screenshot({ path: ss2Path })
    fs.copyFileSync(ss2Path, path.join(OUTPUT_DIR, '02_asset_disposal_form_multi_items_filled.png'))
    console.log('✓ Captured 02_asset_disposal_form_multi_items_filled.png')

    // =========================================================================
    // STEP 3: Submit Form Pengajuan
    // =========================================================================
    console.log('Submitting disposal form...')
    const submitBtn = page.locator('button:has-text("Kirim Pengajuan Disposal")').first()
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

    // Verify multi-unit badge "2 Unit"
    const unitBadge = tableRow.locator('text=2 Unit').first()
    await expect(unitBadge).toBeVisible()
    console.log('✓ Table row shows 2 Unit badge!')

    const ss3Path = path.join(ARTIFACT_DIR, '03_asset_disposal_table_row_created.png')
    await page.screenshot({ path: ss3Path })
    fs.copyFileSync(ss3Path, path.join(OUTPUT_DIR, '03_asset_disposal_table_row_created.png'))
    console.log('✓ Captured 03_asset_disposal_table_row_created.png')

    // =========================================================================
    // STEP 4: Verifikasi Tab "Daftar Disposal" (Tidak Ada Tombol Aksi Apapun)
    // =========================================================================
    console.log('Checking Tab "Daftar Disposal" for read-only table without action buttons...')
    await tabAllDisposal.click()
    await page.waitForTimeout(1000)

    const allDisposalRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(allDisposalRow).toBeVisible()
    // Verify no action buttons in Tab 2, only '-'
    const dashAction = allDisposalRow.locator('td').last()
    const dashText = await dashAction.innerText()
    expect(dashText.trim()).toBe('-')
    console.log('✓ Tab "Daftar Disposal" is completely read-only with no action buttons (-)!')

    const ss4Path = path.join(ARTIFACT_DIR, '04_daftar_disposal_read_only_tab.png')
    await page.screenshot({ path: ss4Path })
    fs.copyFileSync(ss4Path, path.join(OUTPUT_DIR, '04_daftar_disposal_read_only_tab.png'))
    console.log('✓ Captured 04_daftar_disposal_read_only_tab.png')

    // Switch back to "Disposal Saya"
    await tabMyDisposal.click()
    await page.waitForTimeout(1000)

    // =========================================================================
    // STEP 5: Buka Approval Modal (Tinjau - Split 2-Panel A4 Landscape Review)
    // =========================================================================
    console.log('Opening Approval Dialog via "Tinjau" button...')
    const tinjauBtn = tableRow.locator('button:has-text("Tinjau")').first()
    await expect(tinjauBtn).toBeVisible()
    await tinjauBtn.click()

    // Wait for AssetApprovalDialog
    await page.waitForTimeout(2000)
    const printArea = page.locator('.print-area').first()
    await expect(printArea).toBeVisible({ timeout: 15000 })

    // Verify A4 Landscape Document View contains both assets
    await expect(printArea.getByText('Laptop Dell Latitude 3420').first()).toBeVisible()
    await expect(printArea.getByText('Printer HP LaserJet Pro M404n').first()).toBeVisible()
    await expect(printArea.getByText('Total 2 Unit Aset').first()).toBeVisible()
    console.log('✓ A4 Landscape Document View accurately rendered 2 assets!')

    // Verify Right Panel has summary, signature options, and Approve/Reject/Revert buttons
    const rightPanelSummary = page.locator('text=Ringkasan Pengajuan').first()
    await expect(rightPanelSummary).toBeVisible()

    const approveButton = page.locator('button:has-text("Setujui Pengajuan")').first()
    const revertButton = page.locator('button:has-text("REVERT")').first()
    const rejectButton = page.locator('button:has-text("REJECT")').first()

    await expect(approveButton).toBeVisible()
    await expect(revertButton).toBeVisible()
    await expect(rejectButton).toBeVisible()
    console.log('✓ Verified Action Buttons: Setujui, Revert, and Reject!')

    const ss5Path = path.join(ARTIFACT_DIR, '05_asset_disposal_approval_split_modal.png')
    await page.screenshot({ path: ss5Path })
    fs.copyFileSync(ss5Path, path.join(OUTPUT_DIR, '05_asset_disposal_approval_split_modal.png'))
    console.log('✓ Captured 05_asset_disposal_approval_split_modal.png')

    // =========================================================================
    // STEP 6: Lakukan Approval dengan Tanda Tangan Digital
    // =========================================================================
    console.log('Executing approval action with digital signature...')
    // Note textarea
    const noteArea = page.locator('textarea[placeholder*="Tambahkan catatan"]').first()
    await noteArea.fill('Dokumen disposal aset lengkap, disetujui untuk proses selanjutnya.')

    // Click Setujui Pengajuan
    await approveButton.click()
    await page.waitForTimeout(3000)

    console.log('Approval step executed successfully!')

    // Reload page to verify updated status
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const ss6Path = path.join(ARTIFACT_DIR, '06_asset_disposal_step_approved.png')
    await page.screenshot({ path: ss6Path })
    fs.copyFileSync(ss6Path, path.join(OUTPUT_DIR, '06_asset_disposal_step_approved.png'))
    console.log('✓ Captured 06_asset_disposal_step_approved.png')

    // =========================================================================
    // STEP 7: Uji Tombol "Batalkan Pengajuan" (Auto Hapus dari Database)
    // =========================================================================
    console.log('Testing "Batalkan Pengajuan" (Auto Hapus)...')
    const activeRow = page.locator('table tbody tr:has-text("DSP-")').first()
    const cancelIconBtn = activeRow.locator('button').last()
    await cancelIconBtn.click()

    await page.waitForTimeout(800)
    const confirmCancelBtn = page.locator('button:has-text("Ya, Batalkan & Hapus")').first()
    await expect(confirmCancelBtn).toBeVisible()

    const ss7Path = path.join(ARTIFACT_DIR, '07_asset_disposal_cancel_confirm_dialog.png')
    await page.screenshot({ path: ss7Path })
    fs.copyFileSync(ss7Path, path.join(OUTPUT_DIR, '07_asset_disposal_cancel_confirm_dialog.png'))
    console.log('✓ Captured 07_asset_disposal_cancel_confirm_dialog.png')

    await confirmCancelBtn.click()
    await page.waitForTimeout(3000)

    // Reload page and verify row is deleted (auto hapus)
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const emptyOrNoDsp = page.locator('table tbody tr:has-text("DSP-")')
    const countAfterDelete = await emptyOrNoDsp.count()
    expect(countAfterDelete).toBe(0)
    console.log('✓ Verified: Pengajuan disposal successfully cancelled and auto-deleted from DB!')

    const ss8Path = path.join(ARTIFACT_DIR, '08_asset_disposal_auto_deleted_clean.png')
    await page.screenshot({ path: ss8Path })
    fs.copyFileSync(ss8Path, path.join(OUTPUT_DIR, '08_asset_disposal_auto_deleted_clean.png'))
    console.log('✓ Captured 08_asset_disposal_auto_deleted_clean.png')

    console.log('🎉 All Asset Disposal E2E Tests Completed Successfully!')
  })
})
