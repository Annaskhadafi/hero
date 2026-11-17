// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { cerRequests, cerItems, employees } from '../../db/schema'
import { eq } from 'drizzle-orm'

const ARTIFACT_SCREENSHOT_DIR = path.resolve(
  'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-bast-delete-and-large-photo'
)

test.describe('CER BAST Delete Button & Large Photo Preview Verification', () => {
  test.setTimeout(240000)

  let testCerId = 15

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

    const [emp71261] = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeSn, '71261'))
      .limit(1)

    // Ensure test CER is full_approved, assigned to emp 71261
    await db
      .update(cerRequests)
      .set({
        status: 'full_approved',
        applicantEmployeeId: emp71261?.id || 5,
        kelompokAset: 'Kelompok 1 (Masa Manfaat 4 Tahun) - IT Hardware',
        receiverNotes: null,
        goodsPhotoUrl: null,
      })
      .where(eq(cerRequests.id, testCerId))
  })

  test('Verify Delete Icon Button in Receiving Tab & Large Photo Preview in Modal and Document', async ({ page }) => {
    // 1. Login to HERO
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    const emailInput = page.locator('input[placeholder*="email atau SN" i], #email, input[name="username"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 15000 })
    await emailInput.fill('71261')
    const passwordInput = page.locator('input[type="password"], #password, input[name="password"]').first()
    await passwordInput.fill('Chitra#71261')
    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
    await submitBtn.click()

    await page.waitForURL('**/dashboard/**', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // 2. Navigate to CER page on tab receiving directly
    await page.goto('/dashboard/assets/cer?tab=receiving')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // Ensure tab button is selected
    const bastTab = page.locator('button[role="tab"][value="receiving"], button[role="tab"]:has-text("Penerimaan & BAST")').first()
    await expect(bastTab).toBeVisible({ timeout: 15000 })
    await bastTab.click()
    await page.waitForTimeout(1000)

    // 3. VERIFY DELETE ICON BUTTON IN RECEIVING TAB
    const confirmReceiveBtn = page.locator('button:has-text("Konfirmasi Terima")').first()
    await expect(confirmReceiveBtn).toBeVisible({ timeout: 10000 })

    const deleteBtn = page.locator('button[title="Hapus Pengajuan"]').first()
    await expect(deleteBtn).toBeVisible({ timeout: 5000 })

    // Take screenshot of tab Penerimaan & BAST showing both "Konfirmasi Terima" AND "Hapus" icon button
    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOT_DIR, '01_penerimaan_bast_with_delete_btn.png'),
      fullPage: false,
    })

    // 4. Test clicking Delete button triggers confirmation dialog
    await deleteBtn.click()
    const deleteModalTitle = page.locator('text=Hapus Pengajuan CER').first()
    await expect(deleteModalTitle).toBeVisible({ timeout: 5000 })

    // Cancel deletion to keep test data intact
    const cancelDeleteBtn = page.locator('button:has-text("Batal")').last()
    await cancelDeleteBtn.click()
    await expect(deleteModalTitle).toBeHidden({ timeout: 5000 })
    await page.waitForTimeout(1000)

    // 5. Click "Konfirmasi Terima" to open BAST Receive Dialog
    await confirmReceiveBtn.click()
    const dialogTitle = page.locator('text=Konfirmasi Penerimaan Aset Fisik & Terbitkan BAST')
    await expect(dialogTitle).toBeVisible({ timeout: 15000 })

    // 6. Test Uploading Physical Photo and Verify Large Preview Size
    const sampleImagePath = path.join(ARTIFACT_SCREENSHOT_DIR, 'temp_sample_photo.png')
    const sampleImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    fs.writeFileSync(sampleImagePath, sampleImageBuffer)

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('text=Ambil Foto / Unggah dari Perangkat').first().click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(sampleImagePath)

    // Wait for upload confirmation
    const uploadedIndicator = page.locator('text=Klik untuk ganti foto').first()
    await expect(uploadedIndicator).toBeVisible({ timeout: 45000 })

    // Verify the preview in form panel has extra large height (h-60 = 240px)
    const formPhotoImg = page.locator('img[alt="Foto Barang"]')
    await expect(formPhotoImg).toBeVisible({ timeout: 5000 })
    const formBox = await formPhotoImg.boundingBox()
    expect(formBox?.height).toBeGreaterThan(180)

    // Verify the preview in CerBastDocumentView has extra large dimensions (h-72 w-[460px] = 288x460px)
    const docPhotoImg = page.locator('img[alt="Foto Fisik Aset"]')
    await expect(docPhotoImg).toBeVisible({ timeout: 5000 })
    const docBox = await docPhotoImg.boundingBox()
    expect(docBox?.height).toBeGreaterThan(200)
    expect(docBox?.width).toBeGreaterThan(320)

    // 7. Capture full screenshot showing the extra large photo preview in form & document
    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOT_DIR, '02_large_photo_preview_modal.png'),
      fullPage: false,
    })

    // Test clicking photo to trigger lightbox dialog
    await docPhotoImg.click()
    const lightboxImg = page.locator('img[alt="Foto Fisik Aset Resolusi Penuh"]').first()
    await expect(lightboxImg).toBeVisible({ timeout: 5000 })
    // Close lightbox by clicking its close button
    const lightboxDialog = page.locator('div[role="dialog"]:has(img[alt="Foto Fisik Aset Resolusi Penuh"])')
    await lightboxDialog.locator('button').last().click()
    await expect(lightboxImg).toBeHidden({ timeout: 5000 })
    await page.waitForTimeout(500)

    // 8. Submit "Konfirmasi Aset Diterima & Terbitkan BAST"
    const submitBastBtn = page.locator('button:has-text("Konfirmasi Aset Diterima & Terbitkan BAST")').first()
    await submitBastBtn.click()

    // Wait for receive confirmation toast and modal to close
    await page.waitForSelector('text=Penerimaan fisik aset berhasil dikonfirmasi', { timeout: 45000 })
    await expect(dialogTitle).toBeHidden({ timeout: 15000 })
    await page.waitForTimeout(2000)

    // 9. VERIFY CLEAN ACTION BUTTONS IN RECEIVING TAB AFTER CONFIRMATION:
    // Status must be "BAST Selesai"
    const bastSelesaiBadge = page.locator('text=BAST Selesai').first()
    await expect(bastSelesaiBadge).toBeVisible({ timeout: 10000 })

    // Verify separate Preview and Download PDF buttons are REMOVED from table action column
    const previewBastPdfBtn = page.locator('a[title="Pratinjau Dokumen BAST (PDF)"], button[title="Pratinjau Dokumen BAST (PDF)"]')
    await expect(previewBastPdfBtn).toHaveCount(0)

    const downloadBastPdfBtn = page.locator('a[title="Unduh File PDF BAST"], button[title="Unduh File PDF BAST"]')
    await expect(downloadBastPdfBtn).toHaveCount(0)

    // Verify View BAST Modal icon button exists
    const viewBastModalBtn = page.locator('button[title="Lihat Detail BAST"]').first()
    await expect(viewBastModalBtn).toBeVisible({ timeout: 5000 })

    // Verify Delete button exists for admin
    const tableDeleteBtn = page.locator('button[title="Hapus Pengajuan"]').first()
    await expect(tableDeleteBtn).toBeVisible({ timeout: 5000 })

    // Capture screenshot of table showing the clean action buttons (Eye & Delete only)
    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOT_DIR, '03_bast_received_action_buttons.png'),
      fullPage: false,
    })

    // 10. Click View BAST Modal to verify LOCKED read-only dialog
    await viewBastModalBtn.click()
    const detailTitle = page.locator('text=Detail Berita Acara Serah Terima (BAST)').first()
    await expect(detailTitle).toBeVisible({ timeout: 10000 })

    // Header has PDF download button
    const headerUnduhBastBtn = page.locator('button:has-text("Unduh Dokumen BAST (PDF)")').first()
    await expect(headerUnduhBastBtn).toBeVisible({ timeout: 5000 })

    // Bottom right DOES NOT have redundant download button
    const formUnduhBastBtn = page.locator('button:has-text("Unduh Dokumen BAST Resmi (PDF)")')
    await expect(formUnduhBastBtn).toHaveCount(0)

    // Form controls are completely locked / read-only
    const signedBanner = page.locator('text=BAST Telah Ditandatangani & Diterbitkan').first()
    await expect(signedBanner).toBeVisible({ timeout: 5000 })

    const dateInput = page.locator('input[type="date"]').first()
    await expect(dateInput).toBeDisabled()

    const notesTextarea = page.locator('textarea').first()
    await expect(notesTextarea).toBeDisabled()

    // Interactive signature pad canvas is not rendered
    const sigCanvas = page.locator('canvas')
    await expect(sigCanvas).toHaveCount(0)

    // Take screenshot of locked modal
    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOT_DIR, '04_bast_locked_detail_modal.png'),
      fullPage: false,
    })

    // Close dialog
    await page.locator('button:has-text("Tutup")').first().click()
    await expect(detailTitle).toBeHidden({ timeout: 5000 })

    // 11. Verify PDF Endpoint delivers valid PDF with large photo section
    const pdfResponse = await page.request.get(`http://localhost:3000/api/assets/cer/${testCerId}/bast-pdf`)
    expect(pdfResponse.status()).toBe(200)
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf')
    const pdfBuffer = await pdfResponse.body()
    expect(pdfBuffer.length).toBeGreaterThan(10000)

    // Save updated PDF to brain directory
    const pdfSavePath = path.resolve(
      'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/cer-bast-preview.pdf'
    )
    fs.writeFileSync(pdfSavePath, pdfBuffer)

    // Clean up temporary image
    try {
      fs.unlinkSync(sampleImagePath)
    } catch {}
  })
})
