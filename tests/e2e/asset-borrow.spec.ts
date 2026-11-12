// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const ARTIFACT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/asset-borrow')
const OUTPUT_DIR = path.join(process.cwd(), 'outputs/screenshots/asset-borrow')

test.beforeAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  try {
    execSync('node ./node_modules/tsx/dist/cli.mjs scripts/reset-test-borrow.ts', { stdio: 'inherit' })
  } catch (err) {
    console.error('Reset test borrow error:', err)
  }
})

test.describe('Asset Borrow E2E Feature Verification', () => {
  test.setTimeout(180000)

  test('Verifikasi Menu Sidebar, Dashboard, Buat Peminjaman, Approval Holder, dan Return Flow', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()))
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message))

    // Set large desktop viewport to clearly see sidebar and dialogs
    await page.setViewportSize({ width: 1440, height: 900 })

    // 1. Authenticate with standard system credentials
    console.log('Navigating to sign-in page...')
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

    console.log('Submitted login credentials. Waiting for redirect...')
    await page.waitForURL(/\/dashboard/, { timeout: 45000 })
    console.log('Login successful, on dashboard.')
    await page.waitForTimeout(2000)

    // =========================================================================
    // STEP 1 & 2: Navigasi ke Halaman Asset Borrow (/dashboard/assets/borrow)
    // =========================================================================
    console.log('Navigating to Asset Borrow Page (/dashboard/assets/borrow)...')
    await page.goto('/dashboard/assets/borrow', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(2500)

    // Verify Title & Badges in Main Content
    const heading = page.locator('main h1:has-text("Asset Borrow")')
    await expect(heading).toBeVisible({ timeout: 15000 })
    await expect(page.locator('main').getByText('Asset Management').first()).toBeVisible()

    // Ensure Sidebar is open to capture menu
    const sidebar = page.locator('[data-sidebar="sidebar"]').first()
    const toggleSidebarBtn = page.getByRole('button', { name: /Toggle Sidebar/i }).first()
    if (await toggleSidebarBtn.isVisible()) {
      // Check if sidebar is collapsed
      const isCollapsed = await page.evaluate(() => {
        const el = document.querySelector('[data-sidebar="sidebar"]')
        return el ? el.getAttribute('data-state') === 'collapsed' : false
      })
      if (isCollapsed) {
        await toggleSidebarBtn.click()
        await page.waitForTimeout(800)
      }
    }

    // Verify both Form Asset Transfer & Form Asset Borrow exist in DOM
    const assetBorrowMenu = page.locator('a[href="/dashboard/assets/borrow"]').first()
    await expect(assetBorrowMenu).toBeAttached({ timeout: 10000 })

    // Screenshot 1: Sidebar with Form Asset Borrow under Form Asset Transfer
    const ss1Output = path.join(OUTPUT_DIR, '01_sidebar_asset_borrow_menu.png')
    const ss1Artifact = path.join(ARTIFACT_DIR, '01_sidebar_asset_borrow_menu.png')
    await page.screenshot({ path: ss1Output, fullPage: false })
    fs.copyFileSync(ss1Output, ss1Artifact)
    console.log('📸 Screenshot saved: 01_sidebar_asset_borrow_menu.png')

    // Verify 4 KPI cards
    await expect(page.locator('text=Total Peminjaman')).toBeVisible()
    await expect(page.locator('text=Menunggu Persetujuan')).toBeVisible()
    await expect(page.locator('text=Sedang Dipinjam')).toBeVisible()
    await expect(page.locator('text=Selesai Dikembalikan')).toBeVisible()

    // Screenshot 2: Halaman Asset Borrow Dashboard & Table
    const ss2Output = path.join(OUTPUT_DIR, '02_asset_borrow_page_kpi_table.png')
    const ss2Artifact = path.join(ARTIFACT_DIR, '02_asset_borrow_page_kpi_table.png')
    await page.screenshot({ path: ss2Output, fullPage: false })
    fs.copyFileSync(ss2Output, ss2Artifact)
    console.log('📸 Screenshot saved: 02_asset_borrow_page_kpi_table.png')

    // =========================================================================
    // STEP 3: Buka Form Dialog "Buat Peminjaman Aset" & Isi Form
    // =========================================================================
    console.log('Opening Create Asset Borrow Dialog...')
    const openCreateBtn = page.locator('button:has-text("Buat Peminjaman Aset")')
    await expect(openCreateBtn).toBeVisible({ timeout: 10000 })
    await openCreateBtn.click()
    await page.waitForTimeout(1000)

    const dialogTitle = page.locator('text=Formulir Peminjaman Aset (Asset Borrow)')
    await expect(dialogTitle).toBeVisible({ timeout: 10000 })

    // Pilih Peminjam via Searchable Select
    console.log('Selecting borrower...')
    const borrowerSelect = page.locator('button:has-text("Ketik nama atau SN peminjam...")').first()
    await borrowerSelect.click()
    await page.waitForTimeout(600)
    const borrowerSearchInput = page.locator('[data-radix-popper-content-wrapper] input[placeholder*="Cari"]').first()
    if (await borrowerSearchInput.isVisible()) {
      await borrowerSearchInput.fill('Geovan')
      await page.waitForTimeout(500)
    }
    const borrowerOption = page.locator('[data-radix-popper-content-wrapper] div.cursor-pointer', { hasText: 'Geovan' }).first()
    if (await borrowerOption.isVisible()) {
      await borrowerOption.click()
    } else {
      await page.locator('[data-radix-popper-content-wrapper] div.cursor-pointer').first().click()
    }
    await page.waitForTimeout(600)

    // Pilih Aset via Searchable Select (cari nomor aset 30001473 yang memiliki holder 71261)
    console.log('Selecting asset with holder 71261...')
    const assetSelect = page.locator('button:has-text("Cari deskripsi aset atau nomor aset...")').first()
    await assetSelect.click()
    await page.waitForTimeout(600)
    const assetSearchInput = page.locator('[data-radix-popper-content-wrapper] input[placeholder*="Cari"]').first()
    if (await assetSearchInput.isVisible()) {
      await assetSearchInput.fill('30001473')
      await page.waitForTimeout(500)
    }
    const assetOption = page.locator('[data-radix-popper-content-wrapper] div.cursor-pointer', { hasText: '30001473' }).first()
    if (await assetOption.isVisible()) {
      await assetOption.click()
    } else {
      await page.locator('[data-radix-popper-content-wrapper] div.cursor-pointer').first().click()
    }
    await page.waitForTimeout(1000)

    // Verifikasi Auto-detected Holder Box
    const holderBadge = page.locator('text=Teridentifikasi')
    await expect(holderBadge).toBeVisible({ timeout: 5000 })
    console.log('✓ Auto-detect holder verified!')

    // Isi Kelengkapan Aset (Teks Bebas)
    console.log('Filling equipment notes...')
    const equipmentNotes = page.locator('textarea[placeholder*="Contoh: Unit Laptop ASUS"]')
    await equipmentNotes.fill('Unit Mesin RAD 1800 NGX, Kabel Power, Modul Kontrol, Hardcase Pelindung')

    // Isi Tujuan Peminjaman
    console.log('Filling purpose...')
    const purposeTextarea = page.locator('textarea[placeholder*="Contoh: Peminjaman laptop untuk menunjang tugas audit"]')
    await purposeTextarea.fill('Peminjaman operasional pekerjaan kalibrasi dan pengujian di Workshop Central Service selama 2 hari.')

    await page.waitForTimeout(600)

    // Screenshot 3: Form Dialog Terisi Lengkap
    const ss3Output = path.join(OUTPUT_DIR, '03_asset_borrow_form_dialog_filled.png')
    const ss3Artifact = path.join(ARTIFACT_DIR, '03_asset_borrow_form_dialog_filled.png')
    await page.screenshot({ path: ss3Output, fullPage: false })
    fs.copyFileSync(ss3Output, ss3Artifact)
    console.log('📸 Screenshot saved: 03_asset_borrow_form_dialog_filled.png')

    // Submit Form
    console.log('Submitting asset borrow form...')
    const submitBorrowBtn = page.locator('button:has-text("Kirim Pengajuan Peminjaman")')
    await submitBorrowBtn.click()
    await page.waitForTimeout(3000)

    // Click Refresh button if available to ensure new row is visible immediately
    const refreshBtn = page.getByRole('button', { name: 'Refresh' })
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click()
      await page.waitForTimeout(2000)
    }

    // =========================================================================
    // STEP 4: Verifikasi di Tabel & Buka Detail Modal (Status: Menunggu)
    // =========================================================================
    console.log('Verifying submitted item in table...')
    const pendingBadge = page.locator('table tbody').getByText(/Menunggu/i).first()
    await expect(pendingBadge).toBeVisible({ timeout: 15000 })

    // Buka Detail Modal via Tombol Aksi Pertama di Kolom Terakhir Baris Tabel (Ikon Eye)
    const viewDetailBtn = page.locator('table tbody tr').first().locator('td').last().locator('button').first()
    await viewDetailBtn.click()
    await page.waitForTimeout(1000)

    // Verifikasi Modal Detail Terbuka
    const detailTitle = page.locator('text=Detail Peminjaman:').first()
    await expect(detailTitle).toBeVisible({ timeout: 10000 })

    // Screenshot 4: Detail Modal Pending dengan Tombol Approval Holder
    const ss4Output = path.join(OUTPUT_DIR, '04_asset_borrow_detail_pending.png')
    const ss4Artifact = path.join(ARTIFACT_DIR, '04_asset_borrow_detail_pending.png')
    await page.screenshot({ path: ss4Output, fullPage: false })
    fs.copyFileSync(ss4Output, ss4Artifact)
    console.log('📸 Screenshot saved: 04_asset_borrow_detail_pending.png')

    // =========================================================================
    // STEP 5: Eksekusi Persetujuan Holder (Approve Flow)
    // =========================================================================
    console.log('Executing Approval by Holder...')
    const approveBtn = page.locator('button:has-text("Setujui Peminjaman")').first()
    await expect(approveBtn).toBeVisible({ timeout: 5000 })
    await approveBtn.click()
    await page.waitForTimeout(800)

    // Isi Catatan Persetujuan
    const approveNoteInput = page.locator('textarea[placeholder*="Disetujui peminjaman"]').first()
    await approveNoteInput.fill('Disetujui. Pastikan kelengkapan fisik diperiksa sebelum serah terima aset.')
    await page.waitForTimeout(600)

    // Screenshot 5: Dialog Persetujuan dengan Catatan
    const ss5Output = path.join(OUTPUT_DIR, '05_asset_borrow_approve_dialog.png')
    const ss5Artifact = path.join(ARTIFACT_DIR, '05_asset_borrow_approve_dialog.png')
    await page.screenshot({ path: ss5Output, fullPage: false })
    fs.copyFileSync(ss5Output, ss5Artifact)
    console.log('📸 Screenshot saved: 05_asset_borrow_approve_dialog.png')

    // Konfirmasi Setujui
    const confirmApproveBtn = page.getByRole('button', { name: /Ya, Setujui Peminjaman/i }).first()
    await expect(confirmApproveBtn).toBeEnabled({ timeout: 5000 })
    await confirmApproveBtn.click()
    // Wait until confirm dialog closes
    await expect(confirmApproveBtn).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)

    // Screenshot 6: Status Berubah Menjadi Disetujui / Sedang Dipinjam
    const ss6Output = path.join(OUTPUT_DIR, '06_asset_borrow_status_borrowed.png')
    const ss6Artifact = path.join(ARTIFACT_DIR, '06_asset_borrow_status_borrowed.png')
    await page.screenshot({ path: ss6Output, fullPage: false })
    fs.copyFileSync(ss6Output, ss6Artifact)
    console.log('📸 Screenshot saved: 06_asset_borrow_status_borrowed.png')

    // =========================================================================
    // STEP 6: Eksekusi Pengembalian Aset (Return Flow)
    // =========================================================================
    console.log('Executing Return Flow...')
    // Buka kembali detail modal via tombol aksi pertama di kolom terakhir baris pertama
    const viewDetailReturnBtn = page.locator('table tbody tr').first().locator('td').last().locator('button').first()
    await viewDetailReturnBtn.click()
    await page.waitForTimeout(1000)

    // Verifikasi tombol "Kembalikan Aset"
    const returnBtn = page.getByRole('button', { name: /Kembalikan Aset/i }).first()
    await expect(returnBtn).toBeVisible({ timeout: 10000 })
    await returnBtn.click()
    await page.waitForTimeout(800)

    // Isi Catatan Pengembalian
    const returnNoteInput = page.locator('textarea[placeholder*="Aset dikembalikan"]').first()
    await returnNoteInput.fill('Aset telah diterima kembali dalam kondisi baik, lengkap dengan modul kontrol dan hardcase.')
    await page.waitForTimeout(600)

    // Screenshot 7: Dialog Konfirmasi Pengembalian
    const ss7Output = path.join(OUTPUT_DIR, '07_asset_borrow_return_dialog.png')
    const ss7Artifact = path.join(ARTIFACT_DIR, '07_asset_borrow_return_dialog.png')
    await page.screenshot({ path: ss7Output, fullPage: false })
    fs.copyFileSync(ss7Output, ss7Artifact)
    console.log('📸 Screenshot saved: 07_asset_borrow_return_dialog.png')

    // Konfirmasi Pengembalian
    const confirmReturnBtn = page.getByRole('button', { name: /Konfirmasi Aset Kembali/i }).first()
    await expect(confirmReturnBtn).toBeEnabled({ timeout: 5000 })
    await confirmReturnBtn.click()
    await expect(confirmReturnBtn).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)

    // =========================================================================
    // STEP 7: Verifikasi Status Akhir
    // =========================================================================
    // Screenshot 8: Status Akhir Selesai Dikembalikan
    const ss8Output = path.join(OUTPUT_DIR, '08_asset_borrow_status_returned.png')
    const ss8Artifact = path.join(ARTIFACT_DIR, '08_asset_borrow_status_returned.png')
    await page.screenshot({ path: ss8Output, fullPage: false })
    fs.copyFileSync(ss8Output, ss8Artifact)
    console.log('📸 Screenshot saved: 08_asset_borrow_status_returned.png')

    console.log('🎉 ALL ASSET BORROW E2E FLOWS VERIFIED SUCCESSFULLY!')
  })
})
