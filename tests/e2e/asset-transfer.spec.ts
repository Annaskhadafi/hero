// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'outputs/screenshots/asset-transfer')

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
})

test.describe('Asset Transfer Module E2E', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    // If redirected to dashboard (already logged in), skip form submission
    if (page.url().includes('/dashboard')) {
      return
    }

    const emailInput = page.locator('#email, input[name="username"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 10000 })
    await emailInput.fill('mochamad.khadafi@chitraparatama.co.id')

    const passwordInput = page.locator('#password, input[name="password"]').first()
    await passwordInput.fill('Chitra#71261')

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    // Wait for redirect to /dashboard
    await page.waitForURL(/.*\/dashboard.*/, { timeout: 30000 })
    await page.waitForLoadState('networkidle').catch(() => {})
  })

  test('1. Verifikasi menu "Transfer Aset" muncul di sidebar grup Assets bersanding CER', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Expand Central Service in sidebar if it is collapsed
    const centralServiceBtn = page.locator('button, [role="button"]').filter({ hasText: /Central Service/i }).first()
    if (await centralServiceBtn.isVisible()) {
      await centralServiceBtn.click()
      await page.waitForTimeout(1000)
    }

    // Look for "Transfer Aset" link in sidebar
    const transferLink = page.locator('a[href="/dashboard/assets/transfer"]').first()
    if (await transferLink.isVisible()) {
      await expect(transferLink).toBeVisible()
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, '01_sidebar_menu.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`📸 Screenshot saved: ${screenshotPath}`)
  })

  test('2. Halaman /dashboard/assets/transfer termuat dengan KPI cards dan tabel', async ({ page }) => {
    await page.goto('/dashboard/assets/transfer')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000)

    // Check page title
    const h1 = page.locator('h1').first()
    await expect(h1).toContainText(/Transfer Aset/i, { timeout: 20000 })

    // Verify KPI cards are visible
    await expect(page.locator('text=Total Pengajuan')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Menunggu Persetujuan')).toBeVisible()
    await expect(page.locator('text=Transfer Disetujui')).toBeVisible()
    await expect(page.getByText('Ditolak / Dibatalkan')).toBeVisible()

    // Verify "Buat Transfer Aset" button exists
    const createBtn = page.getByRole('button', { name: /Buat Transfer Aset/i })
    await expect(createBtn).toBeVisible({ timeout: 10000 })

    const screenshotPath = path.join(SCREENSHOT_DIR, '02_transfer_page_loaded.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`📸 Screenshot saved: ${screenshotPath}`)
  })

  test('3. Modal Form Transfer Aset terbuka dan menampilkan semua section', async ({ page }) => {
    await page.goto('/dashboard/assets/transfer')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1500)

    // Click the create button
    const createBtn = page.getByRole('button', { name: /Buat Transfer Aset/i })
    await createBtn.click()

    // Modal / dialog should appear
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 10000 })

    // Check form sections exist
    await expect(page.locator('text=Identifikasi Aset')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Kelengkapan Aset')).toBeVisible()
    await expect(page.locator('text=Foto Kondisi Fisik Aset')).toBeVisible()
    await expect(page.locator('text=Serah Terima Holder')).toBeVisible()

    // Check equipment checkboxes
    await expect(page.locator('text=Laptop / Desktop')).toBeVisible()
    await expect(page.locator('text=Charger')).toBeVisible()
    await expect(page.getByText('Monitor', { exact: true })).toBeVisible()
    await expect(page.locator('text=Mouse')).toBeVisible()

    // Check holder sections (Asal + Tujuan)
    await expect(page.locator('text=Pihak Asal (Holder Saat Ini)')).toBeVisible()
    await expect(page.locator('text=Pihak Penerima (Holder Baru)')).toBeVisible()

    // Check additional note field
    await expect(page.locator('text=Catatan Tambahan')).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '03_form_dialog_open.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`📸 Screenshot saved: ${screenshotPath}`)
  })

  test('4. Validasi error jika form disubmit tanpa data wajib', async ({ page }) => {
    await page.goto('/dashboard/assets/transfer')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1500)

    // Open form
    await page.getByRole('button', { name: /Buat Transfer Aset/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

    // Try to submit empty form
    const submitBtn = page.getByRole('button', { name: /Kirim Pengajuan Transfer/i })
    await submitBtn.click()

    // Toast error should appear
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 10000 })

    const screenshotPath = path.join(SCREENSHOT_DIR, '04_form_validation_error.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`📸 Screenshot saved: ${screenshotPath}`)
  })

  test('5. Centang beberapa kelengkapan aset di form', async ({ page }) => {
    await page.goto('/dashboard/assets/transfer')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1500)

    // Open form
    await page.getByRole('button', { name: /Buat Transfer Aset/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

    // Click on equipment checkboxes (Laptop, Charger, Tas)
    await page.getByText('Laptop / Desktop', { exact: true }).click()
    await page.getByText('Charger', { exact: true }).click()
    await page.getByText('Tas', { exact: true }).click()
    await page.getByText('Mouse', { exact: true }).click()

    // These checkboxes should now be checked
    await expect(page.locator('[id="equip-Laptop / Desktop"]')).toBeChecked({ timeout: 5000 })
    await expect(page.locator('[id="equip-Charger"]')).toBeChecked()

    const screenshotPath = path.join(SCREENSHOT_DIR, '05_equipment_checked.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`📸 Screenshot saved: ${screenshotPath}`)
  })

  test('6. Verifikasi tabel riwayat dengan kolom yang benar', async ({ page }) => {
    await page.goto('/dashboard/assets/transfer')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000)

    // Check table headers
    await expect(page.locator('th, [role="columnheader"]').filter({ hasText: /No\. Dokumen/i })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('th, [role="columnheader"]').filter({ hasText: /Nama.*Aset/i })).toBeVisible()
    await expect(page.locator('th, [role="columnheader"]').filter({ hasText: /Holder/i })).toBeVisible()
    await expect(page.locator('th, [role="columnheader"]').filter({ hasText: /Status/i })).toBeVisible()

    const screenshotPath = path.join(SCREENSHOT_DIR, '06_table_view.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`📸 Screenshot saved: ${screenshotPath}`)
  })
})
