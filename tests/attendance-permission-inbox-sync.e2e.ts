import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test(
  'pengajuan izin syncs exact date and displays as Pengajuan Izin (not SPL) in approval inbox & history',
  async ({ app, screen, browser }) => {
    const targetDate = '2026-11-18'
    const uniqueReason = 'E2E Verifikasi Sync Tanggal Izin 18 Nov 2026'

    await loginToHero(app, screen, browser)
    const loginEmailField = browser.locator('#email').first()
    if ((await loginEmailField.count()) > 0 && (await loginEmailField.isVisible().catch(() => false))) {
      await loginEmailField.fill('71261')
      await browser.locator('#password').first().fill('Chitra#71261')
      await browser.locator('button[type="submit"]').first().click()
      await expect(loginEmailField).toBeHidden({ timeout: 30000 })
    }

    await app.open('/mobile/attendance/permission')
    await expect(browser.locator('input[name="requestDate"]').first()).toBeVisible({
      timeout: 30000,
    })

    await browser.locator('input[name="requestDate"]').first().fill(targetDate)
    await browser.locator('input[name="endDate"]').first().fill(targetDate)
    await browser.locator('textarea[name="reason"]').first().fill(uniqueReason)

    // Attempt to pick current user (Mochamad Annas) as approver if listed in candidates
    const approverBtn = browser.locator('button[aria-label="Approver"]').first()
    if ((await approverBtn.count()) > 0) {
      await approverBtn.click()
      const searchBox = browser.locator('input[placeholder*="Cari"]').first()
      if ((await searchBox.count()) > 0) {
        await searchBox.fill('Annas')
      }
      const annasOption = browser
        .locator('[role="option"]:has-text("Annas"), div[role="listbox"] button:has-text("Annas"), button:has-text("MOCHAMAD ANNAS")')
        .first()
      if ((await annasOption.count()) > 0) {
        await annasOption.click()
      } else {
        await browser.keyboard.press('Escape')
      }
    }

    await app.screenshot('attendance-permission-sync-form')

    await browser.locator('button[type="submit"]').first().click()
    await expect(browser.locator('body')).toContainText('2026-11-18', { timeout: 20000 })
    await expect(browser.locator('body')).not.toContainText('2026-11-17')

    // Open Desktop Approval Inbox (/dashboard/approval)
    await app.open('/dashboard/approval')
    await expect(browser.locator('body')).toContainText('Approval Inbox', { timeout: 25000 })

    // Verify Inbox row shows "Pengajuan Izin" (never SPL) with synced date (e.g., ATT-20261026-00399 -> 26 Okt 2026 or 18 Nov 2026)
    const inboxIzinRow = browser.locator('tr:has-text("Pengajuan Izin")').first()
    await expect(inboxIzinRow).toBeVisible({ timeout: 15000 })
    await expect(inboxIzinRow).toContainText('Pengajuan Izin')
    await expect(inboxIzinRow).toContainText('Tanggal Izin:')
    await expect(inboxIzinRow).not.toContainText('Surat Perintah Lembur')
    await expect(inboxIzinRow).not.toContainText('SPL-')
    // Verify ATT-20261026-00399 matches 26 Okt 2026 (no +/-1 day shift to 25 Okt or 27 Okt)
    if ((await browser.locator('tr:has-text("ATT-20261026-00399")').count()) > 0) {
      const attRow = browser.locator('tr:has-text("ATT-20261026-00399")').first()
      await expect(attRow).toContainText('26 Okt 2026')
      await expect(attRow).not.toContainText('25 Okt 2026')
      await expect(attRow).not.toContainText('27 Okt 2026')
    }
    await app.screenshot('approval-inbox-pengajuan-izin-list')

    const openReviewBtn = browser
      .locator(
        'tr:has-text("Pengajuan Izin") button:has-text("Buka TTD"), tr:has-text("Pengajuan Izin") button:has-text("Review")'
      )
      .first()
    await expect(openReviewBtn).toBeVisible({ timeout: 10000 })
    await openReviewBtn.click()
    const dialog = browser.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await expect(dialog).toContainText('FORM PENGAJUAN IZIN ATTENDANCE')
    await expect(dialog).not.toContainText('SURAT PERINTAH LEMBUR')
    await app.screenshot('approval-inbox-pengajuan-izin-modal')
    await browser.keyboard.press('Escape')

    // Verify History tab ("Riwayat pengajuan") shows the newly submitted 2026-11-18 item as Pengajuan Izin (not SPL) with exact date 18 Nov 2026
    const historyTab = browser.locator('button:has-text("Riwayat pengajuan")').first()
    await expect(historyTab).toBeVisible({ timeout: 10000 })
    await historyTab.click()
    await expect(browser.locator('body')).toContainText('Pengajuan Izin', { timeout: 15000 })
    await expect(browser.locator('body')).toContainText('18 Nov 2026')
    await expect(browser.locator('body')).not.toContainText('17 Nov 2026')
    await app.screenshot('approval-history-pengajuan-izin')
  }
)
