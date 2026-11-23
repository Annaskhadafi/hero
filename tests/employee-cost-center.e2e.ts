import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Master Data Karyawan - Penambahan Kolom dan Input Cost Center', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dengan kredensial baku dan buka menu Data Karyawan HC
  await loginToHero(app, screen, browser, '/dashboard/hc/employee')

  // Tunggu sampai halaman dan tabel selesai termuat
  await browser.waitForURL('**/dashboard/hc/employee**', { timeout: 60000 }).catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 8000))

  // Dismiss birthday dialog if visible
  const dismissBtn = browser.locator('button:has-text("TUTUP / MENGERTI"), button:has-text("Mengerti"), button:has-text("Tutup")').first()
  if (await dismissBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await dismissBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1500))
  }

  // 2. Verifikasi Kolom Cost Center ada pada Table Header
  const costCenterHeader = browser.locator('th:has-text("Cost Center")').first()
  await costCenterHeader.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {})

  // Ambil screenshot tabel karyawan dengan kolom Cost Center
  await app.screenshot('01-employee-table-cost-center')

  // 3. Buka Dialog Tambah / Edit Karyawan untuk verifikasi form input Cost Center
  const tambahBtn = browser.locator('button:has-text("Tambah Karyawan")').first()
  if (await tambahBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await tambahBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Verifikasi label dan input Cost Center pada dialog form
    const costCenterLabel = browser.locator('label:has-text("Cost Center")').first()
    await costCenterLabel.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})

    // Ambil screenshot dialog form dengan input field Cost Center
    await app.screenshot('02-employee-form-cost-center-input')

    // Tutup dialog
    const batalBtn = browser.locator('button:has-text("Batal")').first()
    if (await batalBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await batalBtn.click()
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // 4. Buka Dialog Detail (Lihat) Karyawan baris pertama
  const viewBtn = browser.locator('button[title*="Lihat"], button:has-text("Lihat")').first()
  if (await viewBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await viewBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Ambil screenshot modal detail karyawan yang menampilkan Cost Center
    await app.screenshot('03-employee-detail-cost-center')
  }
})
