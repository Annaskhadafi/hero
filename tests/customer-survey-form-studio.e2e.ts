import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify customer survey 2026 in form studio and public form view', async ({ app, screen, browser, agent }) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Open Form Studio Dashboard
  await app.open('/dashboard/form-studio');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();

  // Verify Customer Survey 2026 is visible in the form list
  await expect(screen.getByText('Survei Kepuasan Pelanggan 2026')).toBeVisible();
  await app.screenshot('form-studio-list-customer-survey-2026');

  // 3. Open Form Builder for Customer Survey 2026
  await app.open('/dashboard/form-studio/152789/builder');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();
  await expect(screen.getByText(/4\. Tenaga Penjual/i)).toBeVisible();
  await app.screenshot('form-studio-builder-customer-survey-2026');

  // 4. Open Public Form
  await app.open('/form/f/customer-survey-2026');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();

  // Verify Identity Gate
  await expect(screen.getByText(/Survei Kepuasan Pelanggan 2026/i)).toBeVisible();
  await expect(screen.getByText(/Identitas Responden/i)).toBeVisible();
  await app.screenshot('public-form-identity-gate');

  // Fill Identity
  const nameInput = screen.getByPlaceholder(/nama lengkap/i);
  await nameInput.fill('Budi Santoso');

  const emailInput = screen.getByPlaceholder(/nama@email.com/i);
  await emailInput.fill('budi.santoso@mining-partner.com');

  const companyInput = screen.getByPlaceholder(/contoh: pt/i);
  if (await companyInput.isVisible()) {
    await companyInput.fill('PT Mitra Tambang Nusantara');
  }

  const deptInput = screen.getByPlaceholder(/plant \/ logistic/i);
  if (await deptInput.isVisible()) {
    await deptInput.fill('Procurement & Supply Chain');
  }

  // Click Mulai Mengisi Kuesioner
  const startButton = screen.getByRole('button', { name: /Mulai Mengisi Kuesioner/i });
  await startButton.tap();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Verify Questions Rendered
  await expect(screen.getByText(/4\. Tenaga Penjual/i)).toBeVisible();
  await expect(screen.getByText(/5\. Produk dan Harga/i)).toBeVisible();
  await app.screenshot('public-form-questions-rendered');

  await agent.assert('The public form renders all sections including Likert matrices scale 1-10, Net Promoter Score, and complaint feedback questions cleanly.');
});
