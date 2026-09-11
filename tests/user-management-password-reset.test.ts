import fs from 'fs'
import path from 'path'

describe('user management password reset', () => {
  const helper = () => fs.readFileSync(path.join(process.cwd(), 'lib/auth-credentials.ts'), 'utf8')
  const admin = () =>
    fs.readFileSync(path.join(process.cwd(), 'app/dashboard/admin-actions.ts'), 'utf8')

  it('stores one normalized-email credential and scopes auth-user lookup', () => {
    const source = helper()
    expect(source).toContain('normalizeAuthEmail')
    expect(source).toContain('email.trim().toLowerCase()')
    expect(source).toContain('accountId: normalizedEmail')
    expect(source).toContain(
      'const ownerMatches = authUserId ? [eq(account.userId, authUserId)] : matches'
    )
    expect(source).not.toContain('eq(account.userId, authUserId), ...matches')
  })

  it('preserves defaults but makes explicit resets authoritative and deduplicates', () => {
    const source = helper()
    expect(source).toContain('preserveExistingPassword: true')
    expect(source).toContain('preserveExistingPassword: false')
    expect(source).toContain('await tx.delete(account).where(eq(account.id, duplicateId))')
    expect(admin()).toContain('await upsertCredentialAccount({')
  })

  it('routes default provisioning, admin reset, and profile change through the helper', () => {
    expect(admin()).toContain('ensureCredentialAccount')
    expect(admin()).toContain('updateCredentialEmailAccountId')
    expect(
      fs.readFileSync(path.join(process.cwd(), 'app/dashboard/profile/actions.ts'), 'utf8')
    ).toContain('upsertCredentialAccount')
    expect(
      fs.readFileSync(path.join(process.cwd(), 'app/actions/resolve-sn-action.ts'), 'utf8')
    ).not.toContain('ensureCredentialAccount')
  })

  it('reset password form uses intent change-password and field newPassword', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/security-user-row-actions.tsx'),
      'utf8'
    )
    expect(source).toContain('name="intent" value="change-password"')
    expect(source).toContain('name="newPassword"')
  })

  it('does not duplicate credential insert logic in change-password branch', () => {
    const source = admin()
    const changePasswordStart = source.indexOf("payload.intent === 'change-password'")
    const changePasswordEnd = source.indexOf("return { status: 'success'", changePasswordStart)
    const changePasswordSection = source.substring(changePasswordStart, changePasswordEnd + 100)

    expect(changePasswordSection).not.toContain('db.insert(account).values')
    expect(changePasswordSection).not.toContain('db.update(account).set')
    expect(changePasswordSection).toContain('upsertCredentialAccount')
  })
})
