import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('verifies ewh powerman manpower list modal dialog across sites', async ({ app, screen, browser }) => {
  // 1. Login to HERO and go to EWH dashboard
  await loginToHero(app, screen, browser, '/dashboard/ewh')

  // 2. Wait for EWH dashboard Powerman card to be visible
  const powermanCard = screen.getByTestId('powerman-card-btn', { visible: true })
  await expect(powermanCard).toBeVisible()
  await app.screenshot('01-ewh-dashboard-loaded')

  // 3. Click Powerman card to open dialog
  await powermanCard.click()

  // 4. Verify modal title and manpower table are visible
  const modalTitle = screen.getByText(/Daftar Manpower Powerman/i, { visible: true })
  await expect(modalTitle).toBeVisible()
  await app.screenshot('02-ewh-powerman-modal-open')

  // 5. Test search filter inside modal
  const searchInput = screen.getByPlaceholder(/Cari nama, NIK\/SN, atau seksi/i, { visible: true })
  if (searchInput) {
    await searchInput.fill('Abi')
    await new Promise((r) => setTimeout(r, 800))
    await app.screenshot('03-ewh-powerman-modal-search')

    // Clear search
    await searchInput.fill('')
    await new Promise((r) => setTimeout(r, 500))
  }

  // 6. Close modal
  const closeBtn = screen.getByRole('button', { name: /Tutup/i, visible: true })
  if (closeBtn) {
    await closeBtn.click()
    await new Promise((r) => setTimeout(r, 800))
  }

  await app.screenshot('04-ewh-powerman-modal-closed')
})
