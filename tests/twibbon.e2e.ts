import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import sharp from 'sharp'
import { loginToHero } from './e2e-auth-helper'

const execFileAsync = promisify(execFile)

async function createSampleAssets(dir: string) {
  const makeFramePng = async (width: number, height: number, filePath: string, colorHex: string) => {
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${colorHex}" stroke-width="48"/>
      <rect x="48" y="${height - 140}" width="${width - 96}" height="92" rx="18" fill="${colorHex}" fill-opacity="0.9"/>
      <text x="${width / 2}" y="${height - 82}" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#ffffff" text-anchor="middle">ONE CHITRA HERO</text>
    </svg>`
    await sharp(Buffer.from(svg)).png().toFile(filePath)
  }

  const sqPath = path.join(dir, 'frame-1x1.png')
  const portPath = path.join(dir, 'frame-4x5.png')
  const storyPath = path.join(dir, 'frame-9x16.png')
  const photoPath = path.join(dir, 'sample-photo.jpg')
  const videoPath = path.join(dir, 'sample-video.mp4')

  await Promise.all([
    makeFramePng(1080, 1080, sqPath, '#0753e7'),
    makeFramePng(1080, 1350, portPath, '#0f766e'),
    makeFramePng(1080, 1920, storyPath, '#7c3aed'),
    sharp({
      create: {
        width: 1200,
        height: 900,
        channels: 3,
        background: { r: 30, g: 136, b: 229 },
      },
    })
      .jpeg({ quality: 90 })
      .toFile(photoPath),
  ])

  await execFileAsync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=size=640x480:rate=24:duration=2',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=2',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    videoPath,
  ])

  return { sqPath, portPath, storyPath, photoPath, videoPath }
}

test('Twibbon Studio desktop & mobile: upload PNG templates (1:1, 4:5, 9:16), merge photo, and merge MP4 video', async ({
  app,
  screen,
  browser,
}) => {
  const assetDir = await mkdtemp(path.join(os.tmpdir(), 'hero-twibbon-e2e-'))
  const templateTitle = `E2E Twibbon Campaign ${Date.now().toString().slice(-5)}`

  try {
    const assets = await createSampleAssets(assetDir)

    // 1. Login and navigate to Desktop Twibbon Studio
    await loginToHero(app, screen, browser, '/dashboard/twibbon')
    await expect(browser.locator('h1:has-text("Twibbon Studio")').first()).toBeVisible({
      timeout: 30000,
    })

    // 2. Open "Buat Template Twibbon" modal
    await browser.locator('button:has-text("Buat Template Twibbon")').first().click()
    await expect(browser.locator('text=Buat Template Twibbon Baru').first()).toBeVisible({
      timeout: 15000,
    })

    await browser
      .locator('input[placeholder*="HUT PT Chitra Paratama"]')
      .first()
      .fill(templateTitle)
    await browser
      .locator('input[placeholder*="Instruksi singkat"]')
      .first()
      .fill('Campaign otomatis E2E untuk frame 1:1, 4:5, dan 9:16.')
    await browser
      .locator('textarea[placeholder*="Bangga menjadi bagian"]')
      .first()
      .fill('Bangga berkarya bersama PT Chitra Paratama! #OneChitra #HERO')

    // Upload all 3 PNG aspect ratios
    await browser.locator('#twibbon-png-1-1').setInputFiles(assets.sqPath)
    await expect(browser.locator('img[alt="Preview Square 1:1"]').first()).toBeVisible({
      timeout: 30000,
    })

    await browser.locator('#twibbon-png-4-5').setInputFiles(assets.portPath)
    await expect(browser.locator('img[alt="Preview Portrait 4:5"]').first()).toBeVisible({
      timeout: 30000,
    })

    await browser.locator('#twibbon-png-9-16').setInputFiles(assets.storyPath)
    await expect(browser.locator('img[alt="Preview Story / Reels 9:16"]').first()).toBeVisible({
      timeout: 30000,
    })

    await app.screenshot('twibbon-template-form-dialog')

    // Submit template
    await browser.locator('button[type="submit"]:has-text("Publikasikan Template")').first().click()
    await expect(browser.locator(`text=${templateTitle}`).first()).toBeVisible({ timeout: 20000 })

    // 3. Auto-merge photo in Desktop Studio across ratios
    const studioFileInput = browser.locator('input[type="file"][accept="image/*,video/*"]').first()
    await studioFileInput.setInputFiles(assets.photoPath)

    await expect(browser.locator('button:has-text("Download Foto (1:1)")').first()).toBeVisible({
      timeout: 15000,
    })
    await expect(browser.locator('button:has-text("Download Foto (1:1)")').first()).toBeEnabled({
      timeout: 15000,
    })
    await app.screenshot('twibbon-desktop-photo-merge')

    // Switch to 4:5 and 9:16
    await browser.locator('button:has-text("Portrait 4:5")').first().click()
    await expect(browser.locator('button:has-text("Download Foto (4:5)")').first()).toBeEnabled({
      timeout: 15000,
    })

    // 4. Upload video and verify server-side FFmpeg MP4 merge
    await studioFileInput.setInputFiles(assets.videoPath)
    const mergeVideoBtn = browser.locator('button:has-text("Merge & Download Video MP4")').first()
    await expect(mergeVideoBtn).toBeVisible({ timeout: 15000 })

    const [mergeResponse] = await Promise.all([
      browser.waitForResponse(/\/api\/twibbon\/merge-video\?.*download=1/, { timeout: 60000 }),
      mergeVideoBtn.click(),
    ])
    const mergeStatus =
      typeof mergeResponse?.status === 'function'
        ? mergeResponse.status()
        : mergeResponse?.status
    expect(mergeStatus).toBe(200)
    await expect(browser.locator('button:has-text("Download Ulang MP4")').first()).toBeVisible({
      timeout: 30000,
    })
    await app.screenshot('twibbon-desktop-video-merge')

    // 5. Verify Management Table tab
    await browser.locator('button[role="tab"]:has-text("Kelola Template")').first().click()
    await expect(browser.locator(`text=${templateTitle}`).first()).toBeVisible({ timeout: 15000 })
    await app.screenshot('twibbon-desktop-manage-table')

    // 6. Verify Mobile Twibbon view
    await app.open(`/mobile/twibbon`)
    await expect(browser.locator('h1:has-text("Twibbon Foto & Video IG")').first()).toBeVisible({
      timeout: 20000,
    })
    await expect(browser.locator(`text=${templateTitle}`).first()).toBeVisible({ timeout: 15000 })

    // Select test template and test photo upload on mobile
    await browser.locator(`button:has-text("${templateTitle}")`).first().click()
    const mobileFileInput = browser.locator('input[type="file"][accept="image/*,video/*"]').first()
    await mobileFileInput.setInputFiles(assets.photoPath)
    await expect(browser.locator('button:has-text("Download Foto")').first()).toBeEnabled({
      timeout: 15000,
    })
    await app.screenshot('twibbon-mobile-studio')

    // 7. Cleanup test template from "Template Saya"
    await browser.locator('button:has-text("Template Saya")').first().click()
    const rowDeleteBtn = browser
      .locator(`div:has(> div:has-text("${templateTitle}")) button:has(svg.lucide-trash-2)`)
      .first()
    await rowDeleteBtn.click()
    await browser.locator('button:has-text("Hapus")').last().click()
    await new Promise((resolve) => setTimeout(resolve, 1500))
  } finally {
    await rm(assetDir, { recursive: true, force: true }).catch(() => {})
  }
})
