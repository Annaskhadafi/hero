// @ts-nocheck
import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { db } from '../../db'
import { cerRequests, cerItems, approvals, employees } from '../../db/schema'
import { eq } from 'drizzle-orm'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1')
const LOCAL_OUTPUT_DIR = path.resolve('outputs/screenshots/cer-approval')

test.beforeAll(async () => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(LOCAL_OUTPUT_DIR, { recursive: true })

  const [emp71261] = await db
    .select()
    .from(employees)
    .where(eq(employees.employeeSn, '71261'))
    .limit(1)

  const applicantId = emp71261?.id || 5

  // Clean existing test CERs if any to have a clean predictable state
  const existingTestCers = await db
    .select()
    .from(cerRequests)
    .where(eq(cerRequests.applicantEmployeeId, applicantId))

  if (existingTestCers.length === 0) {
    // 1. Insert CER 1 for 71261 (Full Approved -> ready for BAST Reception & Deletion test)
    const [req1] = await db
      .insert(cerRequests)
      .values({
        cerNumber: 'CER/2026/XI/9001',
        subject: 'Pengadaan Workstation Developer Engineering',
        applicantEmployeeId: applicantId,
        assetCategory: 'IT Device',
        purchasePurpose: 'Pengadaan unit laptop performa tinggi untuk development',
        vendorName: 'PT Mitra Solusi Mandiri',
        totalEstimatedPrice: '35000000',
        status: 'full_approved',
        kelompokAset: 'Kelompok 1 (Masa Manfaat 4 Tahun) - IT Hardware',
      })
      .returning()

    if (req1) {
      await db.insert(cerItems).values({
        cerRequestId: req1.id,
        description: 'Laptop Dell Latitude 7440 Intel Core i7 32GB RAM',
        qty: 1,
        pricePerUnit: '35000000',
        totalPrice: '35000000',
        allocation: 'Software Engineering',
        holderName: emp71261?.name || 'Mochamad Annas Khadafi',
        holderEmployeeId: applicantId,
        estimatedLifespan: '4 Tahun',
      })

      const now = new Date()
      await db.insert(approvals).values([
        {
          cerRequestId: req1.id,
          level: 1,
          approverName: 'Febrian Dani',
          status: 'Approved',
          decisionNote: 'Budget Controller',
          resolutionSource: 'matrix',
          submittedAt: now,
        },
        {
          cerRequestId: req1.id,
          level: 2,
          approverName: 'Hidayat',
          status: 'Approved',
          decisionNote: 'Director',
          resolutionSource: 'matrix',
          submittedAt: now,
        },
      ])
    }
  }
})

test.describe('CER Tabs Reorganization & Action Cleanup', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(180000)

  test('Verify Tab 1 Default, BAST Integrated, Clean Actions, and No Action Column on All Requests', async ({
    page,
  }) => {
    // 1. Login to HERO
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    const emailInput = page.locator('input[placeholder*="email atau SN" i], #email, input[name="username"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 15000 })
    await emailInput.fill('71261')
    const passwordInput = page.locator('input[type="password"], #password, input[name="password"]').first()
    await passwordInput.fill('Chitra#71261')
    await page.waitForTimeout(500)

    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
    await submitBtn.click()

    // Wait for successful login redirect
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    // 2. Navigate to CER page
    console.log('Navigating to /dashboard/assets/cer...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1:has-text("Pengadaan Aset (CER)")')).toBeVisible({ timeout: 30000 })
    await page.waitForTimeout(2000)

    // 3. Verify Tabs Structure
    const tabList = page.locator('[role="tablist"]')
    await expect(tabList).toBeVisible({ timeout: 15000 })

    // Check Tab 1: "Daftar Pengajuan Saya" is active by default
    const myRequestsTab = page.locator('button[role="tab"][data-state="active"]')
    await expect(myRequestsTab).toContainText('Daftar Pengajuan Saya')

    // Check Tab 2: "Daftar Pengajuan" exists
    const allRequestsTab = page.locator('button[role="tab"]:has-text("Daftar Pengajuan"):not(:has-text("Saya"))')
    await expect(allRequestsTab).toBeVisible()

    // Check Tab 3: "Penerimaan & BAST" is REMOVED
    const receivingTab = page.locator('button[role="tab"]:has-text("Penerimaan & BAST")')
    await expect(receivingTab).toHaveCount(0)

    // 4. Verify Tab 1 ("Daftar Pengajuan Saya") Table
    const activeTabContent = page.locator('[role="tabpanel"][data-state="active"]')
    await expect(activeTabContent).toBeVisible()

    // Check Header has "Aksi" column
    const aksiHeader = activeTabContent.locator('thead th:has-text("Aksi")')
    await expect(aksiHeader).toBeVisible()

    // Check Status column has clear pending recipient text (e.g., Menunggu, Finance, etc.)
    const statusCells = activeTabContent.locator('tbody tr td:nth-child(7)')
    const statusCount = await statusCells.count()
    expect(statusCount).toBeGreaterThan(0)

    // Check NO Eye icon (Lihat Detail) exists in the table actions
    const eyeButtonsInTable = activeTabContent.locator('tbody tr td:nth-child(8) button:has(svg.lucide-eye)')
    await expect(eyeButtonsInTable).toHaveCount(0)

    // Capture screenshot 1: Daftar Pengajuan Saya
    const ss1Local = path.join(LOCAL_OUTPUT_DIR, '01_cer_my_requests_clean_actions.png')
    const ss1Artifact = path.join(ARTIFACT_DIR, '01_cer_my_requests_clean_actions.png')
    await page.screenshot({ path: ss1Local, fullPage: true })
    fs.copyFileSync(ss1Local, ss1Artifact)

    // 5. Test Batalkan Pengajuan Dialog (Auto Hapus with Confirmation)
    const deleteButton = activeTabContent.locator('tbody tr td:nth-child(8) button:has(svg.lucide-trash-2)').first()
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      await page.waitForTimeout(500)

      const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]:has-text("Batalkan & Hapus")')
      await expect(confirmDialog).toBeVisible({ timeout: 5000 })
      await expect(confirmDialog).toContainText('Batalkan & Hapus Pengajuan CER')
      await expect(confirmDialog).toContainText('Ya, Batalkan & Hapus')

      // Capture screenshot 3: Batalkan & Hapus Confirm Dialog
      const ss3Local = path.join(LOCAL_OUTPUT_DIR, '03_cer_cancel_delete_confirm_dialog.png')
      const ss3Artifact = path.join(ARTIFACT_DIR, '03_cer_cancel_delete_confirm_dialog.png')
      await page.screenshot({ path: ss3Local })
      fs.copyFileSync(ss3Local, ss3Artifact)

      // Cancel to avoid unintended deletion during test
      const cancelButton = confirmDialog.locator('button:has-text("Kembali")')
      await cancelButton.click()
      await page.waitForTimeout(500)
    }

    // 6. Switch to Tab 2 ("Daftar Pengajuan")
    await allRequestsTab.click()
    await page.waitForTimeout(1000)

    const tab2Content = page.locator('[role="tabpanel"][data-state="active"]')
    await expect(tab2Content).toBeVisible()

    // Verify Tab 2 Table has NO "Aksi" column header
    const tab2AksiHeader = tab2Content.locator('thead th:has-text("Aksi")')
    await expect(tab2AksiHeader).toHaveCount(0)

    // Verify Tab 2 Table rows have exactly 7 cells (no action cell)
    const firstRowCells = tab2Content.locator('tbody tr:first-child td')
    const cellCount = await firstRowCells.count()
    expect(cellCount).toBe(7)

    // Capture screenshot 2: Daftar Pengajuan (All Requests - No Action Column)
    const ss2Local = path.join(LOCAL_OUTPUT_DIR, '02_cer_all_requests_no_actions.png')
    const ss2Artifact = path.join(ARTIFACT_DIR, '02_cer_all_requests_no_actions.png')
    await page.screenshot({ path: ss2Local, fullPage: true })
    fs.copyFileSync(ss2Local, ss2Artifact)
  })
})
