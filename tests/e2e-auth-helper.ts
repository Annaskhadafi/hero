export const HERO_TEST_CREDENTIALS = {
  username: process.env.HERO_E2E_USERNAME ?? 'mochamad.khadafi@chitraparatama.co.id',
  password: process.env.HERO_E2E_PASSWORD ?? 'Chitra#71261',
};

/**
 * Standard login to HERO app using standard credentials (71261 / Chitra#71261).
 * Can be imported by any e2e test to authenticate before testing feature flows.
 */
export async function loginToHero(app: any, screen: any, browser: any, redirectUrl?: string) {
  await app.open(redirectUrl ? `/sign-in?callbackUrl=${encodeURIComponent(redirectUrl)}` : '/sign-in');
  const emailInput = browser.locator('#email, input[name="username"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  await emailInput.click();
  await emailInput.fill('71261');
  for (let i = 0; i < 5; i++) {
    if ((await emailInput.inputValue()) === '71261') break;
    await new Promise((resolve) => setTimeout(resolve, 500));
    await emailInput.fill('71261');
  }
  await new Promise((resolve) => setTimeout(resolve, 500));

  const passwordInput = browser.locator('#password, input[name="password"]').first();
  await passwordInput.click();
  await passwordInput.fill(HERO_TEST_CREDENTIALS.password);
  await new Promise((resolve) => setTimeout(resolve, 500));

  await browser.locator('button[type="submit"], button:has-text("Masuk ke HERO")').first().click();

  await browser.waitForURL(/\/dashboard|\/mobile/i, { timeout: 90000 });
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
