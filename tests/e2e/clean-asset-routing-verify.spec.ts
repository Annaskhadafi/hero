// @ts-nocheck
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ARTIFACT_SCREENSHOT_DIR = path.resolve('C:/Users/Gilang/.gemini/antigravity/brain/cf54385a-5275-42dc-b6ad-77b83a11e1a1/screenshots/wipe-verify')
const OUTPUT_SCREENSHOT_DIR = path.join(process.cwd(), 'outputs/screenshots/wipe-verify')

test.describe('Verify 3 Asset Approval Lists Removed from Workflow Studio', () => {
  test.setTimeout(180000)

  test('Verify CER, Asset Disposal, and Asset Transfer are removed from Workflow Studio table', async ({ page }) => {
    fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true })
    fs.mkdirSync(OUTPUT_SCREENSHOT_DIR, { recursive: true })

    // 1. Authenticate with standard system credentials
    console.log('Logging in to HERO...')
    await page.goto('/sign-in')
    await page.getByPlaceholder('Masukkan email atau SN').fill('mochamad.khadafi@chitraparatama.co.id')
    await page.getByPlaceholder('Masukkan kata sandi').fill('Chitra#71261')
    await page.getByRole('button', { name: 'Masuk ke HERO' }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 45000 })
    console.log('Login successful.')

    // 2. Navigate to Workflow Studio
    console.log('Navigating to Workflow Studio...')
    await page.goto('/dashboard/workflow-studio')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)

    // Verify Workflow Studio overview is rendered
    await expect(page.locator('text=Workflow Studio').first()).toBeVisible({ timeout: 15000 })

    // Verify CER, Transfer, and Disposal rows do NOT exist in the list table
    const cerCount = await page.locator('tr:has-text("Pengadaan Aset (CER)")').count()
    const transferCount = await page.locator('tr:has-text("Transfer Aset")').count()
    const disposalCount = await page.locator('tr:has-text("Disposal Aset")').count()

    console.log(`Row counts in table: CER = ${cerCount}, Transfer = ${transferCount}, Disposal = ${disposalCount}`)
    expect(cerCount).toBe(0)
    expect(transferCount).toBe(0)
    expect(disposalCount).toBe(0)

    // Take screenshot of Workflow Studio showing the table without the 3 asset approval lists
    const ssRemoved = path.join(ARTIFACT_SCREENSHOT_DIR, '03_workflow_studio_asset_lists_removed.png')
    await page.screenshot({ path: ssRemoved, fullPage: true })
    fs.copyFileSync(ssRemoved, path.join(OUTPUT_SCREENSHOT_DIR, '03_workflow_studio_asset_lists_removed.png'))
    console.log('Saved screenshot 03_workflow_studio_asset_lists_removed.png')
  })
})
