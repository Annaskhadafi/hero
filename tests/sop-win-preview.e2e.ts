import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('SOP/WIN document preview opens', async ({ app, screen, browser }) => {
  await loginToHero(app, screen, browser, '/dashboard/sop-win')
  await app.open('/dashboard/sop-win')
  const preview = browser.locator('button[title="Buka Side Preview"]').first()
  await expect(preview).toBeVisible({ timeout: 60000 })
  await preview.click()
  const pdf = browser.locator('canvas').first()
  await expect(pdf).toBeVisible({ timeout: 30000 })
  await expect(browser.locator('text=Menyiapkan PDF reader...')).not.toBeVisible({ timeout: 30000 })
  await app.screenshot('sop-win-document-preview')
})
