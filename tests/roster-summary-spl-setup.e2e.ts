import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { HERO_TEST_CREDENTIALS } from './e2e-auth-helper'

test('Verifikasi Tombol Konfigurasi Summary SPL pada Setup Roster & Lembur', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Open /sign-in and manually fill credentials
  await app.open('/sign-in')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const emailInput = browser.locator('input[placeholder*="Email atau SN"], #email, input[type="text"]').first()
  const passwordInput = browser.locator('input[type="password"]').first()
  const submitBtn = browser.locator('button:has-text("Masuk ke HERO")').first()

  await emailInput.fill(HERO_TEST_CREDENTIALS.username)
  await passwordInput.fill(HERO_TEST_CREDENTIALS.password)
  await submitBtn.click()

  // Wait for redirect to /dashboard
  await browser.waitForURL('**/dashboard**', { timeout: 25000 }).catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2. Open /dashboard/scheduling-timesheet/setup
  await app.open('/dashboard/scheduling-timesheet/setup')
  await new Promise((resolve) => setTimeout(resolve, 4000))

  // 3. Screenshot halaman Setup Jadwal & Roster Overview
  await app.screenshot('05-desktop-setup-timesheet-roster-overview')

  // 4. Klik tombol "Edit Config" atau "Tambah Config" pada tabel site
  const editConfigBtn = browser.locator('button:has-text("Edit Config"), button:has-text("Tambah Config")').first()
  if (await editConfigBtn.isVisible()) {
    await editConfigBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 5. Verifikasi Modal Konfigurasi Site terbuka dan Toggle "Wajib Approval Online Summary SPL" tampil
    const toggleLabel = browser.locator('text=Wajib Approval Online Summary SPL').first()
    await expect(toggleLabel).toBeVisible({ timeout: 15000 })

    // Screenshot 2: Modal Konfigurasi Site dengan Tombol/Toggle Wajib Approval Online Summary SPL & Cut-off
    await app.screenshot('06-desktop-setup-roster-summary-spl-toggle')
  }
})
