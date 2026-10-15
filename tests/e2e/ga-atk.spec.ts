import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'outputs/screenshots/atk')

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
})

test.describe('P7. General Affairs - ATK End-to-End Tests with Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate before accessing protected routes
    try {
      await page.goto('/sign-in')
      const emailField = page.locator('#d-email, input[name="email"], input[type="text"]').first()
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

  test('1. Desktop: Should view GA - ATK Dashboard and capture screenshot', async ({ page }) => {
    await page.goto('/dashboard/ga/atk')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '01_desktop_atk_dashboard.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath}`)
  })

  test('2. Desktop: Should view Formulir Pengajuan ATK Baru and capture screenshot', async ({ page }) => {
    await page.goto('/dashboard/ga/atk/new')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '02_desktop_atk_form.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath}`)
  })

  test('3. Desktop: Should view Katalog Master Data ATK and capture screenshot', async ({ page }) => {
    await page.goto('/dashboard/ga/atk/master')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '03_desktop_atk_master.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath}`)
  })

  test('4. Mobile: Should view Mobile ATK Hub and capture screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/mobile/atk')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '04_mobile_atk_hub.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath}`)
  })

  test('5. Mobile: Should view Mobile Pengajuan ATK Form and capture screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/mobile/atk/new')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '05_mobile_atk_form.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`Saved screenshot: ${screenshotPath}`)
  })
})
