/**
 * Script: diagnose-lms-user.mjs
 * Diagnosa kenapa user tertentu tidak bisa akses LMS Builder
 * Usage: node scripts/diagnose-lms-user.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dir, '..')

function loadEnv(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}

loadEnv(resolve(projectRoot, '.env.local'))
loadEnv(resolve(projectRoot, '.env'))

const { default: pg } = await import('pg')
const { Pool } = pg

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })
const q = (text, params = []) => pool.query(text, params)

async function main() {
  console.log('\n🔍 DIAGNOSA MENDALAM LMS ADMIN ACCESS\n')

  // 1. Cek auth users (tanpa role kolumn - auth.ts tidak punya field role)
  console.log('=== AUTH USERS (better_auth) ===')
  const { rows: authUsers } = await q(
    `SELECT id, email, name FROM "user" ORDER BY created_at DESC LIMIT 20`
  )
  authUsers.forEach(u => console.log(`  [${u.id.substring(0,8)}...] ${u.email}`))

  // 2. Cek link antara auth user dan employees
  console.log('\n=== LINK auth_user → hero_employees ===')
  const { rows: linkedEmps } = await q(
    `SELECT e.id, e.name, e.email, e.access_role, e.auth_user_id,
            u.email as auth_email
     FROM hero_employees e
     LEFT JOIN "user" u ON u.id = e.auth_user_id
     ORDER BY e.name
     LIMIT 30`
  )
  linkedEmps.forEach(e => {
    const link = e.auth_user_id
      ? (e.auth_email ? `✅ linked to auth: ${e.auth_email}` : '⚠️ auth_user_id set tapi user tidak ada')
      : '❌ TIDAK linked (auth_user_id NULL)'
    console.log(`  [${e.id}] ${e.name} | accessRole="${e.access_role ?? '(null)'}" | ${link}`)
  })

  // 3. Cek berapa banyak yang tidak linked
  const { rows: unlinked } = await q(
    `SELECT COUNT(*) as cnt FROM hero_employees WHERE auth_user_id IS NULL AND employment_status = 'Active'`
  )
  console.log(`\n  ℹ️  Active employees tanpa auth_user_id: ${unlinked[0].cnt}`)

  // 4. Menu item id
  const { rows: menuRows } = await q(
    `SELECT id FROM hero_navbar_menu_items WHERE resource = 'chitralearning_lms_builder' LIMIT 1`
  )
  const menuItemId = menuRows[0]?.id
  console.log(`\n  ℹ️  Menu item ID untuk chitralearning_lms_builder: ${menuItemId}`)

  // 5. Simulasi isLmsAdmin per user yang sudah linked
  console.log('\n=== SIMULASI isLmsAdmin per auth user ===')

  const { rows: allLinked } = await q(
    `SELECT e.id as emp_id, e.name, e.email, e.access_role, e.auth_user_id,
            u.id as auth_id, u.email as auth_email
     FROM hero_employees e
     INNER JOIN "user" u ON u.id = e.auth_user_id
     ORDER BY e.name`
  )

  for (const emp of allLinked) {
    // Simulate RBAC: getCurrentMenuPermission("chitralearning_lms_builder")
    // Ini mengambil accessRole dari employees, lalu join ke securityRoles, lalu roleMenuPermissions
    const { rows: rbacRows } = await q(
      `SELECT sr.name as role_name, rmp.can_view, rmp.can_edit
       FROM hero_security_roles sr
       INNER JOIN hero_role_menu_permissions rmp ON rmp.role_id = sr.id
       WHERE sr.name = $1 AND rmp.menu_item_id = $2
       LIMIT 1`,
      [emp.access_role, menuItemId]
    )
    const rbac = rbacRows[0]
    const rbacPass = rbac?.can_view === true || rbac?.can_edit === true

    // Simulate fallback (setelah fix baru)
    const rawRole = emp.access_role ?? ''
    const normalized = rawRole.toLowerCase().replace(/[\s_\-]+/g, '')
    const fallbackPass = normalized.includes('admin') || normalized.includes('super')

    const pass = rbacPass || fallbackPass
    const icon = pass ? '🟢' : '🔴'

    let notes = []
    if (!emp.access_role) notes.push('⚠️ accessRole NULL!')
    if (!rbac) notes.push(`RBAC: tidak ada entry untuk role "${emp.access_role}"`)
    else notes.push(`RBAC: canView=${rbac.can_view}`)
    notes.push(`Fallback: "${rawRole}"→"${normalized}"=${fallbackPass}`)

    console.log(`  ${icon} ${emp.name} (${emp.auth_email}): ${notes.join(' | ')}`)
  }

  console.log('\n🎉 Diagnosa selesai.\n')
  await pool.end()
}

main().catch(e => {
  console.error('❌ Error:', e.message, e.stack)
  process.exit(1)
})
