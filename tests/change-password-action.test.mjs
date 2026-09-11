import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Test source code integration of change password
const profileActionPath = path.resolve('app/dashboard/profile/actions.ts')
const profileActionCode = fs.readFileSync(profileActionPath, 'utf8')

assert(
  profileActionCode.includes('changeMyPasswordAction'),
  'changeMyPasswordAction must be exported in actions.ts'
)
assert(
  profileActionCode.includes('changeMyPasswordDirectAction'),
  'changeMyPasswordDirectAction must be exported in actions.ts'
)
assert(
  profileActionCode.includes('verifyPassword'),
  'verifyPassword must be called to validate old password'
)
assert(
  profileActionCode.includes('findCredentialAccount'),
  'password change must resolve the canonical credential'
)
assert(
  profileActionCode.includes('upsertCredentialAccount'),
  'password change must replace the canonical credential'
)

// Test analytics client component integration
const analyticsClientPath = path.resolve('components/analytics-redesign-client.tsx')
const analyticsClientCode = fs.readFileSync(analyticsClientPath, 'utf8')

assert(
  analyticsClientCode.includes('changeMyPasswordDirectAction'),
  'analytics client must import and call changeMyPasswordDirectAction'
)
assert(
  analyticsClientCode.includes('DesktopChangePasswordView'),
  'DesktopChangePasswordView must be defined'
)
assert(
  !analyticsClientCode.includes(
    'setTimeout(() => {\n      setSubmitting(false)\n      setSuccess(true)\n    }, 800)'
  ),
  'Mock setTimeout should not exist in DesktopChangePasswordView'
)

console.log('✅ All Change Password Integration Tests Passed!')
