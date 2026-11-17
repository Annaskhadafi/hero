import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Filter Switch Section PDF Attendance Site Balikpapan', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dan buka langsung attendance Balikpapan
  await loginToHero(app, screen, browser, {
    targetUrl: '/dashboard/scheduling-timesheet/attendance?siteId=126&period=2026-11',
  })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2. Buka attendance Balikpapan jika masih di overview list
  const openBtn = browser
    .locator(
      'tr:has-text("Balikpapan") button[aria-label="Lihat attendance"], #btn-open-attendance-126-2026-11, tr:has-text("Balikpapan") button'
    )
    .first()
  if (await openBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await openBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  await app.screenshot('attendance-balikpapan-workspace')

  // 3. Buka panel "Preview & Export PDF"
  const previewExportBtn = browser
    .locator('#btn-preview-export-pdf, button:has-text("Preview & Export PDF")')
    .first()
  await expect(previewExportBtn).toBeVisible({ timeout: 30000 })
  await previewExportBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 4. Verifikasi seluruh switch section dengan hitungan jumlah karyawan dan tombol popover semua section
  const repairSwitch = browser.locator('#toggle-repair-pdf')
  const servicesSwitch = browser.locator('#toggle-services-pdf')
  const technicalSwitch = browser.locator('#toggle-technical-pdf')
  const hseSwitch = browser.locator('#toggle-hse-pdf')
  const allSectionsBtn = browser.locator('#btn-section-filter-popover')

  await expect(repairSwitch).toBeVisible({ timeout: 10000 })
  await expect(servicesSwitch).toBeVisible({ timeout: 10000 })
  await expect(technicalSwitch).toBeVisible({ timeout: 10000 })
  await expect(hseSwitch).toBeVisible({ timeout: 10000 })
  await expect(allSectionsBtn).toBeVisible({ timeout: 10000 })

  await app.screenshot('attendance-balikpapan-section-switches-all')

  // Buka Popover semua section untuk verifikasi 29 section asli
  await allSectionsBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await app.screenshot('attendance-balikpapan-popover-all-sections')

  // Tutup Popover dengan klik tombol popover kembali
  await allSectionsBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 500))

  // 5. Test filter: Hanya aktifkan Technical (matikan Repair, Services, HSE)
  await repairSwitch.click()
  await new Promise((resolve) => setTimeout(resolve, 300))
  await servicesSwitch.click()
  await new Promise((resolve) => setTimeout(resolve, 300))
  await hseSwitch.click()
  await new Promise((resolve) => setTimeout(resolve, 500))

  await app.screenshot('attendance-balikpapan-only-technical-switches')

  // 6. Klik tombol Preview PDF
  const previewPdfBtn = browser.locator('button:has-text("Preview PDF")').first()
  await expect(previewPdfBtn).toBeVisible({ timeout: 10000 })
  await previewPdfBtn.click()

  const previewDialog = browser.locator('div[role="dialog"]').first()
  await expect(previewDialog).toBeVisible({ timeout: 45000 })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 7. Ambil screenshot preview PDF Technical
  await app.screenshot('attendance-balikpapan-technical-pdf-preview')

  // 8. Tutup dialog preview
  const closeBtn1 = browser.locator('button:has-text("Tutup")').first()
  await closeBtn1.click().catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 1000))
  if (await previewDialog.isVisible().catch(() => false)) {
    const radixCloseBtn = browser.locator('button:has-text("Close")').first()
    await radixCloseBtn.click().catch(() => {})
  }
  await expect(previewDialog).not.toBeVisible({ timeout: 15000 })
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 9. Test filter: Hanya aktifkan Services (matikan Technical, aktifkan Services)
  await technicalSwitch.click()
  await new Promise((resolve) => setTimeout(resolve, 300))
  await servicesSwitch.click()
  await new Promise((resolve) => setTimeout(resolve, 500))

  await app.screenshot('attendance-balikpapan-only-services-switches')

  // 10. Klik tombol Preview PDF untuk Services
  await previewPdfBtn.click()
  await expect(previewDialog).toBeVisible({ timeout: 45000 })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 11. Ambil screenshot preview PDF Services
  await app.screenshot('attendance-balikpapan-services-pdf-preview')

  // Tutup dialog
  const closeBtn2 = browser.locator('button:has-text("Tutup")').first()
  await closeBtn2.click().catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 1000))
  if (await previewDialog.isVisible().catch(() => false)) {
    const radixCloseBtn2 = browser.locator('button:has-text("Close")').first()
    await radixCloseBtn2.click().catch(() => {})
  }
  await expect(previewDialog).not.toBeVisible({ timeout: 15000 })
})
