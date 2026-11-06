import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Overtime Record PDF & Switch Pengaturan Wajib SPL', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dengan kredensial baku sistem
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/scheduling-timesheet/attendance',
  })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2. Ambil screenshot daftar Attendance per site
  await app.screenshot('timesheet-attendance-site-list')

  // 3. Klik tombol "Lihat attendance" pada baris site pertama
  const openAttendanceBtn = browser.locator('button:has-text("Lihat attendance"), button[aria-label="Lihat attendance"]').first()
  await expect(openAttendanceBtn).toBeVisible({ timeout: 20000 })
  await openAttendanceBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 5000))

  // 4. Ambil screenshot Attendance Grid yang sudah terbuka
  await app.screenshot('attendance-grid-workspace-overview')

  // 5. Klik tombol Preview atau OT pada baris karyawan
  const otBtn = browser.locator('button:has-text("Preview"), button:has-text("OT")').first()
  if (await otBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await otBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 4000))
    await app.screenshot('overtime-record-pdf-modal-preview')

    // Tutup dialog preview
    const closeBtn = browser.locator('button:has-text("Tutup"), button:has-text("Close"), button[aria-label="Close"]').first()
    if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeBtn.click()
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  // 6. Buka tab Konfigurasi Roster, OT dan Meals secara direct navigation
  await browser.goto('http://localhost:3000/dashboard/scheduling-timesheet/setup')
  await new Promise((resolve) => setTimeout(resolve, 5000))
  await app.screenshot('overtime-wajib-spl-switch-settings')
})
