import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const permissionsRoute = fs.readFileSync('app/api/menu/[id]/permissions/route.ts', 'utf8')
const checklist = fs.readFileSync('scripts/audit-rbac-sync.ts', 'utf8')
const menuApi = fs.readFileSync('app/api/menu/route.ts', 'utf8')

test('menu permission updates constrain both menu and role', () => {
  assert.match(permissionsRoute, /and\(\s*eq\(roleMenuPermissions\.menuItemId, menuItemId\),\s*eq\(roleMenuPermissions\.roleId, p\.roleId\)/s)
  assert.match(permissionsRoute, /getCurrentMenuPermission\("settings_navbar"\)/)
})

test('RBAC checklist covers each role-menu pair and valid scope', () => {
  assert.match(checklist, /roles\.flatMap\(\(role\) => menus\.map\(\(menu\)/)
  assert.match(checklist, /new Set\(\['own', 'site', 'global'\]\)/)
  assert.match(checklist, /rbac-role-navbar-checklist\.md/)
})

test('navbar APIs use centralized access checks', () => {
  assert.match(menuApi, /getCurrentMenuPermission\("settings_navbar"\)/)
  assert.match(menuApi, /isSuperAdminRole\(roleName\)/)
})
