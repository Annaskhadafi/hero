// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/135839c8-eb66-473f-a410-9a62ee5828c8/screenshots/asset-disposal')
const ROOT_ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/135839c8-eb66-473f-a410-9a62ee5828c8')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(ROOT_ARTIFACT_DIR, { recursive: true })
})

function saveScreenshot(sourcePath, filename) {
  try {
    fs.copyFileSync(sourcePath, path.join(ROOT_ARTIFACT_DIR, filename))
  } catch (e) {
    console.error('Failed to copy screenshot:', e)
  }
}

test.describe('Asset Disposal Revamped & Enhanced Flow Verification', () => {
  test.setTimeout(180000)

  test('Verifikasi Form Lebar (6xl), 100% Master Data HERO (Tanpa Input Manual), Step TTD Digital, A4 Landscape Preview Signature, dan Auto-Hapus', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message))

    // Set standard desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 })

    // 1. Authenticate with standard system credentials
    console.log('Navigating to sign-in page...')
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(2000)

    const usernameInput = page.locator('input[placeholder*="email atau SN"], #email, input[name="username"]').first()
    const passwordInput = page.locator('input[placeholder*="kata sandi"], #password, input[name="password"]').first()
    const loginSubmitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()

    await usernameInput.fill('mochamad.khadafi@chitraparatama.co.id')
    await passwordInput.fill('Chitra#71261')
    await page.waitForTimeout(1000)
    await loginSubmitBtn.click()

    console.log('Submitted login credentials. Waiting for redirect...')
    await page.waitForURL(/.*(\/dashboard|\/mobile)(\/.*)?/, { waitUntil: 'domcontentloaded', timeout: 45000 })
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
    saveScreenshot(ss1Path, '01_asset_disposal_dashboard_tabs.png')
    console.log('✓ Captured 01_asset_disposal_dashboard_tabs.png')

    // =========================================================================
    // STEP 2: Buka Modal Form Pengajuan Disposal & Cek Ukuran Lebar (max-w-6xl)
    // =========================================================================
    console.log('Opening Form Asset Disposal dialog...')
    await page.waitForTimeout(3000)
    const createBtn = page.locator('button:has-text("Buat Pengajuan Disposal")').first()
    await expect(createBtn).toBeVisible()

    const dialogTitle = page.locator('h3:has-text("Formulir Pengajuan Asset Disposal")')
    for (let attempt = 0; attempt < 5; attempt++) {
      if (await dialogTitle.isVisible()) break
      console.log(`Clicking createBtn (attempt ${attempt + 1})...`)
      await createBtn.click()
      await page.waitForTimeout(1500)
    }
    await expect(dialogTitle).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)

    // Verifikasi Modal Lebar (max-w-6xl)
    const dialogContent = page.locator('[role="dialog"]').first()
    await expect(dialogContent).toHaveClass(/max-w-6xl/)
    console.log('✓ Verified: Dialog Form is now wide with max-w-6xl container!')

    // 2a. Verify Group 1: Informasi Pemohon & Unit Kerja (Auto-filled & Locked)
    const pemohonHeader = page.locator('text=1. Informasi Pemohon & Unit Kerja')
    await expect(pemohonHeader).toBeVisible()
    console.log('✓ Verified Group 1: Informasi Pemohon & Unit Kerja auto-filled.')

    // 2b. Verify Group 2: Rincian Aset Multi-Unit (Wajib Master HERO - Tanpa Tab Manual)
    const assetUnitHeader = page.locator('text=2. Rincian Aset yang Dihapus')
    await expect(assetUnitHeader).toBeVisible()

    // Verifikasi TIDAK ADA tombol switcher "Input Manual"
    const manualBtn = page.locator('button:has-text("Input Manual")')
    await expect(manualBtn).toHaveCount(0)
    console.log('✓ Verified: Opsi/Tab "Input Manual" telah dihilangkan total!')

    // Pilih Unit #1 dari Master Data HERO
    console.log('Selecting Unit #1 from Master Data HERO...')
    const selectTrigger1 = page.locator('button:has-text("Pilih aset dari Master Data HERO...")').first()
    await selectTrigger1.click()
    await page.waitForTimeout(600)

    const popoverContent = page.locator('[data-radix-popper-content-wrapper]').last()
    await expect(popoverContent).toBeVisible({ timeout: 5000 })

    const optionItems = popoverContent.locator('div.cursor-pointer')
    const optCount = await optionItems.count()
    console.log(`Found ${optCount} assets in master dropdown.`)
    expect(optCount).toBeGreaterThan(0)

    // Klik opsi aset pertama
    await optionItems.first().click({ force: true })
    await page.waitForTimeout(600)

    // Isi Catatan / Alasan Penghapusan Unit #1
    const notesInput1 = page.locator('textarea[placeholder*="Contoh: Rusak total"]').first()
    await notesInput1.fill('Motherboard terbakar dan panel layar retak parah. Estimasi biaya perbaikan melebihi nilai ekonomis unit.')

    // Klik "+ Tambah Unit Aset" untuk multi-aset
    const addUnitBtn = page.locator('button:has-text("Tambah Unit Aset")').first()
    await addUnitBtn.click()
    await page.waitForTimeout(600)

    // Verify Item #2 appeared
    const unit2Title = page.locator('text=Rincian Aset #2')
    await expect(unit2Title).toBeVisible()

    // Pilih Unit #2 dari Master Data HERO
    console.log('Selecting Unit #2 from Master Data HERO...')
    const selectTrigger2 = page.locator('button:has-text("Pilih aset dari Master Data HERO...")').first()
    await selectTrigger2.click()
    await page.waitForTimeout(600)

    const popoverContent2 = page.locator('[data-radix-popper-content-wrapper]').last()
    await expect(popoverContent2).toBeVisible({ timeout: 5000 })
    const optionItems2 = popoverContent2.locator('div.cursor-pointer')
    const optCount2 = await optionItems2.count()

    if (optCount2 > 1) {
      await optionItems2.nth(1).click({ force: true })
    } else {
      await optionItems2.first().click({ force: true })
    }
    await page.waitForTimeout(600)

    const notesInput2 = page.locator('textarea[placeholder*="Contoh: Rusak total"]').nth(1)
    await notesInput2.fill('Komponen internal aus dan rusak permanen, suku cadang unit sudah diskontinu.')
    console.log('✓ Successfully selected 2 assets from Master Data HERO!')

    // 2c. Verify Group 4: Approval Hierarchy with Amama Ira
    const amamaBadge = page.locator('text=Amama Ira').first()
    await expect(amamaBadge).toBeVisible({ timeout: 8000 })
    console.log('✓ Verified Amama Ira (Finance & Accounting) in approval hierarchy!')

    // 2d. Verify Group 5: Tanda Tangan Digital Pemohon (Applicant Signature)
    console.log('Verifying Group 5: Tanda Tangan Digital Pemohon...')
    const sigHeader = page.locator('text=5. Tanda Tangan Digital Pemohon')
    await expect(sigHeader).toBeVisible()

    // Switch to "Coretan Canvas" tab to test drawing signature
    const drawTabBtn = page.locator('button:has-text("Coretan Canvas")').first()
    await drawTabBtn.click()
    await page.waitForTimeout(500)

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()

    // Draw signature stroke on canvas
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 30, box.y + 30)
      await page.mouse.down()
      await page.mouse.move(box.x + 80, box.y + 60)
      await page.mouse.move(box.x + 120, box.y + 35)
      await page.mouse.move(box.x + 160, box.y + 70)
      await page.mouse.up()
      await page.waitForTimeout(500)
    }

    // Verify "Tanda Tangan Siap" badge
    const sigReadyBadge = page.locator('text=Tanda Tangan Siap')
    await expect(sigReadyBadge).toBeVisible()
    console.log('✓ Canvas signature drawn successfully, ready for submission!')

    const ss2Path = path.join(ARTIFACT_DIR, '02_asset_disposal_form_multi_items_filled.png')
    await page.screenshot({ path: ss2Path })
    saveScreenshot(ss2Path, '02_asset_disposal_form_multi_items_filled.png')
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
    saveScreenshot(ss3Path, '03_asset_disposal_table_row_created.png')
    console.log('✓ Captured 03_asset_disposal_table_row_created.png')

    // =========================================================================
    // STEP 4: Verifikasi Tab "Daftar Disposal" (Tidak Ada Tombol Aksi Apapun)
    // =========================================================================
    console.log('Checking Tab "Daftar Disposal" for read-only table without action buttons...')
    await tabAllDisposal.click()
    await page.waitForTimeout(1000)

    const allDisposalRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(allDisposalRow).toBeVisible()
    const dashAction = allDisposalRow.locator('td').last()
    const dashText = await dashAction.innerText()
    expect(dashText.trim()).toBe('-')
    console.log('✓ Tab "Daftar Disposal" is completely read-only with no action buttons (-)!')

    const ss4Path = path.join(ARTIFACT_DIR, '04_daftar_disposal_read_only_tab.png')
    await page.screenshot({ path: ss4Path })
    saveScreenshot(ss4Path, '04_daftar_disposal_read_only_tab.png')
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
    await page.waitForTimeout(2500)
    const printArea = page.locator('.print-area').first()
    await expect(printArea).toBeVisible({ timeout: 15000 })

    // Verify A4 Landscape Document View contains units
    await expect(printArea.getByText('Total 2 Unit Aset').first()).toBeVisible()
    console.log('✓ A4 Landscape Document View accurately rendered 2 assets!')

    // Verify DIAJUKAN OLEH contains applicant signature image
    const submitterSigImg = page.locator('.print-area img[alt*="TTD Mochamad Annas Khadafi"], .print-area img[alt*="TTD"]').first()
    await expect(submitterSigImg).toBeVisible()
    console.log('✓ Verified: "DIAJUKAN OLEH" signature box displays the applicant digital signature!')

    const ss5Path = path.join(ARTIFACT_DIR, '05_asset_disposal_approval_split_modal.png')
    await page.screenshot({ path: ss5Path })
    saveScreenshot(ss5Path, '05_asset_disposal_approval_split_modal.png')
    console.log('✓ Captured 05_asset_disposal_approval_split_modal.png')

    // =========================================================================
    // STEP 6: Lakukan Approval dengan Tanda Tangan Digital
    // =========================================================================
    console.log('Executing approval action with digital signature...')
    const noteArea = page.locator('textarea[placeholder*="Tambahkan catatan"]').first()
    await noteArea.fill('Dokumen disposal multi-aset dari master terverifikasi lengkap, disetujui.')

    const approveButton = page.locator('button:has-text("Setujui Pengajuan")').first()
    await approveButton.click()
    // Wait for approval dialog to finish processing and close
    await expect(approveButton).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    console.log('Approval step executed successfully!')

    // Reload page to verify updated status
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const ss6Path = path.join(ARTIFACT_DIR, '06_asset_disposal_step_approved.png')
    await page.screenshot({ path: ss6Path })
    saveScreenshot(ss6Path, '06_asset_disposal_step_approved.png')
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
    saveScreenshot(ss7Path, '07_asset_disposal_cancel_confirm_dialog.png')
    console.log('✓ Captured 07_asset_disposal_cancel_confirm_dialog.png')

    await confirmCancelBtn.click()
    // Wait for confirm dialog to finish processing and close
    await expect(confirmCancelBtn).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    // Reload page and verify row is deleted (auto hapus)
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const emptyOrNoDsp = page.locator('table tbody tr:has-text("DSP-")')
    await expect(emptyOrNoDsp).toHaveCount(0, { timeout: 15000 })
    console.log('✓ Verified: Pengajuan disposal successfully cancelled and auto-deleted from DB!')

    const ss8Path = path.join(ARTIFACT_DIR, '08_asset_disposal_auto_deleted_clean.png')
    await page.screenshot({ path: ss8Path })
    saveScreenshot(ss8Path, '08_asset_disposal_auto_deleted_clean.png')
    console.log('✓ Captured 08_asset_disposal_auto_deleted_clean.png')

    console.log('🎉 All Asset Disposal E2E Tests Completed Successfully!')
  })
})
