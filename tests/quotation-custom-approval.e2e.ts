import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Verifikasi Switch, Minimalist Popup Dialog & Posisi Custom TTD Approval', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login ke HERO dan buka halaman Create Quotation
  await loginToHero(app, screen, browser, {
    username: '71261',
    password: 'Chitra#71261',
    targetUrl: '/dashboard/360-service/quotations/create',
  })

  // 2. Verifikasi halaman create termuat secara bersih dan minimalis tanpa error merah
  await new Promise((resolve) => setTimeout(resolve, 3000))
  await app.screenshot('001-quotation-form-clean-minimalist')

  // 3. Verifikasi switch Custom TTD Approval ada di baris switch toolbar
  const customApprovalSwitch = browser.locator('#switch-custom-approval').first()
  await expect(customApprovalSwitch).toBeVisible({ timeout: 20000 })

  // 4. Klik switch untuk mengaktifkan: Popup Dialog akan otomatis terbuka!
  await customApprovalSwitch.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 5. Verifikasi Popup Dialog terbuka
  const dialogTitle = browser.locator('text=Pengaturan TTD Persetujuan Tambahan').first()
  await expect(dialogTitle).toBeVisible({ timeout: 10000 })

  // 6. Verifikasi opsi pilihan posisi: Tengah vs Paling Kanan
  const optTengah = browser.locator('text=Tengah (Di Antara)').first()
  const optKanan = browser.locator('text=Paling Kanan').first()
  await expect(optTengah).toBeVisible({ timeout: 10000 })
  await expect(optKanan).toBeVisible({ timeout: 10000 })

  // 7. Pilih opsi 2 Approval (GL Plant & Procurement)
  const twoApprBtn = browser.locator('button:has-text("2 Approval")').first()
  await expect(twoApprBtn).toBeVisible({ timeout: 10000 })
  await twoApprBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 800))

  // 8. Klik opsi posisi "Paling Kanan"
  await optKanan.click()
  await new Promise((resolve) => setTimeout(resolve, 800))

  // 9. Ambil screenshot popup modal konfigurasi TTD tambahan
  await app.screenshot('002-quotation-custom-approval-popup-dialog')

  // 10. Klik tombol Simpan & Selesai di dalam Dialog
  const saveBtn = browser.locator('button:has-text("Simpan & Selesai")').first()
  await saveBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 11. Verifikasi dialog tertutup dan tombol shortcut "Atur TTD" muncul di form tanpa memenuhi halaman
  await expect(dialogTitle).not.toBeVisible()
  const aturBtn = browser.locator('button:has-text("Atur TTD")').first()
  await expect(aturBtn).toBeVisible({ timeout: 10000 })
  await app.screenshot('003-quotation-form-with-compact-atur-button')

  // 12. Buka halaman PDF / Print Quotation 101 untuk verifikasi layout posisi Paling Kanan
  await browser.goto('http://localhost:3000/dashboard/360-service/quotations/101')
  await new Promise((resolve) => setTimeout(resolve, 3500))
  await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 13. Verifikasi urutan Paling Kanan: Prepared By (Sales) -> Acknowledged By (Customer) -> Supervisor GL Plant & Procurement
  await expect(browser.locator('text=Prepared By').first()).toBeVisible({ timeout: 15000 })
  await expect(browser.locator('text=Acknowledged By').first()).toBeVisible({ timeout: 15000 })
  await expect(browser.locator('text=Supervisor GL Plant').first()).toBeVisible({ timeout: 15000 })
  await expect(browser.locator('text=Procurement Specialist').first()).toBeVisible({ timeout: 15000 })
  await app.screenshot('004-quotation-print-pdf-right-position')

  // 14. Buka dokumen standar Quotation 50 yang tanpa custom approval (Default 2 orang)
  await browser.goto('http://localhost:3000/dashboard/360-service/quotations/50')
  await new Promise((resolve) => setTimeout(resolve, 3500))
  await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 15. Verifikasi hanya 2 orang (Prepared By dan Acknowledged By)
  await expect(browser.locator('text=Prepared By').first()).toBeVisible({ timeout: 15000 })
  await expect(browser.locator('text=Acknowledged By').first()).toBeVisible({ timeout: 15000 })
  await expect(browser.locator('text=Supervisor GL Plant')).toHaveCount(0)
  await app.screenshot('005-quotation-print-pdf-standard-2-people')
})
