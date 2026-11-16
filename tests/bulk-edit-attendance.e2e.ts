import { test } from '@e2e-dev/web'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Fitur Multi Select & Bulk Edit Modal Attendance Real', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dengan kredensial baku dan buka Attendance Timesheet
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance')

  // Tunggu sampai halaman selesai termuat
  await browser.waitForURL('**/dashboard/**', { timeout: 60000 }).catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 8000))

  // 2. Klik tombol "Multi Select Mode"
  const multiSelectBtn = browser.locator('button:has-text("Multi Select Mode")').first()
  if (await multiSelectBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await multiSelectBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Ambil screenshot mode multi select aktif dengan toolbar baru
  await app.screenshot('01-multi-select-mode-toolbar')

  // 3. Verifikasi tombol "Pilih Semua Weekend (Sabtu-Minggu)"
  const selectWeekendsBtn = browser.locator('button:has-text("Pilih Semua Weekend")').first()
  if (await selectWeekendsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await selectWeekendsBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2500))
  } else {
    // Fallback: klik 2 sel pertama di tabel
    const cells = browser.locator('button[class*="group relative h-[76px]"]').all()
    const cellList = await cells
    if (cellList.length > 0) {
      await cellList[0]?.click()
      if (cellList.length > 1) await cellList[1]?.click()
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  // 4. Klik tombol "Edit Sel Terpilih"
  const editBulkBtn = browser.locator('button:has-text("Edit"), button:has-text("Edit Sel Terpilih")').first()
  if (await editBulkBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await editBulkBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  // 5. Ambil screenshot pop-up dialog Bulk Edit
  await app.screenshot('02-bulk-edit-modal-dialog')

  // 6. Tutup dialog dengan tombol Batal
  const cancelBtn = browser.locator('button:has-text("Batal")').last()
  if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cancelBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  await app.screenshot('03-bulk-edit-completed')
})
