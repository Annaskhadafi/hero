// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'outputs/screenshots/cer-tabs')

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
})

test.describe('CER Tabs: Daftar Pengajuan (All CER View-Only) & Daftar Pengajuan Saya', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120000)

  test('Verify 3 tabs, View-Only in Tab 1, and user workflow in Tab 2', async ({ page }) => {
    // 1. Authenticate before accessing protected dashboard routes
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

    // 2. Navigate to CER page
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Check tabs in exact order: 1) all_requests, 2) my_requests, 3) receiving
    const tabAll = page.getByRole('tab', { name: /^Daftar Pengajuan \d+$/ })
    const tabMine = page.getByRole('tab', { name: /^Daftar Pengajuan Saya/ })
    const tabBast = page.getByRole('tab', { name: /^Penerimaan & BAST/ })

    await expect(tabAll).toBeVisible({ timeout: 15000 })
    await expect(tabMine).toBeVisible({ timeout: 15000 })
    await expect(tabBast).toBeVisible({ timeout: 15000 })

    // Assert tab labels
    await expect(tabAll).toContainText('Daftar Pengajuan')
    await expect(tabMine).toContainText('Daftar Pengajuan Saya')
    await expect(tabBast).toContainText('Penerimaan & BAST')

    // Default tab should be "Daftar Pengajuan" (all_requests)
    await expect(tabAll).toHaveAttribute('data-state', 'active')

    // Find table in active tab (Tab 1: all_requests)
    const activePanel1 = page.locator('[role="tabpanel"][data-state="active"]')
    const table1 = activePanel1.locator('table')
    await expect(table1).toBeVisible()

    // In Tab 1: Table contains CERs, and action cell ONLY has View (Eye) button
    const rows = table1.locator('tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    const firstActionCell = rows.first().locator('td').last()
    await expect(firstActionCell.locator('button[title="Lihat Detail Pengajuan"]')).toBeVisible()

    // Assert that action/operational buttons are NOT present in Tab 1
    await expect(firstActionCell.locator('button:has-text("Tinjau")')).toHaveCount(0)
    await expect(firstActionCell.locator('button:has-text("Input No. Aset")')).toHaveCount(0)
    await expect(firstActionCell.locator('button:has-text("Revisi Pengajuan")')).toHaveCount(0)
    await expect(firstActionCell.locator('button:has-text("Terima")')).toHaveCount(0)

    const screenshotPath1 = path.join(SCREENSHOT_DIR, '01_cer_all_requests_view_only.png')
    await page.screenshot({ path: screenshotPath1, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath1}`)

    // 3. Navigate to Tab 2: "Daftar Pengajuan Saya"
    await tabMine.click()
    await page.waitForTimeout(500)

    await expect(tabMine).toHaveAttribute('data-state', 'active')

    const activePanel2 = page.locator('[role="tabpanel"][data-state="active"]')
    const table2 = activePanel2.locator('table')
    await expect(table2).toBeVisible()

    const screenshotPath2 = path.join(SCREENSHOT_DIR, '02_cer_my_requests_tab.png')
    await page.screenshot({ path: screenshotPath2, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath2}`)
  })
})
