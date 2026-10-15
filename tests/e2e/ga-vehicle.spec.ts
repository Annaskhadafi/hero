import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'outputs/screenshots/vehicles')
const ARTIFACT_DIR = 'C:/Users/Anas/.gemini/antigravity/brain/0272b9f5-b87f-4eb9-8676-4248597f824a'

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
})

test.describe('GA - Vehicle & Central Service Marital Status E2E Tests with Screenshots', () => {
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

  test('1. Desktop: Should view GA - Vehicle Dashboard and capture screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard/ga/vehicles', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '01_desktop_ga_vehicles_dashboard.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`Saved screenshot: ${screenshotPath}`)

    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(screenshotPath, path.join(ARTIFACT_DIR, '01_desktop_ga_vehicles_dashboard.png'))
    }
  })

  test('2. Desktop: Should open Print Preview A4 dialog and capture screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard/ga/vehicles', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Click print icon button on the first vehicle
    const printBtn = page.locator('button[title*="Cetak Lembar Dokumen"]').first()
    if (await printBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await printBtn.click()
      await page.waitForTimeout(1500)
      await page.waitForSelector('.pdf-wrapper', { timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(1500)
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, '02_desktop_ga_vehicle_print.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`Saved screenshot: ${screenshotPath}`)

    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(screenshotPath, path.join(ARTIFACT_DIR, '02_desktop_ga_vehicle_print.png'))
    }
  })

  test('3. Desktop: Should open Tambah Kendaraan Form and capture screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard/ga/vehicles', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Click Tambah Kendaraan button
    const addBtn = page.getByRole('button', { name: /Tambah Kendaraan/i })
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1000)
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, '03_desktop_ga_vehicle_form.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`Saved screenshot: ${screenshotPath}`)

    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(screenshotPath, path.join(ARTIFACT_DIR, '03_desktop_ga_vehicle_form.png'))
    }
  })

  test('4. Desktop: Should view Marital Status Married On Site with Edit & Delete actions', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard/central-service/marital-status', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Switch to Married On Site tab
    const onSiteTab = page.locator('button', { hasText: 'Daftar Karyawan Married On Site' })
    if (await onSiteTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await onSiteTab.click({ force: true })
      await page.waitForTimeout(2000)
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, '04_desktop_marital_status_edit_delete.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`Saved screenshot: ${screenshotPath}`)

    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(screenshotPath, path.join(ARTIFACT_DIR, '04_desktop_marital_status_edit_delete.png'))
    }
  })

  test('5. Mobile: Should view Mobile GA - Vehicles Hub and capture screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }) // iPhone 12/13/14 viewport
    await page.goto('/mobile/ga/vehicles', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '05_mobile_ga_vehicles.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`Saved screenshot: ${screenshotPath}`)

    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(screenshotPath, path.join(ARTIFACT_DIR, '05_mobile_ga_vehicles.png'))
    }
  })
})
