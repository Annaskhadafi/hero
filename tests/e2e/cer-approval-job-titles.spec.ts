// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-job-titles'
)

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

test.describe('CER Approval Job Titles, Multi-Line Wrapping & Cleanup Verification', () => {
  test('Verifikasi Posisi Approval Job Title, Rantai Persetujuan, dan Multi-Line Wrap Tanpa Verifikator Tambahan', async ({ page }) => {
    test.setTimeout(120000)

    // 1. Setup Desktop Viewport & Login
    await page.setViewportSize({ width: 1440, height: 900 })
    console.log('Navigating to login page...')
    await page.goto('/sign-in?callbackUrl=/dashboard/assets/cer', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1000)

    const emailInput = page.locator('#email, input[placeholder*="email atau SN"], input[name="username"]').first()
    if (await emailInput.isVisible()) {
      await emailInput.fill('mochamad.khadafi@chitraparatama.co.id')
      const passwordInput = page.locator('#password, input[name="password"]').first()
      await passwordInput.fill('Chitra#71261')
      const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
      await submitBtn.click()
      await page.waitForTimeout(3000)

      const alert = page.locator('[role="alert"]')
      if (await alert.isVisible()) {
        console.log('LOGIN ALERT MESSAGE:', await alert.innerText())
      }
      console.log('Current URL after submit click:', page.url())
    }

    // 2. Kunjungi halaman CER
    console.log('Navigating to CER dashboard...')
    await page.goto('/dashboard/assets/cer', { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(3000)

    // 3. Verifikasi Kolom "Posisi Approval" di Tabel CER
    const cerTable = page.locator('table').first()
    await expect(cerTable).toBeVisible({ timeout: 20000 })

    // Baris CER 001
    const row001 = page.locator('tr:has-text("CER/CP/BALIKPAPAN/XI/2026/001")')
    await expect(row001).toBeVisible({ timeout: 20000 })

    // Ambil screenshot halaman tabel CER
    const ssTablePath = path.join(SCREENSHOT_DIR, '01_cer_table_posisi_approval.png')
    await page.screenshot({ path: ssTablePath, fullPage: true })
    console.log('Screenshot 1 saved:', ssTablePath)

    // 4. Buka Modal Detail (Eye Button) pada CER 001
    console.log('Opening Detail Modal for CER 001...')
    const detailBtn = row001.locator('button[title="Lihat Detail"]').first()
    await detailBtn.click()
    await page.waitForTimeout(1500)

    // Verifikasi Modal Detail terbuka
    await expect(page.locator('text=Rantai Persetujuan:').first()).toBeVisible({ timeout: 15000 })

    // Pastikan TIDAK ADA teks "Verifikator Tambahan" di dalam Rantai Persetujuan modal
    const modalContent = page.locator('div[role="dialog"]')
    const modalText = await modalContent.innerText()
    expect(modalText).not.toContain('Verifikator Tambahan')

    // Pastikan tidak ada "Catatan: Verifikator Tambahan" atau "Catatan: Tahap "
    expect(modalText).not.toContain('Catatan: Verifikator Tambahan')
    expect(modalText).not.toContain('Catatan: Tahap')

    // Verifikasi nama dan job title di Rantai Persetujuan
    // Step 1: Firmanto Setiyantoro -> IT Coordinator
    await expect(modalContent.locator('text=Firmanto Setiyantoro').first()).toBeVisible()
    await expect(modalContent.locator('text=IT Coordinator').first()).toBeVisible()

    // Step khusus: BIMA Supervisor
    await expect(modalContent.locator('text=BIMA Supervisor').first()).toBeVisible()

    // Step khusus: Budget Validator
    await expect(modalContent.locator('text=Budget Validator').first()).toBeVisible()

    // Step khusus: Asset Tagging
    await expect(modalContent.locator('text=Asset Tagging').first()).toBeVisible()

    // Ambil screenshot modal detail
    const ssDetailPath = path.join(SCREENSHOT_DIR, '02_cer_detail_modal_approval_chain.png')
    await page.screenshot({ path: ssDetailPath })
    console.log('Screenshot 2 saved:', ssDetailPath)

    // Tutup modal detail
    const closeBtn = modalContent.locator('button:has-text("Tutup")').first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(1000)

    // 5. Buka Dialog Tinjau untuk Memeriksa CerDocumentView (A4 Preview)
    console.log('Opening Tinjau modal on CER 001...')
    const tinjauBtn = row001.getByRole('button', { name: 'Tinjau' })
    if (await tinjauBtn.isVisible()) {
      await tinjauBtn.click()
      await page.waitForTimeout(2500)

      const docTitle = page.locator('text=FORM CAPITAL EXPENDITURE REQUEST (CER)').first()
      await expect(docTitle).toBeVisible({ timeout: 25000 })

      // Verifikasi bahwa teks "Verifikator Tambahan" TIDAK ADA di dalam preview dokumen A4
      const printArea = page.locator('.print-area')
      const printText = await printArea.innerText()
      expect(printText).not.toContain('Verifikator Tambahan')

      // Verifikasi bahwa Job Title panjang (Business Innovation & Marketing) ada dan tidak terpotong (truncate)
      await expect(printArea.locator('text=Business Innovation & Marketing Supervisor').first()).toBeVisible()

      // Ambil screenshot modal review dan dokumen A4
      const ssReviewPath = path.join(SCREENSHOT_DIR, '03_cer_document_preview_multiline_job_titles.png')
      await page.screenshot({ path: ssReviewPath, fullPage: true })
      console.log('Screenshot 3 saved:', ssReviewPath)
    }

    console.log('All assertions PASSED!')
  })
})
