import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test(
  'outbound email template live preview resolves links to https://hero.chitraparatama.com without localhost:3000',
  async ({ app, screen, browser }) => {
    await loginToHero(app, screen, browser)

    await app.open('/dashboard/settings/email')
    await expect(browser.locator('h1:has-text("Email Settings")').first()).toBeVisible({
      timeout: 30000,
    })

    // Switch to Template tab
    const templateTab = browser.locator('[role="tab"]:has-text("Template")').first()
    await templateTab.click()

    // Find a workflow approval template row (PTW Approval Request or any row with Edit template)
    const ptwRow = browser.locator('tr:has-text("ptw_approval_request")').first()
    const targetRow = (await ptwRow.count()) > 0 ? ptwRow : browser.locator('tbody tr').first()
    await expect(targetRow).toBeVisible({ timeout: 20000 })

    await app.screenshot('email-templates-list')

    // Open template editor & live preview dialog
    const editBtn = targetRow.locator('button[title^="Edit template"]').first()
    await editBtn.click()

    const previewFrame = browser.locator('iframe[title="Live preview HTML"]').first()
    await expect(previewFrame).toBeVisible({ timeout: 15000 })

    // Verify rendered anchor hrefs inside preview iframe use production domain, never localhost:3000
    const srcDoc = await previewFrame.getAttribute('srcdoc')
    expect(srcDoc || '').not.toContain('localhost:3000')
    expect(srcDoc || '').not.toContain('127.0.0.1:3000')
    expect(srcDoc || '').toContain('https://hero.chitraparatama.com')

    await app.screenshot('email-template-preview-production-url')
  },
)
