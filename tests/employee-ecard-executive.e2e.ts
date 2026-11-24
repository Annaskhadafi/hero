import assert from 'node:assert/strict'
import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

const base = 'http://127.0.0.1:3134'
const card = `/business-card/${'0'.repeat(64)}`
const longNameCard = `/business-card/${'2'.repeat(64)}`
const inactiveCard = `/business-card/${'1'.repeat(64)}`

function guard() {
  assert.equal(process.env.E2E_APP_URL, base)
  assert.equal(process.env.HERO_E2E_USERNAME, 'TKT0004-FIXTURE')
  assert.ok(process.env.HERO_E2E_PASSWORD)
}

async function statuses(path: string) {
  return Promise.all(['', '/contact.vcf'].map(async suffix => (await fetch(base + path + suffix, { redirect: 'manual' })).status))
}

test('employee e-card shares and revokes the real profile and vCard', async ({ app, browser, screen }) => {
  test.skip(process.env.HERO_BUSINESS_CARD_FIXTURE !== '1', 'Disposable fixture only')
  guard()
  await browser.setViewport({ width: 390, height: 844 })
  await loginToHero(app, screen, browser, '/mobile/profile')
  await browser.waitForURL(/\/mobile\/profile$/, { timeout: 30_000 })
  assert.equal(new URL(await browser.url()).origin, base)
  await browser.locator('button:has-text("E-Business Card")').click()
  const toggle = browser.locator('[role="switch"][aria-label="Share my card"]')
  const enabled = browser.locator('[role="switch"][aria-label="Share my card"][aria-checked="true"]')
  await expect(toggle).toBeVisible()
  assert.deepEqual(await statuses(card), [404, 404])
  await expect(browser.locator('button:has-text("Show QR")')).not.toBeVisible()
  try {
    await toggle.click()
    await expect(enabled).toBeVisible()
    assert.deepEqual(await statuses(card), [200, 200])
    await browser.locator('button:has-text("Show QR")').click()
    await expect(browser.locator('img[alt="Scan to open this digital business card"]')).toBeVisible()
    assert.equal(await browser.evaluate(() => document.querySelector('[role="dialog"] a[href^="https://hero.chitraparatama.com/business-card/"]')?.getAttribute('href') ?? ''), `https://hero.chitraparatama.com${card}`)
    await app.screenshot('owner-executive-qr')
    await browser.locator('[role="dialog"] button:has-text("Tutup")').last().click()
  } finally {
    if (await enabled.isVisible()) await toggle.click()
  }
  await expect(enabled).not.toBeVisible()
  assert.deepEqual(await statuses(card), [404, 404])
})

test('public Executive profile loads product and gallery interactions without exposing the token to Instagram', async ({ app, browser }) => {
  test.skip(process.env.HERO_BUSINESS_CARD_FIXTURE !== '1', 'Disposable fixture only')
  guard()
  await browser.setViewport({ width: 320, height: 800 })
  await app.open(longNameCard)
  assert.equal(new URL(await browser.url()).origin, base)
  await expect(browser.locator('h1')).toBeVisible()
  assert.equal(await browser.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const download = await fetch(base + longNameCard + '/contact.vcf')
  assert.equal(download.status, 200)
  assert.match(download.headers.get('cache-control') ?? '', /no-store/)
  assert.match(await download.text(), /BEGIN:VCARD/)
  assert.deepEqual(await statuses(inactiveCard), [404, 404])
  await app.open(`/business-card/${'3'.repeat(64)}`)
  await expect(browser.locator('h1:has-text("Sari Contoh")')).toBeVisible()
  await app.screenshot('recipient-executive-narrow')
  const company = browser.locator('[role="tab"]:has-text("Company")')
  const product = browser.locator('summary:has-text("Michelin Earthmover Tires")')
  await company.click()
  try {
    await product.waitFor({ state: 'visible', timeout: 4000 })
  } catch {
    // The dev server may render the tab before React attaches its handlers.
    await company.click()
    await expect(product).toBeVisible()
  }
  await product.click()
  await expect(browser.locator('a:has-text("Michelin reference")')).toBeVisible()
  await browser.locator('button[aria-label="Next photo"]').click()
  await expect(browser.locator('figcaption:has-text("Heavy-equipment tire operations")')).toBeVisible()
  await browser.setViewport({ width: 1280, height: 1000 })
  await app.screenshot('recipient-executive-company')
  await browser.locator('[role="tab"]:has-text("Gallery")').click()
  await expect(browser.locator('iframe[title="Official Chitra Paratama Instagram profile"]')).not.toBeVisible()
  // Deterministic third-party failure: the links must still work independently of the frame.
  await browser.route(/https:\/\/www\.instagram\.com\/chitraparatama_id\/embed\//, route => route.abort())
  await browser.locator('button:has-text("Load Instagram preview")').click()
  assert.equal(await browser.evaluate(() => document.querySelector('iframe[title="Official Chitra Paratama Instagram profile"]')?.getAttribute('referrerpolicy') ?? ''), 'no-referrer')
  await expect(browser.locator('a:has-text("Open Instagram profile")')).toBeVisible()
  await expect(browser.locator('a:has-text("Mining Expo 2025")')).toBeVisible()
  await browser.locator('button:has-text("Close Instagram preview")').click()
  await expect(browser.locator('iframe[title="Official Chitra Paratama Instagram profile"]')).not.toBeVisible()
})
