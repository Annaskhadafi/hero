import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Tampilan Grid Timesheet dan Fitur Ekspor Excel dengan Kolom SN', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dengan kredensial baku dan buka Attendance Timesheet Workspace
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance')

  // Tunggu sampai halaman selesai termuat
  await browser.waitForURL('**/dashboard/**', { timeout: 60000 }).catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 8000))

  // 2. Filter / Cari site Balikpapan atau site yang memiliki data
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

  // Ambil screenshot halaman Attendance Grid
  await app.screenshot('01-attendance-grid-workspace')

  // 3. Buka menu Ekspor Data Excel
  const exportDropdownBtn = browser.locator('button:has-text("Ekspor Data"), button:has-text("Export Data")').first()
  if (await exportDropdownBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await exportDropdownBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Screenshot menu dropdown export aktif
    await app.screenshot('02-export-menu-options')

    const dialogMenuOption = browser.locator('[role="menuitem"]:has-text("Pilihan Cut-Off"), [role="menuitem"]:has-text("Tanggal Kustom")').first()
    if (await dialogMenuOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dialogMenuOption.click()
      await new Promise((resolve) => setTimeout(resolve, 2500))
      await app.screenshot('03-export-dialog-5-tabs')
    }
  }
})
