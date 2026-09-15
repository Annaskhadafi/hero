import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('protected dashboard redirects preserve the requested path and query through sign-in', () => {
  const layout = read('app/dashboard/layout.tsx')
  const middleware = read('middleware.ts')
  const signIn = read('app/sign-in/page.tsx')

  assert.match(middleware, /x-hero-dashboard-path.*pathname.*url.search/)
  assert.match(layout, /callbackUrl=\$\{encodeURIComponent\(dashboardPath\)\}/)
  assert.match(signIn, /getSafeCallbackPath/)
  assert.match(signIn, /getClientPostLoginPath\(callbackPath\)/)
  assert.ok(signIn.includes('value.startsWith("/")'))
})
