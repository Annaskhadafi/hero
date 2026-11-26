import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies organizational roles expansion in role management and user management', { timeout: 180000 }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Authenticate with standard credentials
  await loginToHero(app, screen, browser);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Navigate to Role Management
  await app.open('/dashboard/security/roles');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Hide floating chat widget
  await browser.evaluate(() => {
    document.querySelectorAll('[title*="Hero Genius"]').forEach((el: any) => {
      el.style.display = 'none';
    });
  });

  // Verify Role Management page heading
  const roleHeading = browser.locator('h1:has-text("Role & Permission")').first();
  await expect(roleHeading).toBeVisible({ timeout: 45000 });

  // Verify expanded organizational roles appear in the left-hand role list
  const bodRole = browser.locator('button:has-text("Executive / BoD")').first();
  await expect(bodRole).toBeVisible({ timeout: 20000 });

  const gmRole = browser.locator('button:has-text("General Manager")').first();
  await expect(gmRole).toBeVisible({ timeout: 10000 });

  const csRole = browser.locator('button:has-text("Central Services Manager")').first();
  await expect(csRole).toBeVisible({ timeout: 10000 });

  // Take screenshot of Role Management
  await app.screenshot('001-security-roles-org-structure');

  // 3. Navigate to User Management
  await app.open('/dashboard/security/users');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Verify User Management page heading or content
  const userHeading = browser.locator('h1, h2, text="User Management", text="Pengguna"').first();
  await expect(userHeading).toBeVisible({ timeout: 45000 });

  // Take screenshot of User Management
  await app.screenshot('002-security-users-role-options');
});
