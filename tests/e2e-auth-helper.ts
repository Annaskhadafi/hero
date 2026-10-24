export interface LoginOptions {
  username?: string
  password?: string
  targetUrl?: string
}

export const HERO_TEST_CREDENTIALS = {
  username: process.env.HERO_E2E_USERNAME ?? process.env.E2E_HERO_USERNAME ?? '',
  sn: process.env.HERO_E2E_USERNAME ?? process.env.E2E_HERO_USERNAME ?? '',
  password: process.env.HERO_E2E_PASSWORD ?? process.env.E2E_HERO_PASSWORD ?? '',
}

export const HERO_DEFAULT_AUTH = HERO_TEST_CREDENTIALS

/**
 * Standard reusable authentication helper for HERO E2E testing.
 * Credentials are supplied via local environment variables only.
 */
export async function loginToHero(
  app: any,
  screen: any,
  browser?: any,
  optionsOrUrl?: LoginOptions | string
): Promise<void> {
  const options: LoginOptions =
    typeof optionsOrUrl === 'string' ? { targetUrl: optionsOrUrl } : optionsOrUrl || {}

  const username = options.username || HERO_TEST_CREDENTIALS.username
  const password = options.password || HERO_TEST_CREDENTIALS.password
  if (!username.trim() || !password) {
    throw new Error(
      'Missing E2E credentials; set HERO_E2E_USERNAME and HERO_E2E_PASSWORD in .env.e2e.local or the process environment.'
    )
  }
  const openUrl = options.targetUrl
    ? `/sign-in?callbackUrl=${encodeURIComponent(options.targetUrl)}`
    : '/sign-in'

  await app.open(openUrl)
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Wait for login form to load
  if (browser?.locator) {
    const emailLocator = browser.locator('#email, input[name="username"]').first()
    await emailLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
  }

  // Fill credentials
  if (browser?.locator) {
    const emailInput = browser.locator('#email, input[name="username"]').first()
    const passwordInput = browser.locator('#password, input[name="password"]').first()
    const submitBtn = browser
      .locator('button[type="submit"], button:has-text("Masuk ke HERO")')
      .first()

    await emailInput.fill(username)
    await passwordInput.fill(password)
    await submitBtn.click()
  } else {
    const emailInput = screen.getByPlaceholder(/Email atau SN/i)
    const passwordInput = screen.getByPlaceholder(/kata sandi/i)
    const submitButton = screen.getByRole('button', { name: /Masuk ke HERO/i })

    await emailInput.fill(username)
    await passwordInput.fill(password)
    await submitButton.click()
  }

  // Wait for login processing and redirect away from /sign-in
  for (let i = 0; i < 25; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    try {
      const isLoggingIn = await screen
        .getByRole('button', { name: /Masuk\.\.\.|Signing in|SIGNING IN|Log In/i })
        .isVisible()
        .catch(() => false)
      if (!isLoggingIn && i >= 3) break
    } catch {
      break
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 2000))
}
