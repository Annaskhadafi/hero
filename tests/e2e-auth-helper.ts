export const HERO_TEST_CREDENTIALS = {
  username: process.env.HERO_E2E_USERNAME ?? '71261',
  password: process.env.HERO_E2E_PASSWORD ?? 'Chitra#71261',
};

/**
 * Standard login to HERO app using standard credentials (71261 / Chitra#71261).
 * Can be imported by any e2e test to authenticate before testing feature flows.
 */
export async function loginToHero(app: any, screen: any, browser: any) {
  await app.open('/sign-in');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  await browser.locator('#email').fill(HERO_TEST_CREDENTIALS.username);
  await browser.locator('#password').fill(HERO_TEST_CREDENTIALS.password);
  await browser.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first().click();

  await browser.waitForURL(/\/dashboard|\/mobile/i, { timeout: 90000 });
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
