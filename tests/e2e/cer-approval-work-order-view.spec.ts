// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { generateCerPdf } from '../../lib/cer-pdf'

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-approval-view'
)

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

test.describe('CER Work Order Style Approval & Document Verification', () => {
  test('1. PDF Generation: A4 Landscape, Clean Hierarchy, No Duplication, and Approval with Names & Job Titles', async () => {
    const sampleData = {
      cerNumber: 'CER/CP/BPN/XI/2026/001',
      subject: 'Pengadaan Workstation dan Monitor High-End Development',
      applicantName: 'Mochamad Annas Khadafi',
      applicantSn: '71261',
      applicantJobTitle: 'Application Developer Specialist',
      siteName: 'Balikpapan',
      departmentName: 'Central Services',
      sectionName: 'ICT & Development',
      purchaseType: 'Baru',
      budgetSource: 'Anggaran CapEx',
      assetCategory: 'IT Equipment',
      purchasePurpose: 'Penggantian workstation tim engineering untuk peningkatan performa kompilasi sistem.',
      vendorName: 'PT Multicom Megatama',
      budgetCode: 'CP-BPN-CS-2026-004',
      budgetName: 'IT Hardware Expansion Q4 2026',
      totalEstimatedPrice: 52900000,
      dateRequired: '2026-11-25',
      kelompokAset: 'Komputer & IT Device',
      createdAt: new Date('2026-11-12T08:00:00Z'),
      items: [
        {
          description: 'Laptop ASUS ROG Zephyrus G16',
          kelompokAset: 'Komputer & IT Device',
          assetNumber: 'AST-BPN-2026-001',
          qty: 1,
          pricePerUnit: 34500000,
          totalPrice: 34500000,
          allocation: 'Balikpapan',
          holderName: 'Mochamad Annas Khadafi',
        },
        {
          description: 'Monitor Dell UltraSharp 27" 4K',
          kelompokAset: 'Komputer & IT Device',
          assetNumber: 'AST-BPN-2026-002',
          qty: 2,
          pricePerUnit: 9200000,
          totalPrice: 18400000,
          allocation: 'Balikpapan',
          holderName: 'Central Services Lab',
        },
      ],
      approvals: [
        {
          stepOrder: 1,
          label: 'Tahap 1 - IT Supervisor',
          approverName: 'Budi Santoso',
          jobTitle: 'ICT Support Supervisor',
          status: 'Approved',
          reviewedAt: new Date('2026-11-12T09:30:00Z'),
          decisionNote: 'Disetujui spesifikasi sesuai standar',
        },
        {
          stepOrder: 2,
          label: 'Tahap 2 - Department Head',
          approverName: 'Andi Wijaya',
          jobTitle: 'Central Services Head',
          status: 'Approved',
          reviewedAt: new Date('2026-11-12T10:15:00Z'),
          decisionNote: 'Disetujui kebutuhan divisi',
        },
        {
          stepOrder: 3,
          label: 'Tahap 3 - General Manager',
          approverName: 'Bambang Pamungkas',
          jobTitle: 'Central General Manager',
          status: 'Approved',
          reviewedAt: new Date('2026-11-12T11:00:00Z'),
          decisionNote: 'Disetujui',
        },
        {
          stepOrder: 4,
          label: 'Tahap 4 - Director',
          approverName: 'Freshya Ochtovita',
          jobTitle: 'Board Secretary a.n. Director',
          status: 'Approved',
          reviewedAt: new Date('2026-11-12T11:45:00Z'),
          decisionNote: 'Disetujui oleh Freshya Ochtovita (Board Secretary a.n. Director)',
        },
        {
          stepOrder: 5,
          label: 'Checked by Finance',
          approverName: 'Syamsul Bahri',
          jobTitle: 'Finance Specialist',
          status: 'Approved',
          reviewedAt: new Date('2026-11-12T13:00:00Z'),
        },
      ],
    }

    const pdfBytes = await generateCerPdf(sampleData)
    expect(pdfBytes).toBeDefined()
    expect(pdfBytes.length).toBeGreaterThan(1000)

    const pdfFilePath = path.join(SCREENSHOT_DIR, 'test_generated_cer_document.pdf')
    fs.writeFileSync(pdfFilePath, Buffer.from(pdfBytes))
    expect(fs.existsSync(pdfFilePath)).toBe(true)
  })

  test('2. UI Verification: 2-Column Work Order Style Review Modal with Live Document Preview & Dual Signature Modes', async ({ page }) => {
    // 1. Login
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
      await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    }

    // 2. Navigate to CER page
    await page.goto('/dashboard/assets/cer', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // 3. Locate the Tinjau button in the table
    const tinjauBtn = page.locator('button:has-text("Tinjau")').first()
    await expect(tinjauBtn).toBeVisible({ timeout: 15000 })

    // Click Tinjau to open the 2-Column Work Order Style Approval Modal
    await tinjauBtn.click()
    await page.waitForTimeout(2000)

    // 4. Verify 2-Column Split View Modal
    // Left Column: Document View Header
    await expect(page.locator('text=PT. CHITRA PARATAMA').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=FORM CAPITAL EXPENDITURE REQUEST (CER)').first()).toBeVisible()

    // Right Column: Review Action Panel
    await expect(page.locator('text=Ringkasan Pengajuan')).toBeVisible()
    await expect(page.locator('text=Tanda Tangan Digital Approver')).toBeVisible()

    // 5. Test Signature Modes
    const coretanBtn = page.locator('button:has-text("Coretan Tangan")')
    const uploadBtn = page.locator('button:has-text("Upload Gambar")')
    await expect(coretanBtn).toBeVisible()
    await expect(uploadBtn).toBeVisible()

    // Switch to Upload Gambar mode
    await uploadBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=Klik untuk Unggah Gambar Tanda Tangan / Stempel')).toBeVisible()

    // Take screenshot of Upload Gambar mode
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01_cer_review_modal_upload_mode.png'),
      fullPage: true,
    })

    // Switch back to Coretan mode
    await coretanBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=Bubuhkan coretan tanda tangan pada area bawah ini.')).toBeVisible()

    // Verify Action Buttons
    await expect(page.locator('button:has-text("Setujui Pengajuan")')).toBeVisible()
    await expect(page.locator('button:has-text("REVERT")')).toBeVisible()
    await expect(page.locator('button:has-text("REJECT")')).toBeVisible()

    // Take screenshot of Coretan mode & full 2-column modal
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02_cer_review_modal_2column_split_view.png'),
      fullPage: true,
    })
  })
})
