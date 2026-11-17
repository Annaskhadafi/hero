// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { cerRequests, cerItems, employees } from '../../db/schema'
import { eq } from 'drizzle-orm'

const ARTIFACT_SCREENSHOT_DIR = path.resolve(
  'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-bast-receiver-notes'
)

test.describe('CER BAST Photo Attachment & Real-time Receiver Notes Sync Verification', () => {
  test.setTimeout(240000)

  let testCerId = 14

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

    // Ensure test CER is full_approved, assigned to emp 71261, with initial notes
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

    // Ensure item has proper details
    const [existingItem] = await db
      .select()
      .from(cerItems)
      .where(eq(cerItems.cerRequestId, testCerId))
      .limit(1)

    if (existingItem) {
      await db
        .update(cerItems)
        .set({
          assetNumber: 'AST-CP-2026-0042',
          kelompokAset: 'Kelompok 1 (Masa Manfaat 4 Tahun) - IT Hardware',
        })
        .where(eq(cerItems.id, existingItem.id))
    }
  })

  test('Verify Removal of Surat Jalan, Table Column CATATAN PENERIMAAN / BAST, Real-time Note Sync & Photo Preview', async ({ page }) => {
    // 1. Login to HERO
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    const emailInput = page.locator('#email, input[name="username"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 15000 })
    await emailInput.fill('71261')
    const passwordInput = page.locator('#password, input[name="password"]').first()
    await passwordInput.fill('Chitra#71261')
    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
    await submitBtn.click()

    await page.waitForResponse(
      (res) => res.url().includes('/api/auth/sign-in') && res.status() === 200,
      { timeout: 30000 }
    ).catch(() => {})
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

    // 4. Click "Konfirmasi Terima"
    const confirmReceiveBtn = page.locator('button:has-text("Konfirmasi Terima")').first()
    await expect(confirmReceiveBtn).toBeVisible({ timeout: 10000 })
    await confirmReceiveBtn.click()

    // 5. Verify Dialog is open
    const dialogTitle = page.locator('text=Konfirmasi Penerimaan Aset Fisik & Terbitkan BAST')
    await expect(dialogTitle).toBeVisible({ timeout: 15000 })

    // A. Verify Surat Jalan / Inv is completely removed
    const suratJalanLabel = page.locator('text=Surat Jalan / Inv')
    await expect(suratJalanLabel).toHaveCount(0)

    // B. Verify Table Column Header is "CATATAN PENERIMAAN / BAST"
    const catPenerimaanHeader = page.locator('th:has-text("CATATAN PENERIMAAN / BAST")')
    await expect(catPenerimaanHeader).toBeVisible()

    // C. Verify Old Header "CATATAN KONDISI ASET" is gone
    const oldHeader = page.locator('th:has-text("CATATAN KONDISI ASET")')
    await expect(oldHeader).toHaveCount(0)

    // D. Verify Lampiran Dokumentasi Fisik section exists in preview
    const photoSectionHeader = page.locator('text=LAMPIRAN DOKUMENTASI FISIK ASET')
    await expect(photoSectionHeader).toBeVisible()

    // E. Test Real-time Sync of Receiver Notes into Table Column & Photo Section
    const customTestNote = 'Barang MacBook Pro M3 Max diterima lengkap, segel utuh, charger & kabel lengkap.'
    const receiverNotesTextarea = page.locator('textarea[placeholder*="Kondisi barang"]')
    await expect(receiverNotesTextarea).toBeVisible()
    await receiverNotesTextarea.fill(customTestNote)

    // Verify the table cell in preview immediately updates to the custom note!
    const previewTableCell = page.locator(`td:has-text("${customTestNote}")`).first()
    await expect(previewTableCell).toBeVisible({ timeout: 5000 })

    // F. Test Uploading Physical Photo
    // Create a temporary sample PNG image to upload
    const sampleImagePath = path.join(ARTIFACT_SCREENSHOT_DIR, 'temp_sample_photo.png')
    const sampleImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAEjDAGNzEAAH14D/1k60tqAAAAAElFTkSuQmCC',
      'base64'
    )
    fs.writeFileSync(sampleImagePath, sampleImageBuffer)

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('text=Ambil Foto / Unggah dari Perangkat').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(sampleImagePath)

    // Wait for upload confirmation
    const uploadedIndicator = page.locator('text=Foto Fisik Terunggah').first()
    await expect(uploadedIndicator).toBeVisible({ timeout: 20000 })

    // Verify the preview image inside CerBastDocumentView is rendered
    const previewImg = page.locator('img[alt="Foto Fisik Aset"]')
    await expect(previewImg).toBeVisible({ timeout: 10000 })

    // 6. Capture full screenshot showing the synchronized table column, photo attachment, and clean form
    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOT_DIR, '01_bast_modal_with_notes_and_photo.png'),
      fullPage: false,
    })

    // 7. Verify PDF Endpoint delivers valid PDF with status 200
    const pdfResponse = await page.request.get(`http://localhost:3000/api/assets/cer/${testCerId}/bast-pdf`)
    expect(pdfResponse.status()).toBe(200)
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf')
    const pdfBuffer = await pdfResponse.body()
    expect(pdfBuffer.length).toBeGreaterThan(10000)

    // Clean up temporary image
    try {
      fs.unlinkSync(sampleImagePath)
    } catch {}
  })
})
