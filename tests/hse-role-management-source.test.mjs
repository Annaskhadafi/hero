import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

const heroAdmin = read('lib/hero-admin.ts')
const heroAccess = read('lib/hero-access.ts')
const mobileAccess = read('lib/mobile-access.ts')
const mobileData = read('lib/mobile-data.ts')
const roleManagement = read('components/security-role-management.tsx')
const mobileRoleManagement = read('components/mobile-security-role-management.tsx')
const mcuWellness = read('app/actions/mcu-wellness.ts')
const adminActions = read('app/dashboard/admin-actions.ts')
const incidentActions = read('app/dashboard/hse/incident-report/actions.ts')
const ptwActions = read('app/mobile/hse/ptw/actions.ts')
const correctiveActions = read('app/mobile/hse/corrective-action/actions.ts')

assert.match(heroAdmin, /name:\s*'HSE'/, 'HSE role seed must exist')
assert.match(heroAdmin, /HSE_MANAGED_RESOURCES/, 'HSE managed resource defaults must exist')
assert.match(
  heroAdmin,
  /WELLNESS_MANAGED_RESOURCES/,
  'Wellness managed resource defaults must exist'
)
assert.match(heroAdmin, /'hc_mcu_wellness'/, 'HSE role must include wellness default access')
assert.match(heroAdmin, /roleName === 'HSE'/, 'HSE role must get scoped defaults')
assert.match(
  heroAdmin,
  /dataScope:\s*allowed \? 'global' : 'own'/,
  'HSE defaults must grant global scope only to allowed resources'
)
assert.doesNotMatch(
  heroAdmin,
  /\.update\(roleMenuPermissions\)[\s\S]{0,800}getDefaultMenuPermission/,
  'Seed must not overwrite Role Management permission edits'
)

assert.match(
  heroAccess,
  /dataScope:\s*roleMenuPermissions\.dataScope/,
  'Runtime permission must read dataScope'
)
assert.match(
  heroAccess,
  /getCurrentEmployeeAccessContext/,
  'Runtime scope must know current employee context'
)
assert.match(heroAccess, /hasGlobalDataAccess/, 'Runtime scope helper must exist')

assert.match(
  mobileAccess,
  /\/dashboard\/hse\/incident-report/,
  'Mobile mapping must include HSE incident report'
)
assert.match(
  mobileAccess,
  /\/dashboard\/safety-induction/,
  'Mobile mapping must include safety induction'
)
assert.match(mobileAccess, /\/mobile\/hse\/safety-data/, 'Mobile mapping must include safety data')
assert.match(
  roleManagement,
  /\/dashboard\/hc\/mcu-wellness/,
  'Role Management mobile filter must include wellness'
)
assert.match(
  roleManagement,
  /\/dashboard\/safety/,
  'Role Management mobile filter must include safety pages'
)
assert.match(
  mobileRoleManagement,
  /dataScope:\s*string/,
  'Mobile Role Management must carry dataScope'
)
assert.match(mobileRoleManagement, /updateDataScope/, 'Mobile Role Management must edit dataScope')
assert.match(
  mobileRoleManagement,
  /\/dashboard\/hc\/mcu-wellness/,
  'Mobile Role Management filter must include wellness'
)
assert.match(
  mobileRoleManagement,
  /\/dashboard\/safety/,
  'Mobile Role Management filter must include safety pages'
)

assert.match(
  mobileData,
  /getMenuPermissionForRole\(context\.employee\.accessRole,\s*['"]hse['"]\)/,
  'Mobile HSE data must use menu permission'
)
assert.match(
  mobileData,
  /eq\(hseObservations\.employeeId,\s*context\.employee\.id\)/,
  'Mobile HSE own scope must filter observations'
)
assert.match(
  mobileData,
  /eq\(hseIncidents\.employeeId,\s*context\.employee\.id\)/,
  'Mobile HSE own scope must filter incidents'
)

assert.match(mcuWellness, /requireMcuWellnessAccess/, 'Wellness actions must check menu permission')
assert.match(
  mcuWellness,
  /assertMcuWellnessEmployeeScope/,
  'Wellness actions must enforce own scope'
)
assert.match(
  mcuWellness,
  /Role Anda hanya bisa mengakses data wellness sendiri/,
  'Wellness own-scope error must exist'
)

assert.match(
  adminActions,
  /requireHseDashboardPermission/,
  'Dashboard HSE CRUD must check menu permission'
)
assert.match(
  adminActions,
  /assertHseObservationScope/,
  'Dashboard HSE observations must enforce own scope'
)
assert.match(
  adminActions,
  /assertHseIncidentScope/,
  'Dashboard HSE incidents must enforce own scope'
)

assert.match(incidentActions, /picEmployeeId/, 'Incident Report must use PIC employee scope')
assert.match(incidentActions, /assertIncidentRecordScope/, 'Incident Report must enforce own scope')
assert.match(ptwActions, /createdByEmployeeId/, 'PTW must use creator scope')
assert.match(correctiveActions, /createdByEmployeeId/, 'Corrective action must use creator scope')

console.log('HSE role management source checks passed')
