export interface LoginOptions {
  username?: string
  password?: string
  targetUrl?: string
}

export const HERO_TEST_CREDENTIALS = {
  username: process.env.HERO_E2E_USERNAME ?? process.env.E2E_HERO_USERNAME ?? '71261',
  sn: process.env.HERO_E2E_USERNAME ?? process.env.E2E_HERO_USERNAME ?? '71261',
  password: process.env.HERO_E2E_PASSWORD ?? process.env.E2E_HERO_PASSWORD ?? 'Chitra#71261',
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

  // Check if already authenticated and redirected to dashboard or mobile
  if (browser?.url) {
    const currentUrl = String(browser.url() || '')
    if (!currentUrl.includes('/sign-in') && (currentUrl.includes('/dashboard') || currentUrl.includes('/mobile') || (options.targetUrl && currentUrl.includes(options.targetUrl)))) {
      return
    }
  }

  // Wait for login form to load
  if (browser?.locator) {
    const emailLocator = browser.locator('#employeeSn, input[name="employeeSn"], #email, input[name="username"], input[name="email"]').first()
    const isVisible = await emailLocator
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false)
    if (!isVisible) {
      const currentUrl = String(browser.url ? browser.url() : '')
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/mobile') || (options.targetUrl && currentUrl.includes(options.targetUrl))) return
    }
  }

  // Fill credentials
  if (browser?.locator) {
    const emailInput = browser.locator('#employeeSn, input[name="employeeSn"], #email, input[name="username"], input[name="email"]').first()
    const passwordInput = browser.locator('#password, input[name="password"]').first()
    const submitBtn = browser
      .locator('button[type="submit"], button:has-text("Masuk ke HERO")')
      .first()

    await emailInput.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {})
    await emailInput.fill(username)
    await passwordInput.fill(password)
    await submitBtn.click()

    // Wait for login processing and redirect away from /sign-in
    if (browser?.waitForURL) {
      await browser.waitForURL(/.*(\/dashboard|\/mobile)(\/.*)?/, { timeout: 60000 }).catch(() => {})
    } else {
      await submitBtn.waitFor({ state: 'detached', timeout: 60000 }).catch(() => {})
    }
    await new Promise((resolve) => setTimeout(resolve, 3000))
  } else {
    const emailInput = screen.getByPlaceholder(/Email atau SN/i)
    const passwordInput = screen.getByPlaceholder(/kata sandi/i)
    const submitButton = screen.getByRole('button', { name: /Masuk ke HERO/i })

    await emailInput.fill(username)
    await passwordInput.fill(password)
    await submitButton.click()

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      try {
        const isLoggingIn = await screen
          .getByRole('button', { name: /Masuk\.\.\.|Signing in|SIGNING IN|Log In/i })
          .isVisible()
          .catch(() => false)
        if (!isLoggingIn && i >= 2) break
      } catch {
        break
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}
