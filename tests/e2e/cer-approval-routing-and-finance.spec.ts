// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { cerRequests, cerItems } from '../../db/schema/cer'
import { approvals } from '../../db/schema/hero'
import { eq, desc, asc } from 'drizzle-orm'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-approval-finance')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
})

test.describe('CER Full Approval Routing & Post-Director Finance Check Flow', () => {
  test.setTimeout(180000)

  test('Flow lengkap CER IT Device: BIMA Supervisor Routing -> Director -> Finance Check (Syamsul & Evo Dwi) -> PDF A4 Berlogo', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()))
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message))

    // Set desktop standard viewport
    await page.setViewportSize({ width: 1440, height: 900 })

    // 1. Authenticate with standard system credentials
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    if (page.url().includes('/sign-in')) {
      const emailInput = page.locator('#email, input[name="username"]').first()
      await emailInput.waitFor({ state: 'visible', timeout: 10000 })
      await emailInput.fill('71261')
      const passwordInput = page.locator('#password, input[name="password"]').first()
      await passwordInput.fill('Chitra#71261')
      const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
      await submitBtn.click()
      await page.waitForTimeout(4000)
    }

    // 2. Go to CER Page
    console.log('Navigating to CER Page (/dashboard/assets/cer)...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)

    // =========================================================================
    // STEP 1: Buka Modal Form CER & Input Data IT Device
    // =========================================================================
    const openCreateBtn = page.locator('button:has-text("Buat Form CER")').first()
    await expect(openCreateBtn).toBeVisible({ timeout: 15000 })
    await openCreateBtn.click()
    await page.waitForTimeout(1500)

    const dialog = page.locator('[role="dialog"]')
    if (!(await dialog.isVisible())) {
      console.log('Retrying click on Buat Form CER...')
      await openCreateBtn.click()
      await page.waitForTimeout(1500)
    }
    await expect(dialog).toBeVisible({ timeout: 15000 })

    // Fill Subject & Vendor
    const subjectInput = dialog.locator('input[placeholder*="Laptop Developer"]').first()
    const testSubject = `Pengadaan Laptop Developer IT E2E ${Date.now().toString().slice(-4)}`
    await subjectInput.fill(testSubject)

    const vendorInput = dialog.locator('input[placeholder*="Mega Komputindo"]').first()
    await vendorInput.fill('PT Megah Mega Mandiri')

    // Ensure Asset Category is 'IT Device'
    const categorySelect = dialog.locator('select').filter({ hasText: 'IT Device' }).first()
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption('IT Device')
    }

    // Fill Purpose
    const purposeTextarea = dialog.locator('textarea[placeholder*="kebutuhan pengadaan"]').first()
    await purposeTextarea.fill('Kebutuhan unit laptop spesifikasi tinggi untuk engineer developer HERO dan validasi infrastruktur BIMA.')

    // Fill First Item
    const itemDescInput = dialog.locator('input[placeholder*="Dell Latitude"]').first()
    await itemDescInput.fill('Laptop Dell Latitude 5430 i7 16GB RAM')

    const itemPriceInput = dialog.locator('input[type="number"][placeholder="0"]').first()
    await itemPriceInput.fill('17500000')

    const itemAllocInput = dialog.locator('input[placeholder*="Site Balikpapan"]').first()
    await itemAllocInput.fill('IT Dev Site Balikpapan')

    const itemHolderInput = dialog.locator('input[placeholder*="pemakai / holder"]').first()
    await itemHolderInput.fill('Gilang Suryo Wirawan')

    await page.waitForTimeout(800)

    // Screenshot 1: Form CER Step 1 Terisi
    const ss1Path = path.join(ARTIFACT_DIR, '01_cer_form_step1_filled.png')
    await page.screenshot({ path: ss1Path })
    console.log('✓ Captured 01_cer_form_step1_filled.png')

    // =========================================================================
    // STEP 2: Lanjut ke Step 2 (Review & Approval Chain Builder)
    // =========================================================================
    const nextBtn = dialog.locator('button:has-text("Lanjut ke Step 2")').first()
    await nextBtn.click()
    await page.waitForTimeout(2000)

    // Verify Step 2 is active
    await expect(dialog.locator('text=2. Dampak Anggaran (Budget Controller)')).toBeVisible({ timeout: 10000 })
    await expect(dialog.locator('text=3. Rantai Persetujuan & Otorisasi')).toBeVisible()

    // VERIFIKASI: Acknowledge by BIMA Supervisor (Arif Maulana Ghafar) hadir di alur IT Device
    const bimaStep = dialog.locator('text=Acknowledge by BIMA Supervisor').first()
    await expect(bimaStep).toBeVisible({ timeout: 8000 })

    const arifName = dialog.locator('text=Arif Maulana Ghafar').first()
    await expect(arifName).toBeVisible({ timeout: 8000 })

    console.log('✓ BIMA Supervisor (Arif Maulana Ghafar) successfully verified in IT Device routing!')

    // Verify Reorder and Edit buttons exist
    const addApproverBtn = dialog.locator('button:has-text("Tambah Approver")').first()
    await expect(addApproverBtn).toBeVisible()

    // Screenshot 2: Step 2 Approval Chain Builder dengan BIMA Supervisor
    const ss2Path = path.join(ARTIFACT_DIR, '02_cer_step2_bima_routing_builder.png')
    await page.screenshot({ path: ss2Path })
    console.log('✓ Captured 02_cer_step2_bima_routing_builder.png')

    // =========================================================================
    // STEP 3: Submit Form Pengajuan CER
    // =========================================================================
    const submitCerBtn = dialog.locator('button:has-text("Kirim Pengajuan CER")').first()
    await submitCerBtn.click()

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 25000 })
    await page.waitForTimeout(3000)

    // Refresh page to view latest data
    await page.goto('/dashboard/assets/cer', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    // Find the newly created CER
    const createdRow = page.locator('table tbody tr', { hasText: testSubject }).first()
    await expect(createdRow).toBeVisible({ timeout: 15000 })

    // Screenshot 3: Created CER Table Row
    const ss3Path = path.join(ARTIFACT_DIR, '03_cer_created_table_row.png')
    await page.screenshot({ path: ss3Path })
    console.log('✓ Captured 03_cer_created_table_row.png')

    // =========================================================================
    // STEP 4: Simulasikan Approval Lengkap Hingga Direksi -> Pending Finance Check
    // =========================================================================
    // Fetch the CER record from database
    const [dbCer] = await db
      .select()
      .from(cerRequests)
      .where(eq(cerRequests.subject, testSubject))
      .orderBy(desc(cerRequests.id))
      .limit(1)

    expect(dbCer).toBeDefined()
    const cerId = dbCer.id
    console.log(`Advancing approval steps for CER ID: ${cerId} (${dbCer.cerNumber})...`)

    // Mark all organizational approval steps as Approved
    await db
      .update(approvals)
      .set({
        status: 'Approved',
        reviewedAt: new Date(),
        decisionNote: 'Disetujui E2E Verification',
      })
      .where(eq(approvals.cerRequestId, cerId))

    // Set CER status to pending_finance_check for Syamsul Bahri & Evo Dwi
    await db
      .update(cerRequests)
      .set({
        status: 'pending_finance_check',
        currentStepOrder: 7,
        currentApproverTitle: 'Checked by Finance (Input Kelompok & Nomor Aset)',
        currentApproverName: 'Syamsul Bahri / Evo Dwi',
        currentApproverEmployeeId: 990,
        updatedAt: new Date(),
      })
      .where(eq(cerRequests.id, cerId))

    // Reload CER page
    await page.goto('/dashboard/assets/cer', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const pendingFinanceRow = page.locator('table tbody tr', { hasText: testSubject }).first()
    await expect(pendingFinanceRow).toBeVisible({ timeout: 15000 })
    await expect(pendingFinanceRow.locator('text=Checked by Finance').first()).toBeVisible()

    // Verify "Input No. Aset" button is visible
    const inputAssetNumBtn = pendingFinanceRow.locator('button:has-text("Input No. Aset")').first()
    await expect(inputAssetNumBtn).toBeVisible({ timeout: 10000 })

    // Screenshot 4: Row with Pending Finance Check & Button Input No. Aset
    const ss4Path = path.join(ARTIFACT_DIR, '04_cer_pending_finance_check_row.png')
    await page.screenshot({ path: ss4Path })
    console.log('✓ Captured 04_cer_pending_finance_check_row.png')

    // =========================================================================
    // STEP 5: Buka Modal Checked by Finance & Input Kelompok + Nomor Aset
    // =========================================================================
    await inputAssetNumBtn.click()
    await page.waitForTimeout(1000)

    const financeModal = page.locator('[role="dialog"]')
    await expect(financeModal).toBeVisible({ timeout: 10000 })
    await expect(financeModal.locator('text=Checked by Finance (Input Kelompok & Nomor Aset)')).toBeVisible()

    // Pick Kelompok Aset preset: 'IT Device & Elektronik'
    const kelompokBtn = financeModal.locator('button:has-text("IT Device & Elektronik")').first()
    if (await kelompokBtn.isVisible()) {
      await kelompokBtn.click()
    }

    // Input Nomor Aset for the unit
    const assetNumInput = financeModal.locator('input[placeholder*="AST-IT"]').first()
    await assetNumInput.fill(`AST-2026-IT-${cerId.toString().padStart(4, '0')}`)

    // Input Finance notes
    const financeNotesInput = financeModal.locator('textarea[placeholder*="verifikasi akun aset"]').first()
    if (await financeNotesInput.isVisible()) {
      await financeNotesInput.fill('Nomor aset terdaftar di sistem ERP & telah diverifikasi oleh tim Accounting & Asset (Syamsul Bahri & Evo Dwi).')
    }

    await page.waitForTimeout(800)

    // Screenshot 5: Modal Input Kelompok & Nomor Aset Terisi
    const ss5Path = path.join(ARTIFACT_DIR, '05_cer_finance_check_modal_filled.png')
    await page.screenshot({ path: ss5Path })
    console.log('✓ Captured 05_cer_finance_check_modal_filled.png')

    // Submit Finance Check & Generate PDF
    const submitFinanceBtn = financeModal.locator('button:has-text("Simpan & Terbitkan")').first()
    await submitFinanceBtn.click()

    // Wait for modal to close
    await expect(financeModal).not.toBeVisible({ timeout: 25000 })
    await page.waitForTimeout(3000)

    // =========================================================================
    // STEP 6: Verifikasi Status Full Approved & Dokumen PDF Terbit
    // =========================================================================
    await page.goto('/dashboard/assets/cer', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const completedRow = page.locator('table tbody tr', { hasText: testSubject }).first()
    await expect(completedRow).toBeVisible({ timeout: 15000 })

    // Verify Full Approved badge
    await expect(completedRow.locator('text=Full Approved').first()).toBeVisible()

    // Verify Download PDF link is available
    const downloadPdfLink = completedRow.locator('a[title="Unduh Dokumen PDF"]').first()
    await expect(downloadPdfLink).toBeVisible({ timeout: 10000 })

    const href = await downloadPdfLink.getAttribute('href')
    console.log('✓ Generated PDF Link:', href)
    expect(href).toBeTruthy()
    expect(href).toContain('/api/uploads/')

    // Screenshot 6: Status Full Approved & PDF Download Button Ready
    const ss6Path = path.join(ARTIFACT_DIR, '06_cer_full_approved_pdf_ready.png')
    await page.screenshot({ path: ss6Path })
    console.log('✓ Captured 06_cer_full_approved_pdf_ready.png')

    // =========================================================================
    // STEP 7: Buka Detail Modal & Verifikasi PDF A4 Berlogo Chitra Paratama
    // =========================================================================
    const eyeBtn = completedRow.locator('button[title="Lihat Detail"]').first()
    await eyeBtn.click()
    await page.waitForTimeout(1000)

    const detailDialog = page.locator('[role="dialog"]')
    await expect(detailDialog).toBeVisible({ timeout: 10000 })
    await expect(detailDialog.locator('text=Unduh Dokumen CER PDF')).toBeVisible()

    // Screenshot 7: Modal Detail Dokumen CER Full Approved
    const ss7Path = path.join(ARTIFACT_DIR, '07_cer_detail_modal_pdf_link.png')
    await page.screenshot({ path: ss7Path })
    console.log('✓ Captured 07_cer_detail_modal_pdf_link.png')

    // Verify actual PDF endpoint response
    const pdfResponse = await page.evaluate(async (url) => {
      const res = await fetch(url)
      return {
        status: res.status,
        contentType: res.headers.get('content-type'),
      }
    }, href)

    console.log('PDF Endpoint Response:', pdfResponse)
    expect(pdfResponse.status).toBe(200)
    expect(pdfResponse.contentType).toContain('application/pdf')
    console.log('✓ Verified official CER PDF endpoint serves 200 OK application/pdf!')
  })
})
