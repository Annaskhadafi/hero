// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'outputs/screenshots/budget-controller')

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
})

test.describe('Budget Controller Separation & CER Tabs Cleanup', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    // 1. Authenticate before accessing protected dashboard routes
    await page.goto('/sign-in')
    await page.getByPlaceholder('Masukkan email atau SN').fill('mochamad.khadafi@chitraparatama.co.id')
    await page.getByPlaceholder('Masukkan kata sandi').fill('Chitra#71261')
    await page.getByRole('button', { name: 'Masuk ke HERO' }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  })

  test('1. View dedicated Budget Controller page and capture screenshot', async ({ page }) => {
    await page.goto('/dashboard/assets/budget-controller')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Verify Title & KPI Cards
    await expect(page.locator('h1')).toContainText(/Budget Controller/i)
    await expect(page.locator('text=Total Pagu CapEx')).toBeVisible()
    await expect(page.locator('text=Total Terpakai / Komitmen')).toBeVisible()
    await expect(page.locator('text=Sisa Saldo Pagu')).toBeVisible()
    await expect(page.locator('text=Realisasi Penyerapan')).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '01_budget_controller_page.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath}`)
  })

  test('2. Verify CER page tabs are cleaned up (no Budget Controller tab)', async ({ page }) => {
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('networkidle').catch(() => {})

    await expect(page.locator('h1')).toContainText(/Pengadaan Aset \(CER\)/i)

    // Expected tabs
    await expect(page.locator('button[role="tab"]:has-text("Daftar Pengajuan")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Buat Form CER")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Penerimaan & BAST")')).toBeVisible()

    // Tab Budget Controller must NOT exist in the tabs list
    const budgetTab = page.locator('button[role="tab"]:has-text("Budget Controller")')
    await expect(budgetTab).toHaveCount(0)

    const screenshotPath = path.join(SCREENSHOT_DIR, '02_cer_cleaned_tabs.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath}`)
  })

  test('3. Verify legacy URL /dashboard/assets/cer?tab=budget redirects to Budget Controller', async ({ page }) => {
    await page.goto('/dashboard/assets/cer?tab=budget')
    await page.waitForURL(/\/dashboard\/assets\/budget-controller/, { timeout: 15000 })

    await expect(page.locator('h1')).toContainText(/Budget Controller/i)

    const screenshotPath = path.join(SCREENSHOT_DIR, '03_legacy_url_redirect.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath}`)
  })
})
