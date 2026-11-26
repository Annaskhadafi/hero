import process from 'node:process'
import { test } from '@e2e-dev/web'
import { expect } from 'e2e'


const credentials = (user: string) => ({ username: `notes-${user}@fixture.invalid`, password: process.env.HERO_NOTES_FIXTURE_PASSWORD })
const date = process.env.HERO_NOTES_FIXTURE_DATE
const myDay = '/dashboard/activity-hub/my-day?noteSessionId=42001&noteItemId=42001'
const note = 'Fixture: verify tire pressure before handover.'

async function signIn(app: any, browser: any, user: string) {
  await app.open('/api/health')
  const status = await browser.evaluate(async ({ username, password }: ReturnType<typeof credentials>) => {
    const response = await fetch('/api/auth/sign-in/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    })
    return response.status
  }, credentials(user))
  expect(status).toBe(200)
}

test('supervisor appends a note to the selected activity', async ({ app, browser }) => {
  if (!process.env.HERO_NOTES_FIXTURE_PASSWORD || !date || process.env.E2E_APP_URL !== 'http://127.0.0.1:3138') throw new Error('Isolated Notes fixture required')
  const target = `/dashboard/daily-activity?siteId=40004&date=${date}`
  await signIn(app, browser, 'supervisor')
  await app.open(target)
  await expect(browser.locator('th:has-text("Catatan Atasan")')).toBeVisible({ timeout: 60000 })
  const row = browser.locator('tr:has-text("Fixture tire inspection")').first()
  await expect(row).toBeVisible({ timeout: 30000 })
  await expect(browser.locator('tr:has-text("Fixture tire inspection"):has-text("catatan")').first()).toBeVisible({ timeout: 30000 })
  await browser.locator('tr:has-text("Fixture tire inspection") button[aria-haspopup="menu"]').first().click()
  await browser.locator('[role="menuitem"]:has-text("Catatan Atasan — Fixture tire inspection")').click()
  await browser.locator('[role="dialog"] textarea').fill(note)
  await browser.locator('[role="dialog"] button:has-text("Tambah Catatan")').click()
  await expect(browser.locator(`[role="dialog"] p:has-text("${note}")`)).toBeVisible({ timeout: 15000 })
  await app.screenshot('supervisor-note-saved')
})

for (const user of ['owner', 'other']) {
  test(`${user} note visibility in My Day`, async ({ app, browser }) => {
    if (!process.env.HERO_NOTES_FIXTURE_PASSWORD || process.env.E2E_APP_URL !== 'http://127.0.0.1:3138') throw new Error('Isolated Notes fixture required')
    await signIn(app, browser, user)
    await app.open(myDay)
    await expect(browser.locator('[role="dialog"]:has-text("Supervisor activity notes")')).toBeVisible({ timeout: 60000 })
    if (user === 'owner') {
      await expect(browser.locator(`[role="dialog"] p:has-text("${note}")`).first()).toBeVisible({ timeout: 30000 })
      await app.screenshot('employee-note-read-only')
    } else {
      await expect(browser.locator('[role="dialog"]:has-text("No notes available")')).toBeVisible({ timeout: 30000 })
      await expect(browser.locator(`[role="dialog"] p:has-text("${note}")`).first()).not.toBeVisible()
    }
  })
}
