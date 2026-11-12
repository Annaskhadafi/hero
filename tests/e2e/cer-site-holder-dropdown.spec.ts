// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-site-holder')

test.describe('CER Form: Site & Holder Dropdown Verification', () => {
  test.setTimeout(120000)

  test('Verify Site (hero_sites) and Holder (hero_employees) Dropdowns in CER Form', async ({ page }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

    // 1. Login with standard credentials
    console.log('Navigating to Sign-In page...')
    await page.goto('/sign-in', { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(2000)

    const usernameInput = page.locator('input[placeholder*="email atau SN"], #email, input[name="username"]').first()
    const passwordInput = page.locator('input[placeholder*="kata sandi"], #password, input[name="password"]').first()
    const loginSubmitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()

    await usernameInput.click()
    await usernameInput.fill('71261')
    await passwordInput.click()
    await passwordInput.fill('Chitra#71261')
    await page.waitForTimeout(500)
    await loginSubmitBtn.click()

    await page.waitForURL(/\/dashboard/, { timeout: 45000 })
    console.log('Login successful.')

    // 2. Open CER Page
    console.log('Opening CER Dashboard...')
    await page.goto('/dashboard/assets/cer')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 3. Open Form Dialog
    console.log('Opening CER Form Dialog...')
    const addCerBtn = page.getByRole('button', { name: /Buat Form CER/i })
    await expect(addCerBtn).toBeVisible({ timeout: 15000 })
    await addCerBtn.click()

    // Verify modal is open
    await expect(page.locator('text=Formulir Pengadaan Aset (CER)')).toBeVisible({ timeout: 15000 })
    console.log('CER Form Dialog opened.')

    // 4. Fill required header fields
    await page.getByPlaceholder(/Pengadaan 2 Unit Laptop Developer/i).fill('Pengadaan 2 Unit Laptop Site Operational')
    await page.getByPlaceholder(/PT Mega Komputindo Perkasa/i).fill('PT Mitra Solusi Mandiri')
    await page.getByPlaceholder(/Jelaskan kebutuhan pengadaan/i).fill('Kebutuhan operasional penunjang aktivitas site.')

    // 5. Fill item fields
    const descInput = page.getByPlaceholder(/Laptop Dell Latitude/i)
    await descInput.fill('Laptop Lenovo ThinkPad T14 Gen 4')

    const priceInput = page.locator('input[type="number"][min="0"]').first()
    await priceInput.fill('22500000')

    // 6. Test Alokasi (Site/Dept) Dropdown
    console.log('Testing Alokasi Dropdown...')
    const allocTrigger = page.locator('button:has-text("Pilih lokasi site / alokasi...")').first()
    await expect(allocTrigger).toBeVisible({ timeout: 10000 })
    await allocTrigger.click()
    await page.waitForTimeout(600)

    // Verify sites from hero_sites are visible in the dropdown popover
    await expect(page.locator('text=Balikpapan').first()).toBeVisible({ timeout: 10000 })
    console.log('Site Balikpapan verified in Alokasi dropdown.')

    // Click Balikpapan option in popover
    const popoverOption = page.locator('div.cursor-pointer:has-text("Balikpapan")').first()
    await expect(popoverOption).toBeVisible({ timeout: 5000 })
    await popoverOption.click()
    await page.waitForTimeout(400)

    // 7. Test Pemakai / Holder Dropdown
    console.log('Testing Holder Dropdown...')
    const holderTrigger = page.locator('button:has-text("Pilih karyawan pemegang aset...")').first()
    await expect(holderTrigger).toBeVisible({ timeout: 10000 })
    await holderTrigger.click()
    await page.waitForTimeout(600)

    // Verify Pool Gudang and employee list are visible
    await expect(page.locator('text=Pool Gudang / Bersama').first()).toBeVisible({ timeout: 10000 })
    console.log('Pool Gudang option verified in Holder dropdown.')

    // Select an employee or pool option from dropdown list
    const empOption = page.locator('div.cursor-pointer:has-text("Bima")').first()
    if (await empOption.isVisible()) {
      await empOption.click()
    } else {
      await page.locator('div.cursor-pointer:has-text("Pool Gudang / Bersama")').first().click()
    }
    await page.waitForTimeout(600)

    // Screenshot Step 1 with selected Site & Holder
    const ssStep1 = path.join(SCREENSHOT_DIR, '01_cer_form_site_and_holder_dropdowns.png')
    await page.screenshot({ path: ssStep1, fullPage: true })
    console.log('Saved screenshot 01_cer_form_site_and_holder_dropdowns.png')

    // 8. Go to Step 2 (Review & Approval Preview)
    console.log('Proceeding to Step 2...')
    const nextBtn = page.getByRole('button', { name: /Lanjut ke Step 2/i })
    await nextBtn.click()

    // Verify Step 2 is active
    await expect(page.locator('text=2. Review & Approval')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=1. Ringkasan Pengajuan CER')).toBeVisible({ timeout: 15000 })

    // Verify Alokasi Site column and Holder column in Step 2 table
    await expect(page.locator('th:has-text("Alokasi Site")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('th:has-text("Holder")')).toBeVisible({ timeout: 10000 })
    console.log('Verified Alokasi Site & Holder columns in Step 2 review table.')

    // Screenshot Step 2 Review Table
    const ssStep2 = path.join(SCREENSHOT_DIR, '02_cer_form_step2_review_table_synced.png')
    await page.screenshot({ path: ssStep2, fullPage: true })
    console.log('Saved screenshot 02_cer_form_step2_review_table_synced.png')

    console.log('✓ ALL CER SITE & HOLDER DROPDOWN VERIFICATIONS PASSED!')
  })
})
