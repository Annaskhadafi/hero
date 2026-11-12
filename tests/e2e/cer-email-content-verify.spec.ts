// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { db } from '../../db'
import { emailDeliveryLogs } from '../../db/schema/hero'
import { eq, desc, like } from 'drizzle-orm'
import { buildCerSubmittedEmailHtml } from '../../lib/cer-email'

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-email'
)

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

test.describe('CER Email Notification Reconstruction & Full Form Verification', () => {
  test.setTimeout(120000)

  test('1. Unit Test HTML Builder: Verify focused header, no double text, and complete form data', async () => {
    const sample = {
      approverEmail: 'director@chitraparatama.com',
      approverName: 'Board of Directors',
      cerNumber: 'CER/CP/BPN/XI/2026/999',
      subject: 'Pengadaan Laptop Workstation IT & Monitor High-Res',
      applicantName: 'Mochamad Annas Khadafi',
      applicantSn: '71261',
      applicantJobTitle: 'Application Developer Specialist',
      siteName: 'Balikpapan',
      departmentName: 'Central Services',
      assetCategory: 'IT Equipment',
      purchaseType: 'Baru',
      dateRequired: '2026-11-20',
      vendorName: 'PT Multicom Megatama',
      budgetSource: 'Anggaran',
      budgetCode: 'CP-BPN-CS-2026-004',
      budgetName: 'IT Hardware Expansion Q4 2026',
      purchasePurpose: 'Penggantian workstation lama dan aksesoris deployment.',
      items: [
        {
          description: 'Laptop ASUS ROG Zephyrus G16',
          qty: 1,
          pricePerUnit: 34500000,
          totalPrice: 34500000,
          allocation: 'Balikpapan',
          holderName: 'Mochamad Annas Khadafi',
        },
        {
          description: 'Monitor Dell UltraSharp 27" 4K',
          qty: 2,
          pricePerUnit: 9200000,
          totalPrice: 18400000,
          allocation: 'Balikpapan',
          holderName: 'Central Services Lab',
        },
      ],
      totalEstimatedPrice: 52900000,
      approvalStep: 'Step 6 - Board of Directors Approval',
      approvalUrl: 'https://hero.chitraparatama.com/dashboard/approval',
      cc: ['freshya.ochtovita@chitraparatama.co.id'],
    }

    const html = buildCerSubmittedEmailHtml(sample, sample.approvalUrl)

    // Save rendered HTML for inspection
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'test_rendered_email.html'), html, 'utf-8')

    // A. Clean and Focused Header Checks
    expect(html).toContain(sample.cerNumber)
    expect(html).toContain(sample.subject)
    expect(html).toContain('Step 6 - Board of Directors Approval')
    expect(html).toContain('CC &amp; Co-Approval: Freshya Ochtovita (Board Secretary)')

    // B. Anti-Redundancy Checks (Banned previous bad patterns)
    expect(html).not.toContain('Permohonan Baru')
    expect(html).not.toContain('Notifikasi email &amp; bell untuk approver saat permohonan CER baru diajukan.')
    expect(html).not.toContain('[CER Approval] Permohonan Baru')

    // C. Complete Form Data Checks
    expect(html).toContain('Mochamad Annas Khadafi')
    expect(html).toContain('71261')
    expect(html).toContain('Application Developer Specialist')
    expect(html).toContain('Balikpapan')
    expect(html).toContain('Central Services')
    expect(html).toContain('IT Equipment')
    expect(html).toContain('PT Multicom Megatama')
    expect(html).toContain('CP-BPN-CS-2026-004 - IT Hardware Expansion Q4 2026')
    expect(html).toContain('Penggantian workstation lama dan aksesoris deployment.')

    // D. Item Table Checks
    expect(html).toContain('Laptop ASUS ROG Zephyrus G16')
    expect(html).toContain('Monitor Dell UltraSharp 27" 4K')
    expect(html).toContain('Rp 34.500.000')
    expect(html).toContain('Rp 18.400.000')
    expect(html).toContain('Rp 52.900.000')
    expect(html).toContain('Central Services Lab')

    // E. CTA Button Check
    expect(html).toContain('Buka Inbox Approval &amp; Review Dokumen')
  })

  test('2. Live Flow & Delivery Log Verification: Verify email record in DB', async ({ page }) => {
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
      await page.waitForURL(/\/dashboard/, { timeout: 30000 })
      console.log('Login successful.')
    }

    // 2. Open CER Page
    console.log('Opening CER page...')
    await page.goto('/dashboard/assets/cer', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // 3. Open Form CER Modal
    const openCreateBtn = page.locator('button:has-text("Buat Form CER")').first()
    await expect(openCreateBtn).toBeVisible({ timeout: 20000 })
    await openCreateBtn.click()
    await page.waitForTimeout(1500)

    const dialog = page.locator('[role="dialog"]')
    if (!(await dialog.isVisible())) {
      console.log('Retrying click on Buat Form CER...')
      await openCreateBtn.click()
      await page.waitForTimeout(1500)
    }
    await expect(page.locator('text=Formulir Pengadaan Aset (CER)')).toBeVisible({ timeout: 15000 })

    const uniqueSubject = `Pengadaan IT Email Reconstruction ${Date.now()}`

    // 4. Fill required header fields
    await page.getByPlaceholder(/Pengadaan 2 Unit Laptop Developer/i).fill(uniqueSubject)
    await page.getByPlaceholder(/PT Mega Komputindo Perkasa/i).fill('PT Mitra IT Prima')
    await page.getByPlaceholder(/Jelaskan kebutuhan pengadaan/i).fill('Kebutuhan penunjang deployment HERO 2026.')

    // 5. Fill item fields
    const descInput = page.getByPlaceholder(/Laptop Dell Latitude/i)
    await descInput.fill('MacBook Air M3 15 Inch')

    const priceInput = page.locator('input[type="number"][min="0"]').first()
    await priceInput.fill('22000000')

    // 6. Alokasi site & holder
    const allocTrigger = page.locator('button:has-text("Pilih lokasi site / alokasi...")').first()
    if (await allocTrigger.isVisible()) {
      await allocTrigger.click()
      await page.waitForTimeout(400)
      const siteOpt = page.locator('div.cursor-pointer:has-text("Balikpapan")').first()
      if (await siteOpt.isVisible()) {
        await siteOpt.click()
        await page.waitForTimeout(300)
      }
    }

    const holderTrigger = page.locator('button:has-text("Pilih karyawan pemegang aset...")').first()
    if (await holderTrigger.isVisible()) {
      await holderTrigger.click()
      await page.waitForTimeout(400)
      const poolOpt = page.locator('div.cursor-pointer:has-text("Pool Gudang / Bersama")').first()
      if (await poolOpt.isVisible()) {
        await poolOpt.click()
        await page.waitForTimeout(300)
      }
    }

    // 7. Proceed to Step 2
    console.log('Proceeding to Step 2...')
    const nextBtn = page.getByRole('button', { name: /Lanjut ke Step 2/i })
    await expect(nextBtn).toBeVisible({ timeout: 10000 })
    await nextBtn.click()
    await page.waitForTimeout(1000)

    // 8. Submit CER Form in Step 2
    console.log('Submitting CER Form in Step 2...')
    const submitBtn = page.getByRole('button', { name: /Kirim Pengajuan CER/i })
    await expect(submitBtn).toBeVisible({ timeout: 10000 })
    await submitBtn.click()

    // Wait for submission completion
    await page.waitForTimeout(4000)

    // 9. Query emailDeliveryLogs for the submitted CER with polling
    console.log('Querying emailDeliveryLogs with polling...')
    let latestLog = null
    for (let attempt = 1; attempt <= 15; attempt++) {
      const [found] = await db
        .select({
          id: emailDeliveryLogs.id,
          subject: emailDeliveryLogs.subject,
          htmlContent: emailDeliveryLogs.htmlContent,
          textContent: emailDeliveryLogs.textContent,
          createdAt: emailDeliveryLogs.createdAt,
        })
        .from(emailDeliveryLogs)
        .where(like(emailDeliveryLogs.subject, `%${uniqueSubject}%`))
        .orderBy(desc(emailDeliveryLogs.createdAt))
        .limit(1)

      if (found) {
        latestLog = found
        break
      }
      await page.waitForTimeout(1000)
    }

    expect(latestLog).toBeDefined()
    console.log('Found delivery log:', latestLog?.subject)

    // Verify Subject
    expect(latestLog.subject).toContain('[CER Approval]')
    expect(latestLog.subject).toContain(uniqueSubject)
    expect(latestLog.subject).not.toContain('Permohonan Baru')

    // Verify HTML Content
    if (latestLog.htmlContent) {
      expect(latestLog.htmlContent).toContain(uniqueSubject)
      expect(latestLog.htmlContent).toContain('MacBook Air M3 15 Inch')
      expect(latestLog.htmlContent).toContain('PT Mitra IT Prima')
      expect(latestLog.htmlContent).toContain('Kebutuhan penunjang deployment HERO 2026.')
      expect(latestLog.htmlContent).not.toContain('Notifikasi email &amp; bell untuk approver saat permohonan CER baru diajukan.')
    }

    // Capture screenshot of CER page showing newly created CER
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02_cer_list_after_submission.png'),
      fullPage: true,
    })
    console.log('Screenshot saved: 02_cer_list_after_submission.png')
  })
})
