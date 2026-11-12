// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/holder-and-transfer')
const OUTPUT_DIR = path.join(process.cwd(), 'outputs/screenshots/holder-and-transfer')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  try {
    execSync('node ./node_modules/tsx/dist/cli.mjs scripts/seed-test-transfer.ts', { stdio: 'inherit' })
  } catch (err) {
    console.error('Seed test transfer error:', err)
  }
})

test.describe('Holder Central Service & Asset Transfer 3-Step Approval E2E', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(180000)

  test.beforeEach(async ({ page }) => {
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
      await page.waitForURL(/.*\/dashboard.*/, { timeout: 30000 })
      await page.waitForTimeout(1000)
    }
  })

  test('1. Verifikasi Kolom Holder dan Dropdown Pemegang pada Central Service Assets', async ({ page }) => {
    // 1. Go to Central Service Assets
    await page.goto('/dashboard/central-service/assets')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // Verify page title specifically
    await expect(page.getByRole('heading', { name: /Asset Management/i }).first()).toBeVisible({ timeout: 20000 })

    // Verify column header "Pemegang (Holder)" exists
    const holderHeader = page.locator('th, button').filter({ hasText: /Pemegang.*Holder/i }).first()
    await expect(holderHeader).toBeVisible({ timeout: 10000 })

    // Verify filter dropdown for holder exists
    const holderFilter = page.locator('button, [role="combobox"]').filter({ hasText: /Semua Pemegang/i }).first()
    await expect(holderFilter).toBeVisible({ timeout: 10000 })

    // Screenshot table view with holder column
    const ssTableOutput = path.join(OUTPUT_DIR, '01_cs_assets_table_holder_column.png')
    const ssTableArtifact = path.join(ARTIFACT_DIR, '01_cs_assets_table_holder_column.png')
    await page.screenshot({ path: ssTableOutput, fullPage: false })
    fs.copyFileSync(ssTableOutput, ssTableArtifact)
    console.log('📸 Screenshot saved: 01_cs_assets_table_holder_column.png')

    // Open "Tambah Asset Baru" dialog
    const tambahBtn = page.getByRole('button', { name: /Tambah/i }).first()
    await tambahBtn.click()
    await page.waitForTimeout(1000)

    // Verify Dialog title
    await expect(page.locator('text=Tambah Asset Baru')).toBeVisible({ timeout: 10000 })

    // Verify field "Pemegang Aset (Holder)" exists
    await expect(page.locator('text=Pemegang Aset (Holder)')).toBeVisible({ timeout: 10000 })

    // Screenshot form dialog with holder field
    const ssDialogOutput = path.join(OUTPUT_DIR, '02_cs_assets_form_holder_field.png')
    const ssDialogArtifact = path.join(ARTIFACT_DIR, '02_cs_assets_form_holder_field.png')
    await page.screenshot({ path: ssDialogOutput, fullPage: false })
    fs.copyFileSync(ssDialogOutput, ssDialogArtifact)
    console.log('📸 Screenshot saved: 02_cs_assets_form_holder_field.png')
  })

  test('2. Verifikasi Form Asset Transfer dengan Auto-Fill Holder & Alur Approval 3-Tahap', async ({ page }) => {
    // 1. Go to Asset Transfer
    await page.goto('/dashboard/assets/transfer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // Open Form Transfer Dialog
    const createBtn = page.getByRole('button', { name: /Buat Transfer Aset/i })
    await createBtn.click()
    await page.waitForTimeout(1000)

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 10000 })

    // Verify Section 4: Serah Terima & Persetujuan Holder
    await expect(page.locator('text=4. Serah Terima & Persetujuan Holder')).toBeVisible({ timeout: 10000 })

    // Verify Direct Superior approver fields inside Pihak Asal and Pihak Penerima
    await expect(page.locator('text=Atasan Langsung (Approval Pelepasan Aset)')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Atasan Langsung (Approval Penerimaan Aset)')).toBeVisible({ timeout: 10000 })

    // Verify Section 5: Catatan Tambahan
    await expect(page.locator('text=5. Catatan Tambahan (Additional Note)')).toBeVisible({ timeout: 10000 })

    // Screenshot form dialog with simplified layout
    const ssApprovalOutput = path.join(OUTPUT_DIR, '03_transfer_form_simplified_approvals.png')
    const ssApprovalArtifact = path.join(ARTIFACT_DIR, '03_transfer_form_simplified_approvals.png')
    await page.screenshot({ path: ssApprovalOutput, fullPage: false })
    fs.copyFileSync(ssApprovalOutput, ssApprovalArtifact)
    console.log('📸 Screenshot saved: 03_transfer_form_simplified_approvals.png')
  })

  test('3. Verifikasi Judul Halaman Asset Transfer & Modal Setuju/Tolak dengan Catatan Wajib', async ({ page }) => {
    // 1. Go to Asset Transfer
    await page.goto('/dashboard/assets/transfer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // Verify Page Title is 'Asset Transfer'
    const pageHeading = page.getByRole('heading', { name: /^Asset Transfer$/i })
    await expect(pageHeading).toBeVisible({ timeout: 10000 })

    // Verify browser tab title
    expect(await page.title()).toContain('Asset Transfer')

    // Screenshot page with new title
    const ssPageTitleOutput = path.join(OUTPUT_DIR, '04_asset_transfer_page_title.png')
    const ssPageTitleArtifact = path.join(ARTIFACT_DIR, '04_asset_transfer_page_title.png')
    await page.screenshot({ path: ssPageTitleOutput, fullPage: false })
    fs.copyFileSync(ssPageTitleOutput, ssPageTitleArtifact)
    console.log('📸 Screenshot saved: 04_asset_transfer_page_title.png')

    // 2. Search for TRF-202611-0001 (Step 1 approval) to verify "Setujui" button & required note
    const searchInput = page.getByPlaceholder(/Cari no dokumen/i)
    await searchInput.fill('TRF-202611-0001')
    await page.waitForTimeout(1000)

    const viewDetailBtn = page.locator('button').filter({ has: page.locator('svg.lucide-eye') }).first()
    await expect(viewDetailBtn).toBeVisible({ timeout: 10000 })
    await viewDetailBtn.click()
    await page.waitForTimeout(1000)

    // Verify Detail Modal is open
    const detailModal = page.locator('[role="dialog"]').filter({ hasText: /Detail Dokumen: TRF-202611-0001/i })
    await expect(detailModal).toBeVisible({ timeout: 10000 })

    // Verify Approver Actions (Setuju & Tolak) are visible for Super Admin / Approver
    const approveBtn = detailModal.getByRole('button', { name: /Setujui/i })
    const rejectBtn = detailModal.getByRole('button', { name: /Tolak/i })
    await expect(approveBtn).toBeVisible({ timeout: 10000 })
    await expect(rejectBtn).toBeVisible({ timeout: 10000 })

    // 3. Test Approve Dialog & Required Note validation
    await approveBtn.click()
    await page.waitForTimeout(500)

    const approveConfirmDialog = page.locator('[role="dialog"]').filter({ hasText: /Setujui Pengajuan Transfer Aset/i })
    await expect(approveConfirmDialog).toBeVisible({ timeout: 10000 })

    // Verify submit button is disabled initially when note is empty
    const confirmApproveSubmit = approveConfirmDialog.getByRole('button', { name: /Ya, Setujui/i })
    await expect(confirmApproveSubmit).toBeDisabled()

    // Fill Catatan Persetujuan
    const approveNoteInput = approveConfirmDialog.getByPlaceholder(/Tulis catatan persetujuan/i)
    await approveNoteInput.fill('Disetujui serah terima fisik aset dalam kondisi lengkap dan baik.')
    await expect(confirmApproveSubmit).toBeEnabled()

    // Screenshot Approve Dialog with Note
    const ssApproveOutput = path.join(OUTPUT_DIR, '05_approve_dialog_with_required_note.png')
    const ssApproveArtifact = path.join(ARTIFACT_DIR, '05_approve_dialog_with_required_note.png')
    await page.screenshot({ path: ssApproveOutput, fullPage: false })
    fs.copyFileSync(ssApproveOutput, ssApproveArtifact)
    console.log('📸 Screenshot saved: 05_approve_dialog_with_required_note.png')

    // Cancel approve dialog
    await approveConfirmDialog.getByRole('button', { name: /Batal/i }).click()
    await page.waitForTimeout(500)

    // 4. Test Reject Dialog & Required Reason validation
    await rejectBtn.click()
    await page.waitForTimeout(500)

    const rejectConfirmDialog = page.locator('[role="dialog"]').filter({ hasText: /Tolak Pengajuan Transfer Aset/i })
    await expect(rejectConfirmDialog).toBeVisible({ timeout: 10000 })

    const confirmRejectSubmit = rejectConfirmDialog.getByRole('button', { name: /Ya, Tolak Transfer/i })
    await expect(confirmRejectSubmit).toBeDisabled()

    // Fill Alasan Penolakan
    const rejectReasonInput = rejectConfirmDialog.getByPlaceholder(/Tulis alasan penolakan/i)
    await rejectReasonInput.fill('Penolakan sementara: Unit masih aktif digunakan untuk proyek operasional.')
    await expect(confirmRejectSubmit).toBeEnabled()

    // Screenshot Reject Dialog with Reason
    const ssRejectOutput = path.join(OUTPUT_DIR, '06_reject_dialog_with_required_reason.png')
    const ssRejectArtifact = path.join(ARTIFACT_DIR, '06_reject_dialog_with_required_reason.png')
    await page.screenshot({ path: ssRejectOutput, fullPage: false })
    fs.copyFileSync(ssRejectOutput, ssRejectArtifact)
    console.log('📸 Screenshot saved: 06_reject_dialog_with_required_reason.png')

    // Cancel reject dialog
    await rejectConfirmDialog.getByRole('button', { name: /Batal/i }).click()
    await page.waitForTimeout(500)
  })

  test('4. Verifikasi Aksi Batalkan Pengajuan (Hard Delete) oleh Pembuat/Admin', async ({ page }) => {
    // 1. Go to Asset Transfer
    await page.goto('/dashboard/assets/transfer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // Open first transfer row detail
    const firstRowDetailBtn = page.locator('button').filter({ has: page.locator('svg.lucide-eye') }).first()
    await expect(firstRowDetailBtn).toBeVisible({ timeout: 10000 })
    await firstRowDetailBtn.click()
    await page.waitForTimeout(1000)

    const detailModal = page.locator('[role="dialog"]').filter({ hasText: /Detail Dokumen:/i })
    await expect(detailModal).toBeVisible({ timeout: 10000 })

    // Verify "Batalkan Pengajuan" button is visible
    const cancelTransferBtn = detailModal.getByRole('button', { name: /Batalkan Pengajuan/i })
    await expect(cancelTransferBtn).toBeVisible({ timeout: 10000 })

    // Click "Batalkan Pengajuan"
    await cancelTransferBtn.click()
    await page.waitForTimeout(500)

    // Verify Cancel Confirmation Dialog is visible
    const cancelConfirmDialog = page.locator('[role="dialog"]').filter({ hasText: /Batalkan dan Hapus Pengajuan\?/i })
    await expect(cancelConfirmDialog).toBeVisible({ timeout: 10000 })
    await expect(cancelConfirmDialog.locator('text=Pengajuan akan langsung dihapus permanen dari sistem.')).toBeVisible()

    // Screenshot Cancel Confirmation Dialog
    const ssCancelOutput = path.join(OUTPUT_DIR, '07_cancel_dialog_hard_delete.png')
    const ssCancelArtifact = path.join(ARTIFACT_DIR, '07_cancel_dialog_hard_delete.png')
    await page.screenshot({ path: ssCancelOutput, fullPage: false })
    fs.copyFileSync(ssCancelOutput, ssCancelArtifact)
    console.log('📸 Screenshot saved: 07_cancel_dialog_hard_delete.png')

    // Click "Batal" so we don't accidentally delete production/seed data prematurely
    await cancelConfirmDialog.getByRole('button', { name: 'Batal', exact: true }).click()
    await page.waitForTimeout(500)
  })
  test('5. Verifikasi Tahap Approval Holder Baru: Tombol Diterima dan Form Upload Foto Penerimaan', async ({ page }) => {
    // 1. Go to Asset Transfer
    await page.goto('/dashboard/assets/transfer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // Search for TRF-202611-0003 (Step 2: New Holder approval)
    const searchInput = page.getByPlaceholder(/Cari no dokumen/i)
    await searchInput.fill('TRF-202611-0003')
    await page.waitForTimeout(1000)

    // Open detail of TRF-202611-0003
    const viewDetailBtn = page.locator('button').filter({ has: page.locator('svg.lucide-eye') }).first()
    await expect(viewDetailBtn).toBeVisible({ timeout: 10000 })
    await viewDetailBtn.click()
    await page.waitForTimeout(1000)

    const detailModal = page.locator('[role="dialog"]').filter({ hasText: /Detail Dokumen: TRF-202611-0003/i })
    await expect(detailModal).toBeVisible({ timeout: 10000 })

    // Verify button is "Diterima" (NOT "Setujui") on Holder Baru step
    const terimaBtn = detailModal.getByRole('button', { name: /Diterima/i })
    await expect(terimaBtn).toBeVisible({ timeout: 10000 })

    const setujuBtn = detailModal.getByRole('button', { name: /^Setujui$/i })
    await expect(setujuBtn).not.toBeVisible()

    // Screenshot Detail Modal with "Diterima" button
    const ssTerimaBtnOutput = path.join(OUTPUT_DIR, '08_new_holder_button_diterima.png')
    const ssTerimaBtnArtifact = path.join(ARTIFACT_DIR, '08_new_holder_button_diterima.png')
    await page.screenshot({ path: ssTerimaBtnOutput, fullPage: false })
    fs.copyFileSync(ssTerimaBtnOutput, ssTerimaBtnArtifact)
    console.log('📸 Screenshot saved: 08_new_holder_button_diterima.png')

    // Click "Diterima" to open receipt confirmation dialog
    await terimaBtn.click()
    await page.waitForTimeout(500)

    // Verify Receipt Confirmation Dialog
    const receiveConfirmDialog = page.locator('[role="dialog"]').filter({ hasText: /Konfirmasi Penerimaan Aset Fisik/i })
    await expect(receiveConfirmDialog).toBeVisible({ timeout: 10000 })

    // Verify Required Field "Catatan Penerimaan Aset *" exists
    await expect(receiveConfirmDialog.locator('text=Catatan Penerimaan Aset')).toBeVisible()

    // Verify File Upload field for "Foto Kondisi Fisik Saat Diterima" exists
    await expect(receiveConfirmDialog.locator('text=Foto Kondisi Fisik Saat Diterima (Opsional)')).toBeVisible()
    await expect(receiveConfirmDialog.locator('text=Unggah Foto Fisik Saat Diterima')).toBeVisible()

    // Verify confirm button is disabled initially
    const confirmReceiveBtn = receiveConfirmDialog.getByRole('button', { name: /Konfirmasi Penerimaan/i })
    await expect(confirmReceiveBtn).toBeDisabled()

    // Fill Catatan Penerimaan
    const noteInput = receiveConfirmDialog.getByPlaceholder(/Aset fisik dan kelengkapan telah diterima/i)
    await noteInput.fill('Aset fisik laptop dan kelengkapan telah diterima langsung oleh pemegang baru dalam kondisi lengkap dan berfungsi baik.')
    await expect(confirmReceiveBtn).toBeEnabled()

    // Screenshot Confirmation Dialog with Photo Upload field
    const ssReceiveModalOutput = path.join(OUTPUT_DIR, '09_modal_penerimaan_foto_upload.png')
    const ssReceiveModalArtifact = path.join(ARTIFACT_DIR, '09_modal_penerimaan_foto_upload.png')
    await page.screenshot({ path: ssReceiveModalOutput, fullPage: false })
    fs.copyFileSync(ssReceiveModalOutput, ssReceiveModalArtifact)
    console.log('📸 Screenshot saved: 09_modal_penerimaan_foto_upload.png')

    // Click Batal to keep dialog state clean
    await receiveConfirmDialog.getByRole('button', { name: 'Batal', exact: true }).click()
    await page.waitForTimeout(500)
  })
})
