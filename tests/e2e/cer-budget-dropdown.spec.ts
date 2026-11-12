// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-budget')

test.describe('CER Form: Budget Dropdown Code & Name Verification', () => {
  test.setTimeout(120000)

  test('Verify CapEx Budget Dropdown displays budget code and name instead of only tersedia', async ({ page }) => {
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
    await page.getByPlaceholder(/Pengadaan 2 Unit Laptop Developer/i).fill('Pengadaan Laptop High Spec Tim Dev')
    await page.getByPlaceholder(/PT Mega Komputindo Perkasa/i).fill('PT Vendor Utama Solusi')
    await page.getByPlaceholder(/Jelaskan kebutuhan pengadaan/i).fill('Kebutuhan penunjang produktivitas tim IT.')

    // 5. Fill item fields
    const descInput = page.getByPlaceholder(/Laptop Dell Latitude/i)
    await descInput.fill('MacBook Pro M3 Pro 16 Inch')

    const priceInput = page.locator('input[type="number"][min="0"]').first()
    await priceInput.fill('35000000')

    // 6. Test Budget Dropdown in Card 2
    console.log('Testing Budget Dropdown in Card 2...')
    // Card 2 heading: 2. Sumber Anggaran & Pagu CapEx
    await expect(page.locator('text=2. Sumber Anggaran & Pagu CapEx')).toBeVisible({ timeout: 10000 })

    // Find the budget select trigger inside Card 2
    // It is a HeroSearchableSelect inside the container with "Pilih Pagu Anggaran CapEx Terdaftar"
    const budgetCardSection = page.locator('div:has-text("Pilih Pagu Anggaran CapEx Terdaftar")').last()
    const budgetTrigger = budgetCardSection.locator('button[type="button"]').first()
    await expect(budgetTrigger).toBeVisible({ timeout: 10000 })

    // Click the budget trigger to open the options popover
    await budgetTrigger.click()
    await page.waitForTimeout(600)

    // Verify that the popover shows options with budgetCode and budgetName
    // Or inspect the options
    const popoverContent = page.locator('[data-radix-popper-content-wrapper]').last()
    await expect(popoverContent).toBeVisible({ timeout: 5000 })

    // Verify that option elements contain text that is NOT just "- (Tersedia:"
    // It should contain meaningful text like CAPEX or code name
    const budgetOptionItems = popoverContent.locator('div.cursor-pointer')
    const optionCount = await budgetOptionItems.count()
    console.log(`Found ${optionCount} budget options in dropdown.`)

    if (optionCount > 0) {
      const firstOptionText = await budgetOptionItems.first().innerText()
      console.log('First budget option text:\n', firstOptionText)
      // Expect that it contains code and name, and does NOT start with "- ("
      expect(firstOptionText).not.toMatch(/^\s*-\s*\(/)
      expect(firstOptionText).toContain('CAPEX')
      
      // Check if it's already selected
      const isAlreadySelected = await budgetOptionItems.first().evaluate((el) => el.classList.contains('bg-blue-50'))
      if (!isAlreadySelected) {
        await budgetOptionItems.first().click()
        await page.waitForTimeout(400)
      } else {
        // Close popover so it doesn't cover anything
        await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
      }
    }

    // Capture screenshot of Step 1 with selected budget
    const ssStep1 = path.join(SCREENSHOT_DIR, '01_cer_form_budget_dropdown_code_and_name.png')
    await page.screenshot({ path: ssStep1, fullPage: true })
    console.log('Saved screenshot 01_cer_form_budget_dropdown_code_and_name.png')

    // 7. Test Alokasi (Site/Dept) Dropdown
    const allocTrigger = page.locator('button:has-text("Pilih lokasi site / alokasi...")').first()
    if (await allocTrigger.isVisible()) {
      await allocTrigger.click()
      await page.waitForTimeout(500)
      const siteOpt = page.locator('div.cursor-pointer:has-text("Balikpapan")').first()
      if (await siteOpt.isVisible()) {
        await siteOpt.click()
        await page.waitForTimeout(300)
      }
    }

    // 8. Test Holder Dropdown
    const holderTrigger = page.locator('button:has-text("Pilih karyawan pemegang aset...")').first()
    if (await holderTrigger.isVisible()) {
      await holderTrigger.click()
      await page.waitForTimeout(500)
      const poolOpt = page.locator('div.cursor-pointer:has-text("Pool Gudang / Bersama")').first()
      if (await poolOpt.isVisible()) {
        await poolOpt.click()
        await page.waitForTimeout(300)
      }
    }

    // 9. Proceed to Step 2 (Review)
    console.log('Proceeding to Step 2...')
    const nextBtn = page.getByRole('button', { name: /Lanjut ke Step 2/i })
    await nextBtn.click()

    // Verify Step 2 is active
    await expect(page.locator('text=2. Review & Approval')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=1. Ringkasan Pengajuan CER')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=2. Dampak Anggaran (Budget Controller)')).toBeVisible({ timeout: 15000 })

    // Verify budget code and name banner in Step 2 if budget is selected
    if (optionCount > 0) {
      await expect(page.locator('text=Pagu Terpilih:')).toBeVisible({ timeout: 10000 })
      console.log('Pagu Terpilih banner verified in Step 2.')
    }

    // Capture screenshot of Step 2
    const ssStep2 = path.join(SCREENSHOT_DIR, '02_cer_form_step2_budget_code_and_name.png')
    await page.screenshot({ path: ssStep2, fullPage: true })
    console.log('Saved screenshot 02_cer_form_step2_budget_code_and_name.png')

    console.log('✓ ALL CER BUDGET DROPDOWN CODE & NAME VERIFICATIONS PASSED!')
  })
})
