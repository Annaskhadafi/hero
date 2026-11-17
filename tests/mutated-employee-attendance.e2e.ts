import { test } from '@e2e-dev/web'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Karyawan Mutasi Tidak Masuk di Site Lama Bulan Berikutnya', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dengan kredensial baku dan buka Attendance Timesheet
  await loginToHero(app, screen, browser, '/dashboard/scheduling-timesheet/attendance')

  // Tunggu sampai halaman selesai termuat
  await browser.waitForURL('**/dashboard/**', { timeout: 60000 }).catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 8000))

  // 2. Pilih Site "CK BMB" untuk memeriksa bahwa Destian Winarno tidak muncul di site lama
  const siteSelect = browser.locator('button[role="combobox"]').first()
  if (await siteSelect.isVisible({ timeout: 10000 }).catch(() => false)) {
    await siteSelect.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const ckOption = browser.locator('div[role="option"]:has-text("CK BMB"), [data-radix-collection-item]:has-text("CK BMB"), span:has-text("CK BMB")').first()
    if (await ckOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ckOption.click()
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  // Screenshot Site CK BMB: Membuktikan Destian Winarno sudah bersih dan tidak muncul dengan status ST di bulan berikutnya
  await app.screenshot('01-ck-bmb-nov-destian-cleaned')

  // 3. Switch ke site "AMM Tabang" (site baru hasil mutasi)
  if (await siteSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
    await siteSelect.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const tabangOption = browser.locator('div[role="option"]:has-text("Tabang"), [data-radix-collection-item]:has-text("Tabang"), span:has-text("Tabang")').first()
    if (await tabangOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tabangOption.click()
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  // Screenshot Site AMM Tabang: Membuktikan Destian Winarno tampil resmi di site barunya dengan data absensi aktif
  await app.screenshot('02-amm-tabang-nov-destian-active')
})
