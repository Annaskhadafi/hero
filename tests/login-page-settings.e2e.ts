import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('custom login page management and verification on sign-in page', { timeout: 240_000 }, async ({ app, browser, screen }) => {
  // Step 1: Open public sign-in page first to inspect current view
  await app.open('/sign-in')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  await expect(screen.getByText('AKUN KARYAWAN')).toBeVisible()
  await app.screenshot('01-signin-initial-view')

  // Step 2: Login to HERO and navigate to the Login Page Settings
  await loginToHero(app, screen, browser, '/dashboard/settings/login-page')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Verify settings page is loaded with its headers and tabs
  await expect(screen.getByRole('heading', 'Pengaturan Halaman Login')).toBeVisible()
  await expect(screen.getByText('Live Interactive Preview')).toBeVisible()
  await expect(screen.getByRole('button', 'Simpan Perubahan')).toBeVisible()
  await expect(screen.getByRole('button', 'Reset Default')).toBeVisible()

  await app.screenshot('02-admin-login-page-settings')

  // Step 3: Switch tabs and verify controls
  const formTab = screen.getByRole('tab', 'Form & Logo')
  if (await formTab.isVisible()) {
    await formTab.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await app.screenshot('03-admin-form-logo-tab')
  }

  const bannerTab = screen.getByRole('tab', 'Banner Kiri')
  if (await bannerTab.isVisible()) {
    await bannerTab.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // Step 4: Save settings
  const saveBtn = screen.getByRole('button', 'Simpan Perubahan')
  await saveBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 2500))

  await app.screenshot('04-admin-saved-settings')

  // Step 5: Test device preview toggle (Desktop vs Mobile)
  const mobilePreviewBtn = screen.getByRole('button', 'Mobile')
  if (await mobilePreviewBtn.isVisible()) {
    await mobilePreviewBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await app.screenshot('05-admin-mobile-preview')
  }
})
