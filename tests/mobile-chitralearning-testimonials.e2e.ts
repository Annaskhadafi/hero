import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('ChitraLearning Mobile 5-button navigation and Testimonials feature with Play Store style reviews', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Mobile viewport
  await browser.setViewport({ width: 390, height: 844 })

  // 2. Log in to HERO and navigate to mobile ChitraLearning
  await loginToHero(app, screen, browser, '/mobile/chitralearning')
  await app.open('/mobile/chitralearning')
  await new Promise((r) => setTimeout(r, 3000))

  // Dismiss birthday dialog if visible
  const dismissBtn = browser.locator('button:has-text("TUTUP / MENGERTI")').first()
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
  }

  // 3. Verify all 5 quick navigation buttons are present
  const quickNav = browser.locator('section.grid-cols-5').first()
  await expect(quickNav).toBeVisible({ timeout: 15000 })

  const jelajahiBtn = browser.locator('a[href="/mobile/chitralearning/courses"]:has-text("Jelajahi")').first()
  const kursusSayaBtn = browser.locator('a[href="/mobile/chitralearning/my-learning"]:has-text("Kursus Saya")').first()
  const sertifikatBtn = browser.locator('a[href="/mobile/chitralearning/certificates"]:has-text("Sertifikat")').first()
  const pengajuanBtn = browser.locator('a[href*="/mobile/chitralearning/my-learning?tab=pending"]:has-text("Pengajuan")').first()
  const testimoniBtn = browser.locator('a[href="/mobile/chitralearning/testimonials"]:has-text("Testimoni")').first()

  await expect(jelajahiBtn).toBeVisible()
  await expect(kursusSayaBtn).toBeVisible()
  await expect(sertifikatBtn).toBeVisible()
  await expect(pengajuanBtn).toBeVisible()
  await expect(testimoniBtn).toBeVisible()

  // 4. Take screenshot of the mobile ChitraLearning home with 5 navigation buttons
  await app.screenshot('01-mobile-chitralearning-home-5-nav')

  // 5. Navigate to /mobile/chitralearning/testimonials
  await app.open('/mobile/chitralearning/testimonials')
  await new Promise((r) => setTimeout(r, 3000))

  // 6. Verify we are on /mobile/chitralearning/testimonials
  const headerTitle = browser.locator('h1:has-text("Testimoni & Ulasan")').first()
  await expect(headerTitle).toBeVisible({ timeout: 15000 })

  // 7. Verify Play Store style rating summary card
  const scoreCard = browser.locator('section:has-text("Rating & Ulasan Rekan Kerja")').first()
  await expect(scoreCard).toBeVisible()

  // 8. Screenshot Play Store style reviews on mobile
  await app.screenshot('02-mobile-chitralearning-testimonials-playstore-view')

  // 9. Click "Tulis Ulasan" button
  const writeBtn = browser.locator('button:has-text("Tulis Ulasan")').first()
  await expect(writeBtn).toBeVisible()
  await writeBtn.click()
  await new Promise((r) => setTimeout(r, 1500))

  // 10. Verify Form Dialog is open
  const dialogTitle = browser.locator('[role="dialog"] :has-text("Tulis Ulasan Pembelajaran")').first()
  await expect(dialogTitle).toBeVisible({ timeout: 10000 })

  await app.screenshot('03-mobile-chitralearning-testimonial-form-modal')

  // 11. Fill Question 3: Experience review
  const expTextarea = browser.locator('[role="dialog"] textarea').first()
  await expTextarea.fill(
    'Materi ChitraLearning di HP sangat interaktif dan mudah diakses dari site. Penjelasan video dan kuisnya sangat membantu pemahaman operasional lapangan.'
  )

  // 12. Fill Question 4: Knowledge benefit
  const benefitTextarea = browser.locator('[role="dialog"] textarea').nth(1)
  await benefitTextarea.fill(
    'Memperdalam pemahaman inspeksi tapak ban, prosedur keselamatan K3, dan perawatan berkala unit secara mandiri.'
  )

  // 13. Fill Question 5: Feedback suggestion
  const feedbackTextarea = browser.locator('[role="dialog"] textarea').nth(2)
  await feedbackTextarea.fill(
    'Mohon terus tambahkan modul interaktif troubleshooting untuk mekanik di site.'
  )

  // 14. Screenshot filled form
  await app.screenshot('04-mobile-chitralearning-testimonial-form-filled')

  // 15. Submit testimonial
  const submitBtn = browser.locator('[role="dialog"] button:has-text("Kirim Testimoni")').first()
  await submitBtn.click()
  await new Promise((r) => setTimeout(r, 4000))

  // 16. Verify updated list and take screenshot
  await app.screenshot('05-mobile-chitralearning-testimonials-list-updated')
})
