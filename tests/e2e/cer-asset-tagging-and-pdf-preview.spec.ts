// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/cer-asset-tagging'
)

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

test.describe('CER Asset Tagging (Syamsul Bahri cc Evo Dwi) & PDF Preview Verification', () => {
  test('Verifikasi Dialog Approval CER: Preview Dokumen A4 Muncul Utuh & Tahap Asset Tagging Meminta No Aset & Kelompok Aset', async ({ page }) => {
    test.setTimeout(120000)

    // 1. Setup Desktop Viewport & Login ke HERO
    await page.setViewportSize({ width: 1440, height: 900 })
    console.log('Navigating to login page with callbackUrl...')
    await page.goto('/sign-in?callbackUrl=/dashboard/assets/cer', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1500)

    const emailInput = page.locator('#email, input[placeholder*="email atau SN"], input[name="username"]').first()
    if (await emailInput.isVisible()) {
      await emailInput.fill('mochamad.khadafi@chitraparatama.co.id')
      const passwordInput = page.locator('#password, input[name="password"]').first()
      await passwordInput.fill('Chitra#71261')
      const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first()
      await submitBtn.click()
      await page.waitForURL(/\/dashboard/, { waitUntil: 'domcontentloaded', timeout: 45000 })
      console.log('Login success and navigated to dashboard.')
    }

    // 2. Kunjungi halaman CER untuk membuka CER 001 (yang sedang berada di tahap Asset Tagging)
    console.log('Navigating to CER page...')
    await page.goto('/dashboard/assets/cer', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(3000)

    // Cari baris CER/CP/BALIKPAPAN/XI/2026/001
    const row001 = page.locator('tr:has-text("CER/CP/BALIKPAPAN/XI/2026/001")')
    await expect(row001).toBeVisible({ timeout: 20000 })

    const tinjauBtn = row001.getByRole('button', { name: 'Tinjau' })
    await expect(tinjauBtn).toBeVisible({ timeout: 20000 })
    console.log('Clicking Tinjau button on CER 001 (Asset Tagging step)...')
    await tinjauBtn.click()
    await page.waitForTimeout(2000)

    // 3. Verifikasi Modal Review Dokumen Pengajuan Aset Terbuka
    const modalTitle = page.locator('text=Review Dokumen Pengajuan Aset').first()
    await expect(modalTitle).toBeVisible({ timeout: 20000 })

    // Tunggu hingga kompilasi server action & fetching dokumen A4 selesai (spinner hilang)
    console.log('Waiting for document preparation spinner to finish...')
    const loader = page.locator('text=Menyiapkan pratinjau dokumen A4 resmi...')
    if (await loader.isVisible()) {
      await loader.waitFor({ state: 'detached', timeout: 45000 })
    }

    // Pastikan TIDAK ADA error "Dokumen tidak tersedia atau gagal dimuat."
    const errorEmpty = page.locator('text=Dokumen tidak tersedia atau gagal dimuat.')
    await expect(errorEmpty).not.toBeVisible()

    // 4. Verifikasi Dokumen Preview A4 di Kolom Kiri
    console.log('Verifying official A4 landscape CER document layout...')
    await expect(page.locator('text=PT. CHITRA PARATAMA').first()).toBeVisible({ timeout: 20000 })
    await expect(page.locator('text=FORM CAPITAL EXPENDITURE REQUEST (CER)').first()).toBeVisible()
    await expect(page.locator('text=TOTAL ESTIMASI NILAI INVESTASI (CAPEX)').first()).toBeVisible()

    // Verifikasi tombol PDF Lanskap ada di header modal
    const pdfBtn = page.locator('button:has-text("PDF Lanskap"), a:has-text("PDF Lanskap")').first()
    await expect(pdfBtn).toBeVisible()

    // 5. Verifikasi Panel Aksi Kanan untuk Tahap Asset Tagging (Syamsul Bahri cc Evo Dwi)
    console.log('Verifying Asset Tagging action panel (No Auto-gen, Custom/Dynamic Category, Manual No Aset)...')
    await expect(page.locator('text=Tahap Asset Tagging & Penomoran').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Syamsul Bahri').first()).toBeVisible()
    await expect(page.locator('text=cc Evo Dwi Yulianti').first()).toBeVisible()

    // Verifikasi Fitur Auto-Generate Nomor Aset SUDAH DIHILANGKAN
    const autoGenBtn = page.locator('button:has-text("Auto-Generate")')
    await expect(autoGenBtn).not.toBeVisible()

    // Verifikasi Opsi Hardcoded Golongan 1-4 SUDAH DIHILANGKAN
    const hardcodedGol1 = page.locator('text=Golongan 1 (Masa Manfaat 4 Tahun)')
    await expect(hardcodedGol1).not.toBeVisible()

    // Verifikasi Input Kelompok Aset Custom / Dinamis
    await expect(page.locator('text=Kelompok / Kategori Aset').first()).toBeVisible()

    // Cek apakah mode custom atau ada tombol tambah kategori baru
    const ketikBaruBtn = page.locator('button:has-text("Ketik Kategori Baru")')
    if (await ketikBaruBtn.isVisible()) {
      await ketikBaruBtn.click()
      await page.waitForTimeout(500)
    }

    const catInput = page.locator('input[placeholder*="kategori / kelompok aset"]').first()
    if (await catInput.isVisible()) {
      await catInput.fill('Perangkat IT & Laptop Kantor')
      console.log('Filled custom asset category.')
    }

    // Input Nomor Aset per unit secara manual (tanpa auto-generate)
    await expect(page.locator('text=Nomor Aset per Unit Barang').first()).toBeVisible()
    const assetNumInput = page.locator('input[placeholder*="Nomor Aset"]').first()
    await expect(assetNumInput).toBeVisible()
    await assetNumInput.fill('AST-BPN-IT-2026-001')
    await page.waitForTimeout(800)

    // Tombol Submit: "Simpan Nomor Aset & Selesaikan" (bukan "Setujui Pengajuan" biasa)
    const submitTaggingBtn = page.locator('button:has-text("Simpan Nomor Aset & Selesaikan")').first()
    await expect(submitTaggingBtn).toBeVisible()

    // Pastikan teks narasi bantuan berlebih SUDAH DIHILANGKAN
    await expect(page.locator('text=Bukan tanda tangan persetujuan biasa')).not.toBeVisible()
    await expect(page.locator('text=otomatis masuk dropdown')).not.toBeVisible()

    // Pastikan kolom approval Asset Tagging (level 5) pada preview dokumen PDF SUDAH DIHILANGKAN dari grid tanda tangan
    const taggingSigBox = page.locator('.print-area table td:has-text("Asset Tagged"), .print-area table th:has-text("DIPERIKSA OLEH")')
    await expect(taggingSigBox).not.toBeVisible()

    // Pastikan form coretan tangan tanda tangan digital TIDAK ADA pada tahap asset tagging
    await expect(page.locator('text=Bubuhkan coretan tanda tangan')).not.toBeVisible()
    await expect(page.locator('button:has-text("Coretan Tangan")')).not.toBeVisible()

    // 6. Ambil Screenshot bukti visual lengkap
    const screenshotPath = path.join(SCREENSHOT_DIR, '01_cer_asset_tagging_and_preview_verified.png')
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    })

    console.log('Test PASSED! Screenshot successfully saved at:', screenshotPath)
  })
})
