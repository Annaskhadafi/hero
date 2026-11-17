import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Status Kehadiran Tepat Waktu Staff Operation Muhammad Fadzri di Grid Attendance', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dan buka list attendance
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/scheduling-timesheet/attendance',
  })

  // 2. Filter site dengan mengetik "KABO" pada kolom pencarian
  const searchInput = screen.getByPlaceholder('Cari site atau bulan...')
  await expect(searchInput).toBeVisible({ timeout: 15000 })
  await searchInput.fill('KABO')
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // 3. Klik tombol "Lihat attendance" pada baris Sangatta KABO November 2026
  const kaboAttendanceBtn = screen.getByRole('button', { name: 'Lihat attendance' }).first()
  await expect(kaboAttendanceBtn).toBeVisible({ timeout: 15000 })
  await kaboAttendanceBtn.click()

  // 4. Tunggu workspace attendance Sangatta KABO terbuka
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 5. Cari baris Muhammad Fadzri
  const fadzriRow = browser.locator('tr:has-text("Muhammad Fadzri")').first()
  await expect(fadzriRow).toBeVisible({ timeout: 30000 })

  // 6. Ambil screenshot bukti kehadiran tepat waktu Muhammad Fadzri
  await app.screenshot('staff-operation-fadzri-attendance-grid')

  // 7. Verifikasi TIDAK ADA teks 'Terlambat +117m' pada baris Muhammad Fadzri
  const lateCell = browser.locator('tr:has-text("Muhammad Fadzri") :text-matches("Terlambat \\+117m")')
  await expect(lateCell).toHaveCount(0)

  // 8. Verifikasi bahwa cell Muhammad Fadzri menampilkan 'Masuk' (PAGI)
  const masukPagiCell = browser.locator('tr:has-text("Muhammad Fadzri") :text("Masuk")').first()
  await expect(masukPagiCell).toBeVisible({ timeout: 10000 })

  // 9. Ambil screenshot verifikasi penuh
  await app.screenshot('staff-operation-fadzri-on-time-verified')
})
