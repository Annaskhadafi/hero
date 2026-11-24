import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import sharp from 'sharp'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loginToHero } from './e2e-auth-helper'

for (const mobile of [true, false]) {
  test(`business card crop and OpenAI review on ${mobile ? 'mobile' : 'desktop'}`, async ({ app, screen, browser }) => {
    const route = mobile ? '/mobile/business-cards' : '/dashboard/business-cards'
    await loginToHero(app, screen, browser, '/mobile/business-cards')
    await browser.setViewport(mobile ? { width: 390, height: 760 } : { width: 1200, height: 850 })
    if (!new URL(await browser.url()).pathname.endsWith(route)) await app.open(route)
    const scan = browser.locator(`button:has-text("${mobile ? 'Scan Sekarang' : 'Scan Kartu Nama'}")`).first()
    const file = browser.locator('[role="dialog"] input[type="file"]:not([capture])')
    await scan.click()
    try {
      await file.waitFor({ state: 'attached', timeout: 3000 })
    } catch {
      // A server-rendered trigger can be visible before its event handler hydrates.
      await scan.click()
      await file.waitFor({ state: 'attached', timeout: 10000 })
    }
    const dir = await mkdtemp(join(process.env.TMPDIR || '/root/.hermes/cache/scratch', 'hero-card-'))
    try {
      const fixture = join(dir, 'synthetic.png')
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#e2e8f0"/><rect x="100" y="85" width="600" height="320" fill="white"/><g font-family="sans-serif" fill="black"><text x="120" y="155" font-size="36">Rina Contoh</text><text x="120" y="220" font-size="32">PT Demo Expo</text><text x="120" y="280" font-size="27">Logistik - Angkutan Kargo</text></g></svg>'
      await writeFile(fixture, await sharp(Buffer.from(svg)).png().toBuffer())
      await file.setInputFiles(fixture)
      await expect(browser.locator('[aria-label="Geser bingkai potong"]')).toBeVisible()
      await browser.locator('[aria-label="Geser bingkai potong"]').press('ArrowRight')
      await browser.locator('[aria-label="Ubah ukuran bingkai potong"]').press('ArrowLeft')
      await app.screenshot(`business-card-${mobile ? 'mobile' : 'desktop'}-crop`)
      await browser.locator('button:has-text("Potong & Pindai")').click()
      await expect(browser.locator('text=Data berhasil diekstrak. Periksa sebelum menyimpan.')).toBeVisible({ timeout: 90000 })
      const form = await browser.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')!
        const input = (placeholder: string) => dialog.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)?.value || ''
        return { name: input('Nama Lengkap'), company: input('Nama Perusahaan'), products: input('Produk atau layanan perusahaan'), event: input('Contoh: Mining Indonesia 2026') }
      })
      expect(form.name).toBe('Rina Contoh')
      expect(form.company).toBe('PT Demo Expo')
      if (form.products) expect(form.products.toLowerCase()).toContain('kargo')
      await browser.locator('input[placeholder="Produk atau layanan perusahaan"]').fill('Angkutan Kargo')
      expect(form.event).toBe('')
      await app.screenshot(`business-card-${mobile ? 'mobile' : 'desktop'}-review`)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
}
