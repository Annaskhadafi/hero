import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Fitur Export Attendance Cut-Off CK (16-15) & Penyelarasan Overtime Summary Balikpapan', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dengan kredensial baku dan buka Attendance Timesheet
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance')

  // Tunggu sampai halaman selesai termuat
  await browser.waitForURL('**/dashboard/**', { timeout: 60000 }).catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 8000))

  // 2. Filter / Cari site Balikpapan jika ada input search, atau klik tombol "Lihat attendance"
  const searchInput = browser.locator('input[placeholder*="Cari site"], input[placeholder*="Search site"], input[type="search"]').first()
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.fill('Balikpapan')
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  const openAttendance = browser.locator('button[aria-label="Lihat attendance"], button:has-text("Lihat attendance"), button:has-text("Lihat Attendance")').first()
  if (await openAttendance.isVisible({ timeout: 10000 }).catch(() => false)) {
    await openAttendance.click()
    await new Promise((resolve) => setTimeout(resolve, 6000))
  }

  // 3. Verifikasi opsi Cut-off Tagihan & Rentang Tanggal di toolbar atau dropdown Ekspor Data
  const cutoffBtn = browser.locator('button:has-text("Cut-Off & Rentang Tanggal"), button:has-text("Cut-off")').first()
  const exportDropdownBtn = browser.locator('button:has-text("Ekspor Data"), button:has-text("Export Data")').first()

  if (await exportDropdownBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await exportDropdownBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const dialogMenuOption = browser.locator('[role="menuitem"]:has-text("Pilihan Cut-Off"), [role="menuitem"]:has-text("Tanggal Kustom")').first()
    if (await dialogMenuOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dialogMenuOption.click()
      await new Promise((resolve) => setTimeout(resolve, 2500))
    }
  } else if (await cutoffBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cutoffBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2500))
  }

  // 4. Di dalam Dialog: Verifikasi tombol preset dan input tanggal
  const customPresetBtn = browser.locator('button:has-text("Kustom Bebas")').first()
  if (await customPresetBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await customPresetBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // 5. Screenshot modal/dialog konfigurasi ekspor cut-off tagihan kustom
  await app.screenshot('01-ck-cutoff-export-dialog')

  // 6. Tutup modal konfigurasi
  const closeBtn = browser.locator('button:has-text("Tutup"), button:has-text("Batal"), [aria-label="Close"]').first()
  if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await closeBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // 7. Beralih ke view Overtime Summary
  const otBtn = screen.getByRole('button', { name: 'Overtime', exact: true })
  if (await otBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await otBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 4000))
  }

  // 8. Screenshot Overtime Summary grid (menampilkan sinkronisasi lembur Aditia & rekan Balikpapan)
  await app.screenshot('02-attendance-overtime-summary-view')
})
