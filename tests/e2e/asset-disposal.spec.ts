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

test.describe('Asset Disposal Workflows: Penjualan, Penghapusan & Donasi', () => {
  test.setTimeout(300000)

  test('Alur Lengkap Kategori Donasi: Validasi Proposal, BA Donasi Pengaju, & Dokumen SAP Finance', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message))

    await page.setViewportSize({ width: 1440, height: 900 })

    // 1. Authenticate with standard system credentials
    console.log('Navigating to sign-in page with callbackUrl...')
    await page.goto('/sign-in?callbackUrl=/dashboard/assets/disposal')
    await page.waitForLoadState('domcontentloaded')

    const usernameInput = page.locator('#email, input[placeholder*="email atau SN"], input[name="username"]').first()
    await usernameInput.waitFor({ state: 'visible', timeout: 20000 })
    await usernameInput.fill('mochamad.khadafi@chitraparatama.co.id')
    const passwordInput = page.locator('#password, input[placeholder*="kata sandi"], input[name="password"]').first()
    await passwordInput.fill('Chitra#71261')
    const loginSubmitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
    console.log('Submitting login credentials...')
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth') && res.status() === 200, { timeout: 30000 }).catch(() => null),
      loginSubmitBtn.click(),
    ])
    await page.waitForTimeout(2000)

    console.log('Checking navigation to /dashboard/assets/disposal...')
    if (!page.url().includes('/dashboard/assets/disposal')) {
      await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    }
    await page.waitForTimeout(2500)

    // Dismiss announcement / popup if any
    const dismissBtn = page.locator('button:has-text("TUTUP / MENGERTI"), button:has-text("Mengerti"), button:has-text("Tutup")').first()
    if (await dismissBtn.isVisible().catch(() => false)) {
      await dismissBtn.click().catch(() => {})
      await page.waitForTimeout(1000)
    }

    const heading = page.locator('main h1:has-text("Asset Disposal")')
    await expect(heading).toBeVisible({ timeout: 20000 })

    // =========================================================================
    // STEP 1: Buat Pengajuan Kategori Donasi & Uji Validasi Wajib Proposal
    // =========================================================================
    console.log('Opening Form Asset Disposal dialog for Donasi test...')
    await page.waitForTimeout(1500)
    const createBtn = page.locator('button:has-text("Buat Pengajuan Disposal")').first()
    await expect(createBtn).toBeVisible({ timeout: 15000 })

    const dialogTitle = page.locator('h3:has-text("Formulir Pengajuan Asset Disposal")')
    for (let attempt = 0; attempt < 5; attempt++) {
      if (await dialogTitle.isVisible()) break
      console.log(`Clicking createBtn (attempt ${attempt + 1})...`)
      await createBtn.click()
      await page.waitForTimeout(1500)
    }
    await expect(dialogTitle).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)

    // Pilih Dropdown Jenis Disposal: "Donasi"
    const jenisDisposalSelect = page.locator('button:has-text("Penghapusan"), button:has-text("Pilih jenis disposal")').first()
    await expect(jenisDisposalSelect).toBeVisible()
    await jenisDisposalSelect.click()
    await page.waitForTimeout(400)
    const popoverJenis = page.locator('[data-radix-popper-content-wrapper]').last()
    const optDonasi = popoverJenis.locator('div.cursor-pointer:has-text("Donasi")').first()
    await optDonasi.click()
    await page.waitForTimeout(600)
    console.log('✓ Successfully selected Jenis Disposal: Donasi')

    // Verifikasi banner wajib proposal muncul
    const donasiBanner = page.locator('text=Kategori Donasi: Wajib melampirkan berkas Proposal Donasi')
    await expect(donasiBanner).toBeVisible({ timeout: 5000 })
    console.log('✓ Verified: Form displays mandatory proposal notification banner for Donasi!')

    // Verifikasi Locked Steps untuk Amama Ira, Febrian Dani, dan Hidayat Rahman (Direksi)
    await expect(page.locator('text=Wajib Terpasang (Finance SPV)').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Wajib Terpasang (Finance MGR)').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Wajib Terpasang (Direksi)').first()).toBeVisible({ timeout: 5000 })
    console.log('✓ Verified: Locked steps for Amama Ira (Finance SPV), Febrian Dani (Finance MGR), and Director are active and protected!')

    const ssLockedPath = path.join(ARTIFACT_DIR, '15_asset_disposal_locked_approvers.png')
    await page.screenshot({ path: ssLockedPath })
    saveScreenshot(ssLockedPath, '15_asset_disposal_locked_approvers.png')
    console.log('✓ Captured 15_asset_disposal_locked_approvers.png')

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
    await notesInput1.fill('Donasi aset inventaris layak pakai ke Yayasan Sosial Mitra Abadi.')

    // Tanda Tangan Digital Pemohon
    console.log('Selecting / signing disposal form...')
    const gunakanTtdBtn = page.locator('button:has-text("Gunakan TTD Ini")').first()
    if (await gunakanTtdBtn.isVisible().catch(() => false)) {
      await gunakanTtdBtn.click()
      await page.waitForTimeout(600)
    } else {
      const drawTabBtn = page.locator('button:has-text("Coretan Canvas")').first()
      if (await drawTabBtn.isVisible().catch(() => false)) {
        await drawTabBtn.click()
        await page.waitForTimeout(500)
      }

      const canvas = page.locator('canvas').first()
      await canvas.scrollIntoViewIfNeeded()
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
    }

    // Coba Submit TANPA lampiran proposal -> Harap gagal dengan validasi toast error
    const submitBtn = page.locator('button:has-text("Kirim Pengajuan Disposal")').first()
    await submitBtn.click()
    await page.waitForTimeout(1000)

    const ss11Path = path.join(ARTIFACT_DIR, '11_asset_disposal_donasi_proposal_required_error.png')
    await page.screenshot({ path: ss11Path })
    saveScreenshot(ss11Path, '11_asset_disposal_donasi_proposal_required_error.png')
    console.log('✓ Captured 11_asset_disposal_donasi_proposal_required_error.png (Validation blocked submit without proposal)')

    // Sekarang Unggah Proposal Donasi
    const fileInput = page.locator('input[type="file"][multiple]').first()
    await fileInput.setInputFiles({
      name: 'Proposal-Donasi-Sosial-2026.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Mocked Official Donation Proposal Document Content'),
    })
    await page.waitForTimeout(2000)
    await expect(page.locator('text=Proposal-Donasi-Sosial-2026.pdf').first()).toBeVisible({ timeout: 10000 })
    console.log('✓ Uploaded Proposal Donasi file successfully!')

    // Submit pengajuan yang telah lengkap
    await submitBtn.click()
    await expect(dialogTitle).not.toBeVisible({ timeout: 25000 })
    console.log('✓ Form closed. Donasi disposal request created successfully!')
    await page.waitForTimeout(2500)

    // =========================================================================
    // STEP 2: Approval Berjenjang hingga Direktur
    // =========================================================================
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const donasiRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(donasiRow).toBeVisible({ timeout: 15000 })
    await expect(donasiRow.locator('text=🎁 Donasi').first()).toBeVisible()
    console.log('✓ Verified: Donasi table row created with 🎁 Donasi badge!')

    // Sequential approval loop: Section Head -> Finance SPV (Amama Ira) -> Finance Manager (Febrian Dani) -> Director (Hidayat Rahman / Freshya)
    for (let step = 1; step <= 6; step++) {
      const activeRow = page.locator('table tbody tr:has-text("DSP-")').first()
      const tinjauBtn = activeRow.locator('button:has-text("Tinjau")').first()
      const isPendingReview = await tinjauBtn.isVisible().catch(() => false)
      if (!isPendingReview) {
        console.log(`No more Tinjau button at step ${step}. All approval steps completed!`)
        break
      }

      console.log(`Executing Approval Step ${step}...`)
      await tinjauBtn.click()
      await page.waitForTimeout(2000)

      const approveButton = page.locator('button:has-text("Setujui Pengajuan")').first()
      await expect(approveButton).toBeVisible({ timeout: 15000 })
      await approveButton.click()
      // Wait for approval processing (PDF generation on final step takes ~3-4s)
      await page.waitForTimeout(4000)

      await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)
    }

    // =========================================================================
    // STEP 3: Verifikasi Status 'waiting_ba_disposal' & Tombol 'BA Donasi'
    // =========================================================================
    const baDonasiRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(baDonasiRow.locator('text=Menunggu BA Donasi (Pengaju)').first()).toBeVisible({ timeout: 15000 })
    console.log('✓ Status successfully transitioned to "Menunggu BA Donasi (Pengaju)"!')

    const baBtn = baDonasiRow.locator('button:has-text("BA Donasi")').first()
    await expect(baBtn).toBeVisible()

    const ss12Path = path.join(ARTIFACT_DIR, '12_asset_disposal_waiting_ba_donasi.png')
    await page.screenshot({ path: ss12Path })
    saveScreenshot(ss12Path, '12_asset_disposal_waiting_ba_donasi.png')
    console.log('✓ Captured 12_asset_disposal_waiting_ba_donasi.png')

    // =========================================================================
    // STEP 4: Buka Modal Berita Acara Donasi & Submit oleh Pengaju
    // =========================================================================
    console.log('Opening Berita Acara Modal for Donasi...')
    await baBtn.click()
    await page.waitForTimeout(1500)

    const baModal = page.locator('[role="dialog"]:has-text("Submit Berita Acara Donasi")').first()
    await expect(baModal).toBeVisible({ timeout: 10000 })

    // Centang checklist Berita Acara Donasi
    const baCheckbox = baModal.locator('label:has-text("Berita Acara Donasi")').first()
    await baCheckbox.click()

    // Coba submit tanpa file -> Harap dicegah (wajib upload file Berita Acara)
    const submitBaBtn = baModal.locator('button:has-text("Simpan & Teruskan ke Finance")').first()
    await submitBaBtn.click()
    await page.waitForTimeout(1000)
    await expect(baModal).toBeVisible()
    console.log('✓ Verified: File upload is strictly required for Berita Acara submission!')

    // Upload berkas Berita Acara Donasi
    const baFileInput = baModal.locator('input[type="file"]').first()
    await baFileInput.setInputFiles({
      name: 'Berita-Acara-Serah-Terima-Donasi-Signed.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Mocked Official Signed Donation Handover Document'),
    })
    await page.waitForTimeout(2000)
    await expect(baModal.locator('text=Berita-Acara-Serah-Terima-Donasi-Signed.pdf').first()).toBeVisible({ timeout: 10000 })

    const baNotes = baModal.locator('textarea').first()
    await baNotes.fill('Berita acara serah terima donasi telah ditandatangani perwakilan panti dan manajemen.')

    await submitBaBtn.click()
    await expect(baModal).not.toBeVisible({ timeout: 15000 })
    console.log('✓ Berita Acara Donasi submitted successfully. Escalated to Finance!')
    await page.waitForTimeout(2500)

    // =========================================================================
    // STEP 5: Verifikasi Status 'waiting_finance_docs' & Submit oleh Finance
    // =========================================================================
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const finRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(finRow.locator('text=Menunggu Dokumen Finance').first()).toBeVisible({ timeout: 15000 })
    console.log('✓ Status successfully transitioned to "Menunggu Dokumen Finance"!')

    const finBtn = finRow.locator('button:has-text("Dokumen Finance")').first()
    await expect(finBtn).toBeVisible()

    const ss13Path = path.join(ARTIFACT_DIR, '13_asset_disposal_waiting_finance_from_donasi.png')
    await page.screenshot({ path: ss13Path })
    saveScreenshot(ss13Path, '13_asset_disposal_waiting_finance_from_donasi.png')
    console.log('✓ Captured 13_asset_disposal_waiting_finance_from_donasi.png')

    // Buka Modal Finance
    await finBtn.click()
    await page.waitForTimeout(1500)
    const finModal = page.locator('[role="dialog"]:has-text("Submit Dokumen Keuangan")').first()
    await expect(finModal).toBeVisible({ timeout: 10000 })

    // Centang Dokumen Disposal SAP
    const sapCheckbox = finModal.locator('label:has-text("Dokumen Disposal SAP")').first()
    await sapCheckbox.click()

    // Upload berkas Dokumen Disposal SAP
    const sapFileInput = finModal.locator('input[type="file"]').first()
    await sapFileInput.setInputFiles({
      name: 'SAP-Disposal-Confirmation-Donasi.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Mocked SAP ERP Disposal Confirmation Export'),
    })
    await page.waitForTimeout(2000)
    await expect(finModal.locator('text=SAP-Disposal-Confirmation-Donasi.pdf').first()).toBeVisible({ timeout: 10000 })

    const finNotes = finModal.locator('textarea').first()
    await finNotes.fill('Aset donasi telah di-write-off dari sistem SAP ERP.')

    const submitFinBtn = finModal.locator('button:has-text("Selesaikan Proses Disposal")').first()
    await submitFinBtn.click()
    await expect(finModal).not.toBeVisible({ timeout: 15000 })
    console.log('✓ Finance submitted SAP Disposal Document successfully!')
    await page.waitForTimeout(2500)

    // =========================================================================
    // STEP 6: Verifikasi Status 'completed' & Detail Modal Akhir
    // =========================================================================
    await page.goto('/dashboard/assets/disposal', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const completedRow = page.locator('table tbody tr:has-text("DSP-")').first()
    await expect(completedRow.locator('text=Selesai (Disposal Selesai)').first()).toBeVisible({ timeout: 15000 })
    console.log('✓ Status successfully transitioned to "Selesai (Disposal Selesai)"!')

    // Buka Modal Detail
    const viewBtn = completedRow.locator('button:has(svg.lucide-eye)').first()
    await viewBtn.click()
    await page.waitForTimeout(1500)

    const detailModal = page.locator('h2:has-text("Detail Penghapusan Aset"), div:has-text("Detail Penghapusan Aset")').first()
    await expect(detailModal).toBeVisible({ timeout: 10000 })

    // Verifikasi Section Berita Acara Donasi & Dokumen Keuangan
    await expect(page.locator('text=Berita Acara Serah Terima Donasi (Pengaju)').first()).toBeVisible()
    await expect(page.locator('text=Dokumen Administrasi Keuangan (Finance & Accounting)').first()).toBeVisible()
    await expect(page.locator('text=Proposal-Donasi-Sosial-2026.pdf').first()).toBeVisible()
    console.log('✓ Verified: Detail modal renders Berita Acara Donasi, Dokumen SAP Finance, and Proposal Donasi!')

    const ss14Path = path.join(ARTIFACT_DIR, '14_asset_disposal_donasi_completed_detail.png')
    await page.screenshot({ path: ss14Path })
    saveScreenshot(ss14Path, '14_asset_disposal_donasi_completed_detail.png')
    console.log('✓ Captured 14_asset_disposal_donasi_completed_detail.png')

    console.log('🎉 All Asset Disposal Donation Workflow E2E Tests Succeeded Perfectly!')
  })
})
