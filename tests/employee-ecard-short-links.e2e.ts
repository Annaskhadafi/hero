import assert from 'node:assert/strict'
import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

const base = 'http://127.0.0.1:3134'
const legacyCard = `/business-card/${'0'.repeat(64)}`
const aliasCard = '/business-card/nara-contoh'
const inactiveCard = `/business-card/${'1'.repeat(64)}`

function guard() {
  assert.equal(process.env.E2E_APP_URL, base)
  assert.equal(process.env.HERO_E2E_USERNAME, 'TKT0004-FIXTURE')
  assert.ok(process.env.HERO_E2E_PASSWORD)
}

async function statuses(path: string) {
  return Promise.all(['', '/contact.vcf'].map(async suffix =>
    (await fetch(base + path + suffix, { redirect: 'manual' })).status))
}

test('short employee e-card alias shares profile, QR and vCard; legacy links remain gated on revocation', async ({ app, browser, screen }) => {
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
  assert.deepEqual(await statuses(aliasCard), [404, 404])
  assert.deepEqual(await statuses(legacyCard), [404, 404])
  await expect(browser.locator('button:has-text("Show QR")')).not.toBeVisible()

  try {
    await toggle.click()
    await expect(enabled).toBeVisible()
    assert.deepEqual(await statuses(aliasCard), [200, 200])
    assert.deepEqual(await statuses(legacyCard), [200, 200])

    const profileResponse = await fetch(base + aliasCard)
    const profile = await profileResponse.text()
    assert.match(profile, /Nara Contoh/)
    const vcardResponse = await fetch(base + aliasCard + '/contact.vcf')
    const vcard = await vcardResponse.text()
    assert.equal(vcardResponse.status, 200)
    assert.match(vcard, /BEGIN:VCARD/)
    assert.match(vcard, /FN:Nara Contoh/)
    assert.match(vcard, /URL:https?:\/\/[^\r\n]*\/business-card\/nara-contoh/)

    await browser.locator('button:has-text("Show QR")').click()
    await expect(browser.locator('img[alt="Scan to open this digital business card"]')).toBeVisible()
    const qrLink = await browser.evaluate(() => document.querySelector('[role="dialog"] a[href^="https://hero.chitraparatama.com/business-card/"]')?.getAttribute('href') ?? '')
    assert.match(qrLink, /\/business-card\/nara-contoh$/)
    await app.screenshot('short-ecard-owner-qr')
    await browser.locator('[role="dialog"] button:has-text("Tutup")').last().click()

    await app.open(aliasCard)
    await expect(browser.locator('h1:has-text("Nara Contoh")')).toBeVisible()
    await app.screenshot('short-ecard-public-profile')

    assert.deepEqual(await statuses('/business-card/not-a-valid-alias'), [404, 404])
    assert.deepEqual(await statuses(inactiveCard), [404, 404])
  } finally {
    await app.open('/mobile/profile')
    await browser.locator('button:has-text("E-Business Card")').click()
    await expect(toggle).toBeVisible()
    if (await enabled.isVisible()) await toggle.click()
  }

  await expect(enabled).not.toBeVisible()
  assert.deepEqual(await statuses(aliasCard), [404, 404])
  assert.deepEqual(await statuses(legacyCard), [404, 404])
})
