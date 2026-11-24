import assert from 'node:assert/strict'
import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

const base = 'http://127.0.0.1:3134'
test('public e-card opens by short alias and keeps the full contact name', async ({ app, browser }) => {
  test.skip(process.env.HERO_BUSINESS_CARD_FIXTURE !== '1', 'Disposable fixture only')
  assert.equal(process.env.E2E_APP_URL, base)
  const alias = '/business-card/sari-contoh'
  const legacy = `/business-card/${'3'.repeat(64)}`
  await browser.setViewport({ width: 390, height: 844 })
  await app.open(alias)
  await expect(browser.locator('h1:has-text("Sari Contoh")')).toBeVisible()
  const download = browser.locator('a:has-text("Save Contact")')
  await expect(download).toBeVisible()
  assert.equal(await browser.evaluate(() => document.querySelector('a[href$="/contact.vcf"]')?.getAttribute('href') ?? ''), alias + '/contact.vcf')
  for (const path of [alias, legacy]) {
    const res = await fetch(base + path + '/contact.vcf')
    assert.equal(res.status, 200)
    const text = await res.text()
    assert.match(text, /FN:Sari Contoh/)
    assert.ok(text.includes(`URL:https://hero.chitraparatama.com${alias}`))
  }
  assert.equal((await fetch(base + legacy)).status, 200)
  for (const path of ['/business-card/no-such-ecard', '/business-card/invalid--alias', `/business-card/${'1'.repeat(64)}`]) {
    for (const suffix of ['', '/contact.vcf']) assert.equal((await fetch(base + path + suffix)).status, 404)
  }
  await app.screenshot('ecard-public-short-link')

})
