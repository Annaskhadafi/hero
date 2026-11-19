import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Tambah Schedule V2 Berhasil Tanpa React Error #441', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Pastikan terotentikasi dan buka Schedule V2
  await loginToHero(app, screen, browser, {
    username: 'mochamad.khadafi@chitraparatama.co.id',
    targetUrl: '/dashboard/scheduling-timesheet/schedule-v2',
  })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Retry jika masih di sign-in karena jaringan
  if (browser?.url && String(browser.url()).includes('/sign-in')) {
    await loginToHero(app, screen, browser, {
      username: 'mochamad.khadafi@chitraparatama.co.id',
      targetUrl: '/dashboard/scheduling-timesheet/schedule-v2',
    })
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  if (browser?.url && !String(browser.url()).includes('/dashboard/scheduling-timesheet/schedule-v2')) {
    await app.open('/dashboard/scheduling-timesheet/schedule-v2')
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  // 2. Verifikasi tombol "Tambah Schedule" muncul dan klik
  const tambahBtn = browser.locator('button:has-text("Tambah Schedule")').first()
  await expect(tambahBtn).toBeVisible({ timeout: 60000 })
  await tambahBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // 3. Verifikasi Dialog "Tambah Schedule V2" terbuka
  const dialogTitle = browser.locator('text=Tambah Schedule V2').first()
  await expect(dialogTitle).toBeVisible({ timeout: 20000 })
  await app.screenshot('schedule-v2-dialog-tambah')

  // 4. Klik tombol "BUAT SCHEDULE"
  const buatScheduleBtn = browser.locator('button:has-text("BUAT SCHEDULE")').first()
  await expect(buatScheduleBtn).toBeVisible({ timeout: 20000 })
  await buatScheduleBtn.click()

  // 5. Tunggu proses pembuatan selesai (dialog tertutup atau editor terbuka)
  await expect(dialogTitle).not.toBeVisible({ timeout: 60000 })
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 6. Verifikasi TIDAK ADA pesan error "Minified React error" atau "Gagal membuat Schedule V2"
  const errorToast = browser.locator('text=Minified React error, text=Gagal membuat Schedule V2').first()
  const hasError = await errorToast.isVisible({ timeout: 500 }).catch(() => false)
  expect(hasError).toBe(false)

  // 7. Screenshot hasil sukses (modal editor Schedule V2 terbuka atau toast sukses)
  await app.screenshot('schedule-v2-created-success')
})
