export interface LoginOptions {
  username?: string;
  password?: string;
  targetUrl?: string;
}

export const HERO_TEST_CREDENTIALS = {
  username: process.env.HERO_E2E_USERNAME ?? process.env.E2E_HERO_USERNAME ?? '71261',
  sn: '71261',
  password: process.env.HERO_E2E_PASSWORD ?? process.env.E2E_HERO_PASSWORD ?? 'Chitra#71261',
};

export const HERO_DEFAULT_AUTH = HERO_TEST_CREDENTIALS;

/**
 * Standard reusable authentication helper for HERO E2E testing.
 * Uses default system test credentials:
 * - Username / NIK / SN: 71261 (mochamad.khadafi@chitraparatama.co.id)
 * - Password: Chitra#71261
 */
export async function loginToHero(
  app: any,
  screen: any,
  browser?: any,
  optionsOrUrl?: LoginOptions | string
): Promise<void> {
  const options: LoginOptions =
    typeof optionsOrUrl === 'string' ? { targetUrl: optionsOrUrl } : optionsOrUrl || {};

  const username = options.username || HERO_TEST_CREDENTIALS.username;
  const password = options.password || HERO_TEST_CREDENTIALS.password;
  const openUrl = options.targetUrl
    ? `/sign-in?callbackUrl=${encodeURIComponent(options.targetUrl)}`
    : '/sign-in';

  await app.open(openUrl);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Check if browser fixture is available and already on dashboard
  if (browser?.locator) {
    const emailLocator = browser.locator('#email, input[name="username"], input[placeholder*="SN"]').first();
    const isVisible = await emailLocator.isVisible().catch(() => false);
    if (!isVisible) {
      const isNowVisible = await emailLocator.waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false);
      if (!isNowVisible) {
        // Already authenticated
        return;
      }
    }
  }

  // Fill credentials via screen fixture if available, otherwise browser locator
  try {
    const emailInput = screen.getByPlaceholder(/Email atau SN/i, { visible: true });
    await emailInput.fill(username);
  } catch {
    try {
      const emailInput = screen.getByRole('textbox', { name: /Email atau SN/i });
      await emailInput.fill(username);
    } catch {
      if (browser?.locator) {
        const emailInput = browser.locator('#email, input[name="username"]').first();
        await emailInput.fill(username);
      }
    }
  }

  try {
    const passwordInput = screen.getByRole('textbox', { name: /Kata sandi|password/i });
    await passwordInput.fill(password);
  } catch {
    try {
      const passwordInput = screen.getByPlaceholder(/password|••••••••••/i, { visible: true });
      await passwordInput.fill(password);
    } catch {
      if (browser?.locator) {
        const passwordInput = browser.locator('#password, input[name="password"]').first();
        await passwordInput.fill(password);
      }
    }
  }

  // Click submit button
  try {
    const submitButton = screen.getByRole('button', { name: /^Log In|Masuk ke HERO$/i, visible: true });
    await submitButton.click();
  } catch {
    if (browser?.locator) {
      await browser.locator('button[type="submit"], button:has-text("Masuk ke HERO"), button:has-text("Log In")').first().click();
    }
  }

  // Wait for login processing and redirect
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const isSigningIn = await screen
        .getByRole('button', { name: /Signing in|SIGNING IN|Log In/i })
        .isVisible()
        .catch(() => false);
      if (!isSigningIn) break;
    } catch {
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
