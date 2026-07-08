import fs from 'fs'
import path from 'path'

describe('user management password reset', () => {
  it('writes credential accountId as normalized email not authUserId', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )
    expect(source).toContain('normalizeAuthEmail')
    expect(source).toContain('email.trim().toLowerCase()')
    expect(source).toContain('accountId: normalizedEmail')
    expect(source).not.toMatch(/accountId:\s*authUserId/)
  })

  it('uses upsertCredentialAccount for both create-user and change-password', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )
    expect(source).toContain('upsertCredentialAccount')

    // Check create-user uses upsertCredentialAccount
    const createUserStart = source.indexOf("payload.intent === 'create-user'")
    const createUserEnd = source.indexOf("payload.intent === 'update-profile'", createUserStart)
    const createUserSection = source.substring(createUserStart, createUserEnd)
    expect(createUserSection).toContain('upsertCredentialAccount')

    // Check change-password uses upsertCredentialAccount
    const changePasswordStart = source.indexOf("payload.intent === 'change-password'")
    const changePasswordEnd = source.indexOf("return { status: 'success'", changePasswordStart)
    const changePasswordSection = source.substring(changePasswordStart, changePasswordEnd + 100)
    expect(changePasswordSection).toContain('upsertCredentialAccount')
  })

  it('upsertCredentialAccount finds credential by userId or target accountId', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )
    expect(source).toContain("eq(account.providerId, 'credential')")
    expect(source).toContain('eq(account.userId, authUserId)')
    expect(source).toContain('eq(account.accountId, accountId)')
  })

  it('email profile changes sync credential accountId from previous email or legacy authUserId', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )
    expect(source).toContain('updateCredentialEmailAccountId')
    expect(source).toContain('const previousAccountId = previousEmail ? normalizeAuthEmail(previousEmail) :')
    expect(source).toContain('new Set([previousAccountId, authUserId].filter(Boolean))')
    expect(source).toContain('inArray(account.accountId, accountIds)')
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
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/admin-actions.ts'),
      'utf8'
    )
    const changePasswordStart = source.indexOf("payload.intent === 'change-password'")
    const changePasswordEnd = source.indexOf("return { status: 'success'", changePasswordStart)
    const changePasswordSection = source.substring(changePasswordStart, changePasswordEnd + 100)

    expect(changePasswordSection).not.toContain('db.insert(account).values')
    expect(changePasswordSection).not.toContain('db.update(account).set')
    expect(changePasswordSection).toContain('upsertCredentialAccount')
  })
})
