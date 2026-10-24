import fs from 'node:fs'
import path from 'node:path'

describe('forgot password Better Auth client contract', () => {
  it('uses requestPasswordReset with the reset redirect', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'app/forgot-password/page.tsx'),
      'utf8'
    )

    expect(source).toMatch(
      /authClient\.requestPasswordReset\(\s*\{\s*email,\s*redirectTo:\s*["']\/reset-password["']/s
    )
    expect(source).not.toContain('authClient.forgetPassword(')
  })
})
