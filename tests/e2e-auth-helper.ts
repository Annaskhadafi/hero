export const HERO_TEST_CREDENTIALS = {
  username: process.env.HERO_E2E_USERNAME ?? 'mochamad.khadafi@chitraparatama.co.id',
  password: process.env.HERO_E2E_PASSWORD ?? 'Chitra#71261',
};

/**
 * Standard login to HERO app using standard credentials (71261 / Chitra#71261).
 * Can be imported by any e2e test to authenticate before testing feature flows.
 */
export async function loginToHero(app: any, screen: any, browser: any) {
  await app.open('/sign-in');
  
  await screen.getByLabel('Email atau SN karyawan').fill(HERO_TEST_CREDENTIALS.username);
  await screen.getByLabel('Kata sandi').fill(HERO_TEST_CREDENTIALS.password);
  await screen.getByRole('button', 'Masuk ke HERO').tap();

  await browser.waitForURL(/\/dashboard|\/mobile/i, { timeout: 45000 });
}
