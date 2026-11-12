import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginToHero } from './e2e-auth-helper';

test('verifies Request Barang menu is visible under Central Service in sidebar and navigates to /dashboard/apd', async ({
  app,
  screen,
  browser,
}) => {
  await loginToHero(app, screen, browser, '/dashboard/apd');
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const pageHeading = browser.locator('h1:has-text("Request Barang"), h2:has-text("Request Barang")').first();
  await expect(pageHeading).toBeVisible({ timeout: 35000 });

  // Verify sidebar is rendered on the settled /dashboard/apd page
  const sidebarNav = browser.locator('[data-sidebar="sidebar"], aside').first();
  await expect(sidebarNav).toBeVisible({ timeout: 25000 });

  // Open/expand Central Service group if Request Barang link is collapsed (classic or modern sidebar)
  const reqBarangLink = browser.locator('a[href="/dashboard/apd"]').first();
  const isAlreadyVisible = await reqBarangLink.isVisible().catch(() => false);
  if (!isAlreadyVisible) {
    const csTrigger = browser
      .locator(
        'button[data-sidebar="menu-button"]:has-text("Central Service"), [role="button"]:has-text("Central Service"), button:has-text("Central Service"), button[title*="Central Service"]'
      )
      .first();
    await expect(csTrigger).toBeVisible({ timeout: 20000 });
    await csTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await expect(reqBarangLink).toBeVisible({ timeout: 15000 });
  await expect(reqBarangLink).toContainText('Request Barang');

  // Ensure Request Barang link is scrolled into view for visual verification
  await browser.evaluate(() => {
    const link = document.querySelector('a[href="/dashboard/apd"]');
    if (link) {
      link.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Verify the parent/section is Central Service in sidebar DOM
  const sectionCheck = await browser.evaluate(() => {
    const link = document.querySelector('a[href="/dashboard/apd"]');
    const sidebarText = document.querySelector('[data-sidebar="sidebar"], aside')?.textContent || '';
    return {
      found: Boolean(link),
      text: link?.textContent?.trim() || '',
      hasCentralService: sidebarText.includes('Central Service'),
    };
  });
  expect(sectionCheck.found).toBe(true);
  expect(sectionCheck.text).toContain('Request Barang');
  expect(sectionCheck.hasCentralService).toBe(true);

  // Screenshot 1: Sidebar displaying Request Barang under Central Service + /dashboard/apd page
  await app.screenshot('01-central-service-request-barang-menu');

  // Navigate cleanly via clicking the sidebar menu link
  await reqBarangLink.click();
  await browser.waitForURL(/\/dashboard\/apd/, { timeout: 30000 });

  await expect(pageHeading).toBeVisible({ timeout: 25000 });

  // Screenshot 2: /dashboard/apd opened from Central Service sidebar menu
  await app.screenshot('02-request-barang-page-loaded');
});
