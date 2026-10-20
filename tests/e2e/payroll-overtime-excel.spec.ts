import { test, expect } from '@playwright/test'
import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'outputs/screenshots/timesheet-payroll-overtime')
const ARTIFACT_DIR = 'C:/Users/Anas/.gemini/antigravity/brain/7fd8ebf2-a38a-4daa-8f47-ccf4282a8461'

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
})

test.describe('E2E Validation: Export Excel Payroll Overtime & Dropdown UI', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate before accessing protected routes
    try {
      await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
      const emailField = page.locator('#d-email, input[name="email"], input[type="text"]').first()
      if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailField.fill('71261')
        const passField = page.locator('#password, #d-password, input[name="password"], input[type="password"]').first()
        await passField.fill('Chitra#71261')
        await page.click('button[type="submit"]')
        await page.waitForURL(/\/dashboard|\/mobile/, { timeout: 30000 })
      }
    } catch (e) {
      console.log('Login bypass or already logged in:', e)
    }
  })

  test('Should open Overtime tab, display Payroll Overtime export option, download Excel, and validate contents', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    // 1. Navigate to scheduling-timesheet attendance page
    await page.goto('/dashboard/scheduling-timesheet/attendance', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Filter to AMM Tabang or take the first active attendance row
    const searchInput = page.locator('input[placeholder*="Cari site"]').first()
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('AMM Tabang')
      await page.waitForTimeout(1000)
    }

    // Click the first visible table row to open attendance workspace
    const visibleRow = page.locator('tbody tr:visible').first()
    await expect(visibleRow).toBeVisible({ timeout: 10000 })
    await visibleRow.click()
    await page.waitForTimeout(2500)

    // 2. Click the 'Overtime' tab button inside the workspace
    const overtimeTabBtn = page.locator('button:has-text("Overtime")').first()
    await expect(overtimeTabBtn).toBeVisible({ timeout: 10000 })
    await overtimeTabBtn.click()
    await page.waitForTimeout(2000)

    // 3. Take screenshot 1: Overtime tab active
    const ssPath1 = path.join(SCREENSHOT_DIR, '01_overtime_summary_tab.png')
    await page.screenshot({ path: ssPath1, fullPage: false })
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(ssPath1, path.join(ARTIFACT_DIR, '01_overtime_summary_tab.png'))
    }

    // 4. Click the 'Export Excel' dropdown button
    const exportExcelBtn = page.locator('button:has-text("Export Excel")').first()
    await expect(exportExcelBtn).toBeVisible()
    await exportExcelBtn.click()
    await page.waitForTimeout(800)

    // 5. Verify the dropdown menu items
    const payrollOtMenuItem = page.locator('text=Payroll Overtime (Sesuai Setup Lembur)').first()
    await expect(payrollOtMenuItem).toBeVisible()

    const subtitleText = page.locator('text=Hitungan lembur payroll + kolom HK & HL masuk').first()
    await expect(subtitleText).toBeVisible()

    // 6. Take screenshot 2: Dropdown opened showing Payroll Overtime option
    const ssPath2 = path.join(SCREENSHOT_DIR, '02_export_excel_dropdown_payroll_overtime.png')
    await page.screenshot({ path: ssPath2, fullPage: false })
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(ssPath2, path.join(ARTIFACT_DIR, '02_export_excel_dropdown_payroll_overtime.png'))
    }

    // 7. Click 'Payroll Overtime (Sesuai Setup Lembur)' and wait for download
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await payrollOtMenuItem.click()
    const download = await downloadPromise

    const suggestedFilename = download.suggestedFilename()
    console.log('Downloaded filename:', suggestedFilename)
    expect(suggestedFilename).toMatch(/Rekap_Payroll_Overtime.*\.xlsx/)

    const downloadPath = path.join(SCREENSHOT_DIR, suggestedFilename)
    await download.saveAs(downloadPath)
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(downloadPath, path.join(ARTIFACT_DIR, 'downloaded_payroll_overtime.xlsx'))
    }

    // 8. Validate the Excel file contents using ExcelJS
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(downloadPath)

    // Check worksheet
    const worksheet = workbook.getWorksheet('Payroll Overtime')
    expect(worksheet).toBeDefined()
    expect(worksheet?.name).toBe('Payroll Overtime')

    // Check Header Titles
    const titleCell = worksheet?.getCell('A2').value
    console.log('Sheet Title (A2):', titleCell)
    expect(String(titleCell)).toContain('LAPORAN REKAPITULASI HITUNGAN LEMBUR PAYROLL')

    // Check Header Row 6 (Top Header)
    const row6Values = worksheet?.getRow(6).values as any[]
    console.log('Row 6 Columns count:', row6Values.length)
    const row6String = row6Values.join(' | ')
    console.log('Row 6 Headers:', row6String)
    expect(row6String).toContain('Total Hitungan Lembur')
    expect(row6String).toContain('Hari Kerja (HK)')
    expect(row6String).toContain('Hari Libur (HL)')

    // Check Subheader Row 7
    const row7Values = worksheet?.getRow(7).values as any[]
    const row7String = row7Values.join(' | ')
    console.log('Row 7 Subheaders:', row7String)
    expect(row7String).toContain('Hitungan Lembur')
    expect(row7String).toContain('HK Masuk')
    expect(row7String).toContain('HL Masuk')

    // Check that we have employee rows and grand total row
    const rowCount = worksheet?.rowCount ?? 0
    console.log('Total worksheet rows:', rowCount)
    expect(rowCount).toBeGreaterThan(7)

    // Bottom row should be TOTAL KESELURUHAN
    const lastRow = worksheet?.getRow(rowCount)
    const lastRowValues = (lastRow?.values as any[]).join(' | ')
    console.log('Grand Total Row:', lastRowValues)
    expect(lastRowValues).toContain('TOTAL KESELURUHAN')

    // 9. Take screenshot 3: UI after download completed
    await page.waitForTimeout(1000)
    const ssPath3 = path.join(SCREENSHOT_DIR, '03_after_download_success.png')
    await page.screenshot({ path: ssPath3, fullPage: false })
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(ssPath3, path.join(ARTIFACT_DIR, '03_after_download_success.png'))
    }
  })
})
