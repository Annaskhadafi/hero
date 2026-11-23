import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('mobile quick search remains clickable above a reduced visual viewport', async ({ app, browser, screen }) => {
  await loginToHero(app, screen, browser)
  await browser.setViewport({ width: 390, height: 640 })
  await app.open('/mobile/dashboard')

  const trigger = browser.locator('button:has-text("Cari menu, layanan, atau laporan...")').first()
  const sheet = '[data-slot="sheet-content"]:has-text("Temukan Layanan HERO")'
  const panel = browser.locator(sheet)
  const input = browser.locator(`${sheet} input[placeholder*="Ketik nama menu"]`)
  const result = browser.locator(`${sheet} a[href="/mobile/hse/tire-damage"]`)
  await trigger.click()
  await expect(input).toBeVisible()
  await input.fill('Ban')
  await browser.locator(`${sheet} button:has-text("HSE & Safety")`).click()
  await expect(result).toBeVisible()
  await app.screenshot('mobile-quick-search-normal')

  // Model a keyboard that shrinks the visual viewport without changing the layout viewport.
  const availableHeight = await browser.evaluate(() => {
    const viewport = window.visualViewport!
    const height = Math.min(340, viewport.height - 100)
    Object.defineProperty(viewport, 'height', { configurable: true, value: height })
    viewport.dispatchEvent(new Event('resize'))
    return height
  })

  const geometry = await browser.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    const dialog = [...document.querySelectorAll<HTMLElement>('[data-slot="sheet-content"]')]
      .find((element) => element.textContent?.includes('Temukan Layanan HERO'))!
    const result = dialog.querySelector<HTMLAnchorElement>('a[href="/mobile/hse/tire-damage"]')!
    result.scrollIntoView({ block: 'nearest' })
    const input = dialog.querySelector('input')!.getBoundingClientRect()
    const hit = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      return y >= 0 && y < window.visualViewport!.height && element.contains(document.elementFromPoint(x, y))
    }
    return { inputTop: input.top, inputBottom: input.bottom, resultHit: hit(result) }
  })
  expect(geometry.inputTop).toBeGreaterThanOrEqual(0)
  expect(geometry.inputBottom).toBeLessThanOrEqual(availableHeight)
  expect(geometry.resultHit).toBe(true)
  await app.screenshot('mobile-quick-search-reduced-viewport')

  await browser.evaluate(() => {
    const viewport = window.visualViewport!
    Reflect.deleteProperty(viewport, 'height')
    viewport.dispatchEvent(new Event('resize'))
    return viewport.height
  })
  await expect(result).toBeVisible()
  await result.click()
  await expect(panel).not.toBeVisible()
  await browser.waitForURL(/\/mobile\/hse\/tire-damage$/)
})
