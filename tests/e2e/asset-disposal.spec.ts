// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { assetDisposals } from '../../db/schema/asset-disposal'
import { approvals } from '../../db/schema/hero'
import { eq } from 'drizzle-orm'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/135839c8-eb66-473f-a410-9a62ee5828c8/screenshots/asset-disposal')
const ROOT_ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/135839c8-eb66-473f-a410-9a62ee5828c8')

test.beforeAll(async () => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(ROOT_ARTIFACT_DIR, { recursive: true })

  // Clean old test disposal records
  try {
    const existing = await db.select({ id: assetDisposals.id }).from(assetDisposals)
    for (const d of existing) {
      await db.delete(approvals).where(eq(approvals.assetDisposalId, d.id))
      await db.delete(assetDisposals).where(eq(assetDisposals.id, d.id))
    }
    console.log('✓ Cleaned up old asset disposal records from DB.')
  } catch (err) {
    console.error('Error cleaning up disposals in beforeAll:', err)
  }
})

function saveScreenshot(sourcePath, filename) {
  try {
    fs.copyFileSync(sourcePath, path.join(ROOT_ARTIFACT_DIR, filename))
  } catch (e) {
    console.error('Failed to copy screenshot:', e)
  }
}

test.describe('Asset Disposal Sale Workflow: Procurement & Finance Stages', () => {
  test.setTimeout(240000)

  test('Verifikasi Alur Lengkap Disposal Penjualan: Estimasi Procurement, Lelang, & Dokumen Finance', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message))

    // Standard desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 })

    // 1. Authenticate with standard system credentials and target callbackUrl
    console.log('Navigating to sign-in page with callbackUrl...')
    await page.goto('/sign-in?callbackUrl=/dashboard/assets/disposal')
    await page.waitForLoadState('domcontentloaded')

    const usernameInput = page.locator('#email, input[placeholder*="email atau SN"], input[name="username"]').first()
    await usernameInput.waitFor({ state: 'visible', timeout: 20000 })
    await usernameInput.fill('mochamad.khadafi@chitraparatama.co.id')
    const passwordInput = page.locator('#password, input[placeholder*="kata sandi"], input[name="password"]').first()
    await passwordInput.fill('Chitra#71261')
    const loginSubmitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
    await loginSubmitBtn.click()

    console.log('Submitted login credentials. Waiting for redirect to /dashboard/assets/disposal...')
    await page.waitForURL(/\/dashboard\/assets\/disposal/, { timeout: 45000 })
    console.log('Login successful, directly on Asset Disposal Page!')
    await page.waitForTimeout(2500)

    // Dismiss announcement / popup if any
    const dismissBtn = page.locator('button:has-text("TUTUP / MENGERTI"), button:has-text("Mengerti"), button:has-text("Tutup")').first()
    if (await dismissBtn.isVisible().catch(() => false)) {
      await dismissBtn.click().catch(() => {})
      await page.waitForTimeout(1000)
    }

    // Verify Title
    const heading = page.locator('main h1:has-text("Asset Disposal")')
    await expect(heading).toBeVisible({ timeout: 15000 })

    // Verify Two Tabs exist: "Disposal Saya" and "Daftar Disposal"
    const tabList = page.locator('div[role="tablist"]').first()
    await expect(tabList).toHaveClass(/w-full justify-start/)
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
    // STEP 2: Buka Modal Form Pengajuan Disposal & Pilih Jenis "Penjualan"
    // =========================================================================
    console.log('Opening Form Asset Disposal dialog...')
    await page.waitForTimeout(1500)
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

    // Verify Modal Lebar (max-w-6xl)
    const dialogContent = page.locator('[role="dialog"]').first()
    await expect(dialogContent).toHaveClass(/max-w-6xl/)
    console.log('✓ Verified: Dialog Form is wide with max-w-6xl container!')

    // Pilih Dropdown Jenis Disposal: "Penjualan"
    const jenisDisposalSelect = page.locator('button:has-text("Penghapusan"), button:has-text("Pilih jenis disposal")').first()
    await expect(jenisDisposalSelect).toBeVisible()
    await jenisDisposalSelect.click()
    await page.waitForTimeout(400)
    const popoverJenis = page.locator('[data-radix-popper-content-wrapper]').last()
    const optPenjualan = popoverJenis.locator('div.cursor-pointer:has-text("Penjualan")').first()
    await optPenjualan.click()
    await page.waitForTimeout(600)
    console.log('✓ Successfully selected Jenis Disposal: Penjualan')

    // Verify Banner Informasi Khusus Kategori Penjualan muncul
    const saleBanner = page.locator('text=Alur Khusus Kategori Penjualan & Lelang')
    await expect(saleBanner).toBeVisible({ timeout: 5000 })
    console.log('✓ Verified: Banner alur khusus Penjualan & Lelang ditampilkan.')

    // Pilih Unit #1 dari Master Data HERO
    console.log('Selecting Unit #1 from Master Data HERO...')
    const selectTrigger1 = page.locator('button:has-text("Pilih aset dari Master Data HERO...")').first()
    await selectTrigger1.click()
    await page.waitForTimeout(600)

    const popoverContent = page.locator('[data-radix-popper-content-wrapper]').last()
    await expect(popoverContent).toBeVisible({ timeout: 5000 })
    const optionItems = popoverContent.locator('div.cursor-pointer')
    await optionItems.first().click({ force: true })
    await page.waitForTimeout(600)

    const notesInput1 = page.locator('textarea[placeholder*="Contoh: Rusak total"]').first()
    await notesInput1.fill('Unit operasional dilelang untuk peremajaan armada dan aset perusahaan.')

    // Tambah Unit #2
    const addUnitBtn = page.locator('button:has-text("Tambah Unit Aset")').first()
    await addUnitBtn.click()
    await page.waitForTimeout(600)

    console.log('Selecting Unit #2 from Master Data HERO...')
    const selectTrigger2 = page.locator('button:has-text("Pilih aset dari Master Data HERO...")').first()
    await selectTrigger2.click()
    await page.waitForTimeout(600)

    const popoverContent2 = page.locator('[data-radix-popper-content-wrapper]').last()
    const optionItems2 = popoverContent2.locator('div.cursor-pointer')
    const optCount2 = await optionItems2.count()
    if (optCount2 > 1) {
      await optionItems2.nth(1).click({ force: true })
    } else {
      await optionItems2.first().click({ force: true })
    }
    await page.waitForTimeout(600)

    const notesInput2 = page.locator('textarea[placeholder*="Contoh: Rusak total"]').nth(1)
    await notesInput2.fill('Kondisi fisik laik lelang dengan dokumen kepemilikan lengkap.')

    // Verify Procurement Step di Rantai Persetujuan (Abd.Rajab / Sofyan Darmawan)
    const procurementApproverBadge = page.locator('text=Abd.Rajab / Sofyan Darmawan').first()
    await expect(procurementApproverBadge).toBeVisible({ timeout: 8000 })
    console.log('✓ Verified: Tim Procurement (Abd.Rajab / Sofyan Darmawan) hadir di rantai persetujuan Penjualan!')

    // Tanda Tangan Digital Pemohon
    console.log('Signing disposal form with canvas stroke...')
    const drawTabBtn = page.locator('button:has-text("Coretan Canvas")').first()
    await drawTabBtn.click()
    await page.waitForTimeout(500)

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    if (box) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        await page.mouse.move(box.x + 30, box.y + 30)
        await page.mouse.down()
        await page.mouse.move(box.x + 80, box.y + 60)
        await page.mouse.move(box.x + 120, box.y + 35)
        await page.mouse.move(box.x + 160, box.y + 70)
        await page.mouse.up()
        await page.waitForTimeout(600)
        if (await page.locator('text=Tanda Tangan Siap').isVisible()) break
      }
    }
    await expect(page.locator('text=Tanda Tangan Siap')).toBeVisible({ timeout: 10000 })

    const ss2Path = path.join(ARTIFACT_DIR, '02_asset_disposal_form_multi_items_filled.png')
    await page.screenshot({ path: ss2Path })
    saveScreenshot(ss2Path, '02_asset_disposal_form_multi_items_filled.png')
    console.log('✓ Captured 02_asset_disposal_form_multi_items_filled.png')

    // Submit form
    console.log('Submitting disposal form...')
    const submitBtn = page.locator('button:has-text("Kirim Pengajuan Disposal")').first()
    await submitBtn.click()

    await expect(dialogTitle).not.toBeVisible({ timeout: 25000 })
    await page.waitForTimeout(2500)

    // Reload page to verify SSR table data
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const tableRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(tableRow).toBeVisible({ timeout: 15000 })
    await expect(tableRow.locator('text=Penjualan').first()).toBeVisible()
    console.log('✓ Table row created with category Penjualan!')

    const ss3Path = path.join(ARTIFACT_DIR, '03_asset_disposal_table_row_created.png')
    await page.screenshot({ path: ss3Path })
    saveScreenshot(ss3Path, '03_asset_disposal_table_row_created.png')
    console.log('✓ Captured 03_asset_disposal_table_row_created.png')

    // =========================================================================
    // STEP 3: Approval Rantai Hingga Step Procurement (Input Estimasi Harga)
    // =========================================================================
    console.log('Starting approval cycles...')

    // Step 1: Atasan Langsung
    let tinjauBtn = tableRow.locator('button:has-text("Tinjau")').first()
    await expect(tinjauBtn).toBeVisible()
    await tinjauBtn.click()
    await page.waitForTimeout(2000)

    let approveButton = page.locator('button:has-text("Setujui Pengajuan")').first()
    await expect(approveButton).toBeVisible({ timeout: 15000 })
    await approveButton.click()
    await expect(approveButton).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    // Reload to advance to next step
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Step 2: Manager
    tinjauBtn = page.locator('table tbody tr:has-text("DSP-")').first().locator('button:has-text("Tinjau")').first()
    await tinjauBtn.click()
    await page.waitForTimeout(2000)

    approveButton = page.locator('button:has-text("Setujui Pengajuan")').first()
    await expect(approveButton).toBeVisible({ timeout: 15000 })
    await approveButton.click()
    await expect(approveButton).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    // Reload to reach Step 3: Procurement
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    console.log('Opening Step 3: Procurement Price Estimation Review...')
    tinjauBtn = page.locator('table tbody tr:has-text("DSP-")').first().locator('button:has-text("Tinjau")').first()
    await tinjauBtn.click()
    await page.waitForTimeout(2500)

    // Verify Area Input Estimasi Harga Penjualan (Procurement - Tanpa TTD)
    const estHeading = page.locator('text=Input Estimasi Harga Penjualan')
    await expect(estHeading).toBeVisible({ timeout: 15000 })
    const procNotice = page.locator('text=Tim Procurement (Abd.Rajab / Sofyan Darmawan)')
    await expect(procNotice).toBeVisible()
    console.log('✓ Verified: Procurement Price Estimation panel is displayed!')

    // Input estimasi harga jual per item
    const priceInputs = page.locator('input[type="number"][placeholder="0"]')
    const priceCount = await priceInputs.count()
    console.log(`Found ${priceCount} item estimate inputs.`)
    expect(priceCount).toBeGreaterThanOrEqual(1)

    await priceInputs.first().fill('35000000')
    if (priceCount > 1) {
      await priceInputs.nth(1).fill('25000000')
    }
    await page.waitForTimeout(800)

    // Verify Live A4 Document preview renders ESTIMASI HARGA PENJUALAN column
    const printArea = page.locator('.print-area').first()
    await expect(printArea.getByText('ESTIMASI HARGA PENJUALAN').first()).toBeVisible()
    await expect(printArea.getByText('TOTAL NILAI AKUMULASI:').first()).toBeVisible()
    console.log('✓ Verified: Live A4 preview displays ESTIMASI HARGA PENJUALAN and accumulated total!')

    const ss5Path = path.join(ARTIFACT_DIR, '05_asset_disposal_procurement_price_estimation.png')
    await page.screenshot({ path: ss5Path })
    saveScreenshot(ss5Path, '05_asset_disposal_procurement_price_estimation.png')
    console.log('✓ Captured 05_asset_disposal_procurement_price_estimation.png')

    // Approve step 3 without signature
    approveButton = page.locator('button:has-text("Setujui Pengajuan")').first()
    await approveButton.click()
    await expect(approveButton).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    // Reload and advance through Finance, GM, and Direktur
    // Step 4: Finance (Amama Ira)
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    tinjauBtn = page.locator('table tbody tr:has-text("DSP-")').first().locator('button:has-text("Tinjau")').first()
    await tinjauBtn.click()
    await page.waitForTimeout(2000)
    approveButton = page.locator('button:has-text("Setujui Pengajuan")').first()
    await approveButton.click()
    await expect(approveButton).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    // Step 5: GM (Person Sihaloho)
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    tinjauBtn = page.locator('table tbody tr:has-text("DSP-")').first().locator('button:has-text("Tinjau")').first()
    await tinjauBtn.click()
    await page.waitForTimeout(2000)
    approveButton = page.locator('button:has-text("Setujui Pengajuan")').first()
    await approveButton.click()
    await expect(approveButton).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    // Step 6: Direktur (Hidayat Rahman) - Full Approval triggers 'waiting_auction_docs'
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    tinjauBtn = page.locator('table tbody tr:has-text("DSP-")').first().locator('button:has-text("Tinjau")').first()
    await tinjauBtn.click()
    await page.waitForTimeout(2000)
    approveButton = page.locator('button:has-text("Setujui Pengajuan")').first()
    await approveButton.click()
    await expect(approveButton).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    // =========================================================================
    // STEP 4: Verifikasi Status 'waiting_auction_docs' & Tombol 'Lampiran Lelang'
    // =========================================================================
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const updatedRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(updatedRow.locator('text=Menunggu Lampiran Lelang').first()).toBeVisible({ timeout: 15000 })
    console.log('✓ Status successfully transitioned to "Menunggu Lampiran Lelang"!')

    // Tombol Lampiran Lelang muncul
    const auctionBtn = updatedRow.locator('button:has-text("Lampiran Lelang")').first()
    await expect(auctionBtn).toBeVisible()

    const ss6Path = path.join(ARTIFACT_DIR, '06_asset_disposal_waiting_auction_docs.png')
    await page.screenshot({ path: ss6Path })
    saveScreenshot(ss6Path, '06_asset_disposal_waiting_auction_docs.png')
    console.log('✓ Captured 06_asset_disposal_waiting_auction_docs.png')

    // =========================================================================
    // STEP 5: Submit Lampiran Lelang oleh Procurement
    // =========================================================================
    console.log('Opening Post-Approval Auction Modal...')
    await auctionBtn.click()
    await page.waitForTimeout(1500)

    const auctionModal = page.locator('[role="dialog"]:has-text("Submit Lampiran Hasil Lelang")').first()
    await expect(auctionModal).toBeVisible({ timeout: 10000 })

    // Centang checklist dokumen lelang
    const skLelangCheckbox = auctionModal.locator('label:has-text("Surat keputusan pemenang Lelang")').first()
    await skLelangCheckbox.click()
    const baCheckbox = auctionModal.locator('label:has-text("Berita Acara")').first()
    await baCheckbox.click()
    const bayarCheckbox = auctionModal.locator('label:has-text("Bukti Pembayaran")').first()
    await bayarCheckbox.click()

    // Catatan lelang
    const auctionNotes = auctionModal.locator('textarea').first()
    await auctionNotes.fill('Lelang selesai dilaksanakan oleh Tim Procurement. Pemenang dan bukti pembayaran lunas telah diverifikasi.')

    const ss7Path = path.join(ARTIFACT_DIR, '07_asset_disposal_auction_modal.png')
    await page.screenshot({ path: ss7Path })
    saveScreenshot(ss7Path, '07_asset_disposal_auction_modal.png')
    console.log('✓ Captured 07_asset_disposal_auction_modal.png')

    const submitAuctionBtn = auctionModal.locator('button:has-text("Simpan & Kirim ke Finance")').first()
    await submitAuctionBtn.click()
    await expect(auctionModal).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    // =========================================================================
    // STEP 6: Verifikasi Status 'waiting_finance_docs' & Tombol 'Dokumen Finance'
    // =========================================================================
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const financeRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(financeRow.locator('text=Menunggu Dokumen Finance').first()).toBeVisible({ timeout: 15000 })
    console.log('✓ Status successfully transitioned to "Menunggu Dokumen Finance"!')

    const financeBtn = financeRow.locator('button:has-text("Dokumen Finance")').first()
    await expect(financeBtn).toBeVisible()

    const ss8Path = path.join(ARTIFACT_DIR, '08_asset_disposal_waiting_finance_docs.png')
    await page.screenshot({ path: ss8Path })
    saveScreenshot(ss8Path, '08_asset_disposal_waiting_finance_docs.png')
    console.log('✓ Captured 08_asset_disposal_waiting_finance_docs.png')

    // =========================================================================
    // STEP 7: Submit Dokumen Keuangan oleh Finance & Accounting
    // =========================================================================
    console.log('Opening Post-Approval Finance Modal...')
    await financeBtn.click()
    await page.waitForTimeout(1500)

    const financeModal = page.locator('[role="dialog"]:has-text("Submit Dokumen Keuangan")').first()
    await expect(financeModal).toBeVisible({ timeout: 10000 })

    // Centang checklist dokumen finance
    const debitNoteCheckbox = financeModal.locator('label:has-text("Debit Note")').first()
    await debitNoteCheckbox.click()
    const fakturPajakCheckbox = financeModal.locator('label:has-text("Faktur Pajak")').first()
    await fakturPajakCheckbox.click()
    const sapDisposalCheckbox = financeModal.locator('label:has-text("Dokumen Disposal SAP")').first()
    await sapDisposalCheckbox.click()

    const financeNotes = financeModal.locator('textarea').first()
    await financeNotes.fill('Debit note & faktur pajak telah terbit. Aset telah di-write-off pada sistem SAP.')

    const ss9Path = path.join(ARTIFACT_DIR, '09_asset_disposal_finance_modal.png')
    await page.screenshot({ path: ss9Path })
    saveScreenshot(ss9Path, '09_asset_disposal_finance_modal.png')
    console.log('✓ Captured 09_asset_disposal_finance_modal.png')

    const submitFinanceBtn = financeModal.locator('button:has-text("Selesaikan Proses Disposal & Lelang")').first()
    await submitFinanceBtn.click()
    await expect(financeModal).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2500)

    // =========================================================================
    // STEP 8: Verifikasi Status 'completed' & Pratinjau Detail Modal Lengkap
    // =========================================================================
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const completedRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(completedRow.locator('text=Selesai (Disposal & Lelang Selesai)').first()).toBeVisible({ timeout: 15000 })
    console.log('✓ Status successfully transitioned to "Selesai (Disposal & Lelang Selesai)"!')

    // Buka Modal Detail untuk verifikasi rincian akhir
    const viewCompletedBtn = completedRow.locator('button:has(svg.lucide-eye)').first()
    await viewCompletedBtn.click()
    await page.waitForTimeout(1500)

    const detailModal = page.locator('h2:has-text("Detail Penghapusan Aset"), div:has-text("Detail Penghapusan Aset")').first()
    await expect(detailModal).toBeVisible({ timeout: 10000 })

    // Verifikasi Bagian Lampiran Lelang & Dokumen Keuangan
    await expect(page.locator('text=Lampiran Hasil Lelang (Procurement)').first()).toBeVisible()
    await expect(page.locator('text=Dokumen Administrasi Keuangan (Finance & Accounting)').first()).toBeVisible()
    await expect(page.locator('text=Estimasi Harga Penjualan').first()).toBeVisible()
    console.log('✓ Verified: Detail Modal renders all post-approval sections (Auction & Finance documents) perfectly!')

    const ss10Path = path.join(ARTIFACT_DIR, '10_asset_disposal_completed_full_detail.png')
    await page.screenshot({ path: ss10Path })
    saveScreenshot(ss10Path, '10_asset_disposal_completed_full_detail.png')
    console.log('✓ Captured 10_asset_disposal_completed_full_detail.png')

    console.log('🎉 All Asset Disposal Sale Category E2E Tests Succeeded Perfectly!')
  })
})
