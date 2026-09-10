import fs from 'node:fs'
import path from 'node:path'
import { db } from '@/db'
import { navbarMenuItems, roleMenuPermissions, securityRoles } from '@/db/schema/hero'

const VALID_SCOPES = new Set(['own', 'site', 'global'])
const DASHBOARD_ROOT = path.resolve('app/dashboard')

function pageUrls(dir = DASHBOARD_ROOT, prefix = '/dashboard'): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return pageUrls(fullPath, `${prefix}/${entry.name.replace(/^\[|\]$/g, '')}`)
    }
    return entry.name === 'page.tsx' ? [prefix] : []
  })
}

function routeMatches(url: string, pages: string[]) {
  const normalized = url.split('?')[0].replace(/\/(\d+|[a-f0-9-]{20,})$/, '/[id]')
  return pages.some((page) => page === normalized || page === url || page.includes('/[id]'))
}

async function main() {
  const [roles, menus, permissions] = await Promise.all([
    db.select().from(securityRoles).orderBy(securityRoles.name),
    db.select().from(navbarMenuItems).orderBy(navbarMenuItems.sortOrder, navbarMenuItems.id),
    db.select().from(roleMenuPermissions),
  ])
  const pages = pageUrls()
  const byPair = new Map<string, typeof permissions>()
  for (const permission of permissions) {
    const key = `${permission.roleId}:${permission.menuItemId}`
    byPair.set(key, [...(byPair.get(key) ?? []), permission])
  }

  const rows = roles.flatMap((role) => menus.map((menu) => {
    const matches = byPair.get(`${role.id}:${menu.id}`) ?? []
    const permission = matches[0]
    const isSuperAdmin = role.name.trim().toLowerCase() === 'super admin'
    const status = [
      matches.length !== 1 ? 'FAIL:permission-pair' : '',
      !VALID_SCOPES.has(permission?.dataScope ?? '') ? 'FAIL:scope' : '',
      menu.isVisible && !permission?.canView ? 'CHECK:hidden-by-rbac' : '',
      !routeMatches(menu.url, pages) && !menu.isIframe ? 'CHECK:no-page' : '',
    ].filter(Boolean)
    return {
      role: role.name,
      resource: menu.resource,
      menu: menu.title,
      url: menu.url,
      canView: isSuperAdmin || !!permission?.canView,
      canEdit: isSuperAdmin || !!permission?.canEdit,
      canDelete: isSuperAdmin || !!permission?.canDelete,
      canSelectAll: isSuperAdmin || !!permission?.canSelectAll,
      dataScope: isSuperAdmin ? 'global' : permission?.dataScope ?? 'MISSING',
      pairCount: matches.length,
      route: routeMatches(menu.url, pages) || menu.isIframe ? 'yes' : 'no',
      status: status.join('; ') || 'PASS',
    }
  }))

  const failures = rows.filter((row) => row.status.startsWith('FAIL'))
  const checks = rows.filter((row) => row.status !== 'PASS').length
  const outDir = path.resolve('outputs')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'rbac-role-navbar-checklist.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary: { roles: roles.length, menus: menus.length, rows: rows.length, failures: failures.length, checks },
    rows,
  }, null, 2))

  const table = rows.map((row) => `| ${row.role} | ${row.menu} | ${row.resource} | ${row.canView ? '☑' : '☐'} | ${row.canEdit ? '☑' : '☐'} | ${row.canDelete ? '☑' : '☐'} | ${row.canSelectAll ? '☑' : '☐'} | ${row.dataScope} | ${row.route} | ${row.status} |`).join('\n')
  fs.writeFileSync(path.join(outDir, 'rbac-role-navbar-checklist.md'), `# RBAC Role × Navbar Checklist\n\nGenerated: ${new Date().toISOString()}\n\nSummary: ${roles.length} roles × ${menus.length} menus = ${rows.length} checks; ${failures.length} failures; ${checks} non-pass checks.\n\n| Role | Menu | Resource | View | Edit | Delete | Select all | Scope | Route | Status |\n|---|---|---|---:|---:|---:|---:|---|---|---|\n${table}\n`)
  console.log(JSON.stringify({ roles: roles.length, menus: menus.length, rows: rows.length, failures: failures.length, checks, output: outDir }, null, 2))
  if (failures.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
