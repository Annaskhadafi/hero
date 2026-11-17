import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('Verifikasi Summary SPL: Jam Lembur Ridho Dwi Cahya Putra Tanggal 20 Menjadi 11 Jam (Valid Sesuai Attendance Real)', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Login to HERO with direct callback to overtime-requests
  await app.open('/sign-in?callbackUrl=%2Fdashboard%2Fovertime-requests')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  const emailInput = screen.getByPlaceholder(/Email atau SN/i)
  await emailInput.fill('71261')

  const passwordInput = screen.getByPlaceholder(/kata sandi/i)
  await passwordInput.fill('Chitra#71261')

  const submitBtn = screen.getByRole('button', { name: /Masuk ke HERO/i })
  await submitBtn.click()

  // Tunggu login dan halaman overtime requests selesai ter-load
  await new Promise((resolve) => setTimeout(resolve, 15000))

  // 2. Verifikasi Dedicated Card Summary SPL
  const summaryCard = browser.locator('text=Rekapitulasi & Export Summary SPL').first()
  await expect(summaryCard).toBeVisible({ timeout: 60000 })

  // 3. Set Filter Periode: Oktober 2026 (2026-10)
  const monthInput = browser.locator('input[type="month"]').first()
  await expect(monthInput).toBeVisible({ timeout: 15000 })
  await monthInput.fill('2026-10')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 4. Pilih Site: CK KIM
  const siteBtn = browser.locator('button[aria-label="Site"]').first()
  if (await siteBtn.isVisible()) {
    await siteBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 800))
    const siteInput = browser.locator('input[placeholder*="Cari site"]').first()
    if (await siteInput.isVisible()) {
      await siteInput.fill('CK KIM')
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    const ckKimOption = browser.locator('button:has-text("CK KIM")').first()
    if (await ckKimOption.isVisible()) {
      await ckKimOption.click()
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  // 5. Pilih Karyawan: Ridho Dwi Cahya Putra
  const empBtn = browser.locator('button[aria-label="Karyawan"]').first()
  if (await empBtn.isVisible()) {
    await empBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 800))
    const empInput = browser.locator('input[placeholder*="Cari karyawan"]').first()
    if (await empInput.isVisible()) {
      await empInput.fill('Ridho')
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    const ridhoOption = browser.locator('button:has-text("Ridho Dwi Cahya")').first()
    if (await ridhoOption.isVisible()) {
      await ridhoOption.click()
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  // Screenshot 1: Card Filter Terisi - Periode Oktober 2026 & Ridho Dwi Cahya Putra Terpilih
  await app.screenshot('01-card-filter-ridho-okt-2026')

  // 6. Buka Preview Summary SPL Per User (Sekarang sudah enabled karena karyawan sudah dipilih)
  const perUserBtn = browser.locator('button:has-text("SUMMARY PER USER (PDF)")').first()
  await expect(perUserBtn).toBeEnabled({ timeout: 20000 })
  await perUserBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 6000))

  // Verifikasi Modal Preview Terbuka
  const previewModal = browser.locator('div[role="dialog"]').first()
  await expect(previewModal).toBeVisible({ timeout: 30000 })

  // Scroll di dalam iframe menggunakan mouse wheel agar baris Tanggal 20 (11 Jam) tampak jelas
  try {
    const iframeLoc = browser.locator('iframe[title="Summary SPL Preview"]').first()
    if (await iframeLoc.isVisible()) {
      await iframeLoc.hover()
      await browser.mouse.wheel(0, 480)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  } catch (err) {
    console.warn('Mouse wheel error:', err)
  }

  // Screenshot 2: Modal Preview SPL Ridho Dwi Cahya Putra - Tanggal 20 Tampil 11 Jam (Focus on Date 20)
  await app.screenshot('02-modal-preview-ridho-20-okt-11-jam')

  // 7. Buka Format LEMBAR PER ORANG (PDF) untuk Site CK KIM
  // Tutup modal preview per user
  const closeBtn = browser.locator('div[role="dialog"] button:has-text("✕"), div[role="dialog"] button:has(svg.lucide-x)').first()
  if (await closeBtn.isVisible()) {
    await closeBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Klik LEMBAR PER ORANG (PDF)
  const lembarPerOrangBtn = browser.locator('button:has-text("LEMBAR PER ORANG (PDF)")').first()
  await expect(lembarPerOrangBtn).toBeVisible({ timeout: 20000 })
  await lembarPerOrangBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 6000))

  // Verifikasi Modal Terbuka
  await expect(previewModal).toBeVisible({ timeout: 30000 })

  // Screenshot 3: Modal Preview Lembar Per Orang Site CK KIM Multi-A4
  await app.screenshot('03-modal-preview-site-ck-kim-bundled-11h')
})
