import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Pengajuan Lembur Mobile SPL Default PJO Vale (Andika Septiadi)', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO
  await loginToHero(app, screen, browser)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 2. Buka halaman Mobile Overtime (Pengajuan SPL Lembur)
  await app.open('/mobile/overtime')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 3. Pastikan tab Formulir SPL terbuka
  const formTitle = browser.locator('text=Formulir Surat Lembur (SPL)').first()
  await expect(formTitle).toBeVisible({ timeout: 15000 })

  // 4. Klik tombol Pemohon (Requester) untuk mengubah pemohon menjadi karyawan Site Vale (Harni Hamdan)
  const pemohonBtn = browser.locator('button:has-text("Mochamad Annas Khadafi")').first()
  await expect(pemohonBtn).toBeVisible({ timeout: 10000 })
  await pemohonBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Ketik pencarian "Harni Hamdan"
  const searchInput = browser.locator('input[placeholder*="Cari"], input[placeholder*="pencarian"], input[type="text"]').last()
  await searchInput.fill('Harni Hamdan')
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Klik item button Harni Hamdan dalam dialog opsi
  const harniOption = browser.locator('button:has-text("Harni Hamdan")').first()
  await harniOption.click()
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 5. Verifikasi bahwa pada dropdown "Leader / PJO", otomatis default ke Andika Septiadi (PJO Site Vale)
  // bukan Junaidi (Section Head)
  const pjoApproverBtn = browser.locator('button:has-text("Andika Septiadi")').first()
  await expect(pjoApproverBtn).toBeVisible({ timeout: 15000 })

  // 6. Ambil screenshot pertama: Formulir Mobile Overtime dengan default PJO Andika Septiadi
  await app.screenshot('001-mobile-spl-pjo-vale-andika-septiadi')

  // 7. Buka halaman Workflow Studio untuk memverifikasi matriks approval site Vale
  await app.open('/dashboard/workflow-studio')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 8. Ambil screenshot kedua: Matriks approval workflow
  await app.screenshot('002-workflow-studio-matrix-vale-pjo')
})
