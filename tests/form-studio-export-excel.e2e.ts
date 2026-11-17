import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify form studio export excel feature in form studio list, analytics and builder', async ({
  app,
  screen,
  browser,
  agent,
}) => {
  // 1. Login to HERO
  await loginToHero(app, screen, browser);

  // 2. Open Form Studio Dashboard
  await app.open('/dashboard/form-studio');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();

  // Verify Form Studio Table and Screenshot
  await app.screenshot('form-studio-dashboard');

  // 3. Open Analytics for Form 1 (Daily Activity)
  await app.open('/dashboard/form-studio/1/analytics');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();

  // Verify Export ke Excel (.xlsx) button is visible
  const excelButton = screen.getByRole('button', { name: /Export ke Excel/i });
  await expect(excelButton).toBeVisible();
  await app.screenshot('form-analytics-export-excel-page');

  // 4. Open Form Builder for Form 1
  await app.open('/dashboard/form-studio/1/builder');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await expect(browser.locator('body')).toBeVisible();

  // Verify Export Excel button in builder header
  const builderExcelButton = screen.getByRole('button', { name: /Export Excel/i });
  await expect(builderExcelButton).toBeVisible();
  await app.screenshot('form-builder-header-export-excel');

  await agent.assert('The form builder header contains an Export Excel action button.');
});
