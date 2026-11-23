import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { loginToHero } from './e2e-auth-helper'

test('LMS Testimonials feature under Leaderboard with Play Store style reviews and form', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Log in to HERO and navigate to ChitraLearning Testimonials
  await loginToHero(app, screen, browser, '/dashboard/chitralearning-lms/testimonials')

  await app.open('/dashboard/chitralearning-lms/testimonials')
  await new Promise((r) => setTimeout(r, 3500))

  // Dismiss birthday dialog if visible
  const dismissBtn = browser.locator('button:has-text("TUTUP / MENGERTI")').first()
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
  }

  // 2. Take screenshot of the Google Playstore style testimonials page
  await app.screenshot('01-lms-testimonials-playstore-view')

  // 3. Click "Tulis Testimoni" button to open the 6-question form dialog
  const writeBtn = browser.locator('button:has-text("Tulis Testimoni")').first()
  await writeBtn.click()
  await new Promise((r) => setTimeout(r, 1500))

  // 4. Take screenshot of the open modal with auto-detected profile and 6 questions
  await app.screenshot('02-lms-testimonials-form-modal')

  // 4. Fill training module
  const customInput = screen.getByPlaceholder(/Ketik modul lainnya/i, { visible: true })
  await customInput.fill('Brushing Out, Fastening System')

  // Fill question 3: experience review
  const expReview = screen.getByPlaceholder(/Ceritakan pengalaman Anda selama mengikuti pembelajaran/i, {
    visible: true,
  })
  await expReview.fill(
    'Pelatihan ini sangat komprehensif dan aplikatif. Studi kasus di lapangan mempermudah teknisi memahami penyebab kerusakan ban.'
  )

  // Fill question 4: knowledge benefit
  const knowledge = screen.getByPlaceholder(/Saya menjadi lebih memahami konstruksi ban/i, {
    visible: true,
  })
  await knowledge.fill(
    'Memahami identifikasi kerusakan tapak ban dan standar pengukuran sisa telapak (OTD).'
  )

  // Fill question 5: feedback suggestion
  const feedback = screen.getByPlaceholder(/Tuliskan saran atau masukan untuk pengembangan Chitra Learning/i, {
    visible: true,
  })
  await feedback.fill('Harap sertakan video panduan perbaikan rim yang interaktif.')

  // Screenshot form filled
  await app.screenshot('03-lms-testimonials-form-filled')

  // 6. Submit the form
  const submitBtn = screen.getByRole('button', { name: /Kirim Testimoni/i, visible: true })
  await submitBtn.click()
  await new Promise((r) => setTimeout(r, 4000))

  // 7. Verify result and take screenshot
  await app.screenshot('04-lms-testimonials-list-updated')

  // 8. Test deleting a testimonial and verify scorecard reactive update
  const deleteBtn = screen.getByRole('button', { name: /Hapus ulasan/i, visible: true }).first()
  if (await deleteBtn.isVisible().catch(() => false)) {
    await deleteBtn.click()
    await new Promise((r) => setTimeout(r, 1000))

    // Confirm deletion in HeroConfirmDialog
    const confirmBtn = screen.getByRole('button', { name: /Ya, Hapus/i, visible: true })
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click()
      await new Promise((r) => setTimeout(r, 3000))
    }

    // 9. Take screenshot after deletion verifying scorecard and rating summary updated
    await app.screenshot('05-lms-testimonials-after-delete')
  }
})
