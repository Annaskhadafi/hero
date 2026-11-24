import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('Chitra LMS quick action icon is centered like other quick action buttons', { timeout: 180_000 }, async ({ app, browser, screen }) => {
  await loginToHero(app, screen, browser, '/dashboard')

  const lmsLink = browser.locator('a:has-text("Chitra LMS")').first()
  const overtimeButton = browser.locator('button:has-text("Pengajuan Lembur")').first()

  await expect(lmsLink).toBeVisible({ timeout: 30_000 })
  await expect(overtimeButton).toBeVisible({ timeout: 30_000 })

  const alignment = await browser.evaluate(() => {
    const lmsEl = Array.from(document.querySelectorAll('a')).find((el) => el.textContent?.includes('Chitra LMS'))
    const overtimeEl = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('Pengajuan Lembur'))
    if (!lmsEl || !overtimeEl) return null

    const lmsIcon = lmsEl.querySelector('div')
    const overtimeIcon = overtimeEl.querySelector('div')
    if (!lmsIcon || !overtimeIcon) return null

    const lmsRect = lmsEl.getBoundingClientRect()
    const lmsIconRect = lmsIcon.getBoundingClientRect()
    const overtimeRect = overtimeEl.getBoundingClientRect()
    const overtimeIconRect = overtimeIcon.getBoundingClientRect()

    const lmsCenterOffset = Math.abs((lmsIconRect.left + lmsIconRect.width / 2) - (lmsRect.left + lmsRect.width / 2))
    const overtimeCenterOffset = Math.abs((overtimeIconRect.left + overtimeIconRect.width / 2) - (overtimeRect.left + overtimeRect.width / 2))

    return {
      lmsCenterOffset,
      overtimeCenterOffset,
      lmsTopOffset: Math.abs(lmsIconRect.top - lmsRect.top),
      overtimeTopOffset: Math.abs(overtimeIconRect.top - overtimeRect.top),
    }
  })

  expect(alignment).not.toBeNull()
  expect(alignment!.lmsCenterOffset).toBeLessThan(2)
  expect(Math.abs(alignment!.lmsTopOffset - alignment!.overtimeTopOffset)).toBeLessThan(2)

  await browser.evaluate(() => {
    const lmsEl = Array.from(document.querySelectorAll('a')).find((el) => el.textContent?.includes('Chitra LMS'))
    lmsEl?.scrollIntoView({ block: 'center' })
  })
  await app.screenshot('quick-action-lms-icon-centered')
})
