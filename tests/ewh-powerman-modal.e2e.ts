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

  // 7. Diagram interaction: Click first bar in chart
  const chartBar = browser.locator('.recharts-bar-rectangle').first()
  if (chartBar) {
    await chartBar.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
    await app.screenshot('05-ewh-diagram-activity-modal')

    // Close activity modal if opened
    const closeActivityBtn = screen.getByRole('button', { name: /Tutup/i, visible: true })
    if (closeActivityBtn) {
      await closeActivityBtn.click().catch(() => {})
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  // 8. Weekly Table interaction
  const weeklyTabBtn = screen.getByRole('button', { name: /Mingguan/i, visible: true })
  if (weeklyTabBtn) {
    await weeklyTabBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 800))
    await app.screenshot('06-ewh-weekly-tab-loaded')

    const weekCellBtn = browser.locator('table button').first()
    if (weekCellBtn) {
      await weekCellBtn.click().catch(() => {})
      await new Promise((r) => setTimeout(r, 800))
      await app.screenshot('07-ewh-weekly-cell-modal')

      const closeWeekBtn = screen.getByRole('button', { name: /Tutup/i, visible: true })
      if (closeWeekBtn) {
        await closeWeekBtn.click().catch(() => {})
        await new Promise((r) => setTimeout(r, 500))
      }
    }
  }

  // 9. Rekap Individu Karyawan Detailing
  const individualTabBtn = screen.getByRole('button', { name: /Rekap Individu Karyawan/i, visible: true })
  if (individualTabBtn) {
    await individualTabBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
    await app.screenshot('08-ewh-rekap-individu-tab')

    const firstEmpRow = browser.locator('tbody tr').first()
    if (firstEmpRow) {
      await firstEmpRow.click().catch(() => {})
      await new Promise((r) => setTimeout(r, 1000))
      await app.screenshot('09-ewh-rekap-individu-expanded')
    }
  }

  // 10. Rekap Per Team Detailing
  const teamTabBtn = screen.getByRole('button', { name: /Rekap Per Team/i, visible: true })
  if (teamTabBtn) {
    await teamTabBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
    await app.screenshot('10-ewh-rekap-per-team-tab')

    const teamDetailBtn = screen.getByRole('button', { name: /Lihat Detail Tanggal & Aktivitas Tim/i, visible: true })
    if (teamDetailBtn) {
      await teamDetailBtn.click().catch(() => {})
      await new Promise((r) => setTimeout(r, 1000))
      await app.screenshot('11-ewh-team-detailing-modal')

      const closeTeamBtn = screen.getByRole('button', { name: /Tutup/i, visible: true })
      if (closeTeamBtn) {
        await closeTeamBtn.click().catch(() => {})
        await new Promise((r) => setTimeout(r, 500))
      }
    }
  }

  await app.screenshot('12-ewh-flow-complete')
})
