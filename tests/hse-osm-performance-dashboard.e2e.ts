import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verify HSE On Spot Monitoring Performance Dashboard components and metrics', { timeout: 300000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate and open OSM page
  await loginToHero(app, screen, browser, '/dashboard/hse/osm');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Verify Performance Dashboard section is present below ticket KPIs
  const perfSectionTitle = browser.locator('text=HSE On Spot Monitoring Performance').first();
  await expect(perfSectionTitle).toBeVisible({ timeout: 60000 });

  // 3. Verify PTQ Percentage card
  const ptqCard = browser.locator('text=PTQ Percentage').first();
  await expect(ptqCard).toBeVisible({ timeout: 15000 });

  // 4. Verify Q1 - Q4 scorecards
  await expect(browser.locator('text=Q1').first()).toBeVisible();
  await expect(browser.locator('text=Q2').first()).toBeVisible();
  await expect(browser.locator('text=Q3').first()).toBeVisible();
  await expect(browser.locator('text=Q4').first()).toBeVisible();

  // Screenshot 1: Overview of scorecards and charts
  await app.screenshot('01-osm-performance-kpi-and-charts');

  // 5. Verify Site Leaderboard and Policy Callout Card
  const leaderboard = browser.locator('text=Peringkat Kepatuhan Site').first();
  await expect(leaderboard).toBeVisible({ timeout: 15000 });

  const policyCard = browser.locator('text=Standar Kepatuhan Inspeksi OSM').first();
  await expect(policyCard).toBeVisible({ timeout: 15000 });

  // 6. Verify Monthly matrix detail table
  const detailTable = browser.locator('text=HSE Performance — Detail (per Section & Personil)').first();
  await expect(detailTable).toBeVisible({ timeout: 15000 });

  // Screenshot 2: Monthly matrix detail table
  await app.screenshot('02-osm-performance-monthly-matrix');
});
