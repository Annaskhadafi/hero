// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { cerRequests, cerItems, approvals, employees } from '../../db/schema'
import { eq } from 'drizzle-orm'

const ARTIFACT_SCREENSHOT_DIR = path.resolve(
  'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-bast-refinement'
)

test.describe('CER BAST Tab & PDF Refinements E2E Verification', () => {
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

    // Set test CER to full_approved and set applicant to logged-in user (emp 71261)
    await db
      .update(cerRequests)
      .set({
        status: 'full_approved',
        applicantEmployeeId: emp71261?.id || 5,
        kelompokAset: 'Kelompok 1 (Masa Manfaat 4 Tahun)',
        financeCheckNotes: 'Aset Capex disetujui, kelompok aset telah ditetapkan oleh Finance.',
      })
      .where(eq(cerRequests.id, testCerId))

    // Ensure at least one item has assetNumber and kelompokAset
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
          kelompokAset: 'Kelompok 1 (Masa Manfaat 4 Tahun)',
        })
        .where(eq(cerItems.id, existingItem.id))
    }
  })

  test('BAST Tab Single Button & Preview Table/Signature 2-Column Verification', async ({ page }) => {
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

    // 2. Navigate to CER page
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await page.waitForSelector('text=Daftar Pengajuan', { timeout: 30000 })

    // 3. Switch to "Penerimaan & BAST" tab
    const bastTab = page.locator('button[role="tab"]:has-text("Penerimaan & BAST")')
    await expect(bastTab).toBeVisible()
    await bastTab.click()
    await page.waitForTimeout(1500)

    // Take screenshot of Penerimaan & BAST tab
    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOT_DIR, '01_penerimaan_bast_tab_single_button.png'),
      fullPage: true,
    })

    // 4. Verify that in Penerimaan & BAST tab, the ONLY button in action cell is "Konfirmasi Terima"
    // Find the row containing our test CER or the first row in the table
    const tableBody = page.locator('table tbody')
    await expect(tableBody).toBeVisible()

    const confirmReceiveBtn = page.locator('button:has-text("Konfirmasi Terima")').first()
    await expect(confirmReceiveBtn).toBeVisible()

    // Assert that "Lihat Detail" (eye icon button), "Tinjau", "Hapus" do not exist inside this row's action cell
    const actionCell = confirmReceiveBtn.locator('..')
    const viewDetailBtn = actionCell.locator('button[title="Lihat Detail"]')
    await expect(viewDetailBtn).toHaveCount(0)

    const reviewBtn = actionCell.locator('button:has-text("Tinjau")')
    await expect(reviewBtn).toHaveCount(0)

    const deleteBtn = actionCell.locator('button[title="Hapus Pengajuan"]')
    await expect(deleteBtn).toHaveCount(0)

    // 5. Click "Konfirmasi Terima"
    await confirmReceiveBtn.click()
    await page.waitForTimeout(2000)

    // Verify modal is open
    const modalTitle = page.locator('text=Konfirmasi Penerimaan Aset Fisik & Terbitkan BAST')
    await expect(modalTitle).toBeVisible()

    // 6. Verify BAST Document View in modal:
    // a. Table Headers
    const deskripsiTh = page.locator('th:has-text("DESKRIPSI BARANG / ASET")')
    await expect(deskripsiTh).toBeVisible()

    const kelompokTh = page.locator('th:has-text("KELOMPOK ASET")')
    await expect(kelompokTh).toBeVisible()

    const nomorAsetTh = page.locator('th:has-text("NOMOR ASET")')
    await expect(nomorAsetTh).toBeVisible()

    const qtyTh = page.locator('th:has-text("QTY")')
    await expect(qtyTh).toBeVisible()

    const kondisiAsetTh = page.locator('th:has-text("CATATAN KONDISI ASET")')
    await expect(kondisiAsetTh).toBeVisible()

    // Assert "KONDISI" alone or "CATATAN PEMERIKSAAN" does NOT exist as a separate header
    const oldKondisiTh = page.locator('th:text-is("KONDISI")')
    await expect(oldKondisiTh).toHaveCount(0)

    const oldPemeriksaanTh = page.locator('th:has-text("CATATAN PEMERIKSAAN")')
    await expect(oldPemeriksaanTh).toHaveCount(0)

    // b. Signature Section - only 2 columns: "YANG MENYERAHKAN" and "YANG MENERIMA"
    const yangMenyerahkanTh = page.locator('th:has-text("YANG MENYERAHKAN")')
    await expect(yangMenyerahkanTh).toBeVisible()

    const yangMenerimaTh = page.locator('th:has-text("YANG MENERIMA")')
    await expect(yangMenerimaTh).toBeVisible()

    // Assert Finance and Atasan headers do not exist
    const financeSigTh = page.locator('th:has-text("DIPERIKSA OLEH (FINANCE)")')
    await expect(financeSigTh).toHaveCount(0)

    const atasanSigTh = page.locator('th:has-text("DIKETAHUI OLEH (ATASAN)")')
    await expect(atasanSigTh).toHaveCount(0)

    // Take screenshot of the open modal
    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOT_DIR, '02_bast_modal_table_and_two_signature_columns.png'),
      fullPage: false,
    })

    // 7. Test PDF download/route response
    const pdfResponse = await page.request.get(`http://localhost:3000/api/assets/cer/${testCerId}/bast-pdf`)
    expect(pdfResponse.status()).toBe(200)
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf')

    const pdfBuffer = await pdfResponse.body()
    expect(pdfBuffer.length).toBeGreaterThan(1000)

    const pdfSavePath = path.resolve(
      'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/cer-bast-preview.pdf'
    )
    fs.writeFileSync(pdfSavePath, pdfBuffer)
    console.log(`Saved BAST PDF to: ${pdfSavePath} (size: ${pdfBuffer.length} bytes)`)
  })
})
