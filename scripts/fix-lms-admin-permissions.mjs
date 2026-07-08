/**
 * Script: fix-lms-admin-permissions.mjs
 * Fix permission LMS Builder di DB untuk semua role yang berhak
 * Usage: node --env-file=.env.local scripts/fix-lms-admin-permissions.mjs
 *    OR: node scripts/fix-lms-admin-permissions.mjs (loads .env manually)
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createConnection } from 'net'

// Load .env.local manually
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

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ada di env')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false,
})

const q = (text, params = []) => pool.query(text, params)

async function main() {
  console.log('\n🔍 Diagnosa LMS Admin Permission...\n')

  // 1. Semua security roles
  const { rows: roles } = await q(`SELECT id, name FROM hero_security_roles ORDER BY name`)
  console.log('📋 Security Roles:')
  roles.forEach(r => console.log(`  [${r.id}] ${r.name}`))

  // 2. Cek menu item
  const { rows: menuRows } = await q(
    `SELECT id, title, resource FROM hero_navbar_menu_items WHERE resource = $1 LIMIT 1`,
    ['chitralearning_lms_builder']
  )
  let menuItem = menuRows[0]

  if (!menuItem) {
    console.log('\n⚠️  Menu item "chitralearning_lms_builder" TIDAK ADA di DB! Inserting...')
    const { rows: inserted } = await q(
      `INSERT INTO hero_navbar_menu_items
        (menu_area, section, group_label, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT DO NOTHING
       RETURNING id, title, resource`,
      ['main','ChitraLearning LMS','Internal LMS Baru','Course Builder',
       '/dashboard/chitralearning-lms/courses/new','hammer','chitralearning_lms_builder',2,true,false]
    )
    menuItem = inserted[0]
    if (menuItem) console.log(`  ✅ Menu item inserted: id=${menuItem.id}`)
    else {
      // Try to get it if conflict
      const { rows: existing } = await q(
        `SELECT id, title, resource FROM hero_navbar_menu_items WHERE resource = $1 LIMIT 1`,
        ['chitralearning_lms_builder']
      )
      menuItem = existing[0]
    }
  } else {
    console.log(`\n✅ Menu item: [${menuItem.id}] "${menuItem.title}"`)
  }

  if (!menuItem) {
    console.error('❌ Gagal mendapatkan menu item. Abort.')
    process.exit(1)
  }

  // 3. Cek permissions existing
  console.log('\n📊 Status permissions per role:')
  for (const role of roles) {
    const { rows } = await q(
      `SELECT id, can_view, can_edit FROM hero_role_menu_permissions
       WHERE role_id = $1 AND menu_item_id = $2 LIMIT 1`,
      [role.id, menuItem.id]
    )
    const perm = rows[0]
    const status = perm ? `canView=${perm.can_view}, canEdit=${perm.can_edit}` : '❌ BELUM ADA'
    console.log(`  [${role.id}] ${role.name}: ${status}`)
  }

  // 4. Grant ke admin roles
  const ADMIN_KEYWORDS = ['admin', 'super', 'hr']
  const adminRoles = roles.filter(r =>
    ADMIN_KEYWORDS.some(kw => r.name.toLowerCase().includes(kw))
  )
  const nonAdminRoles = roles.filter(r =>
    !ADMIN_KEYWORDS.some(kw => r.name.toLowerCase().includes(kw))
  )

  console.log('\n🎯 Grant ke role:')
  adminRoles.forEach(r => console.log(`  → ${r.name}`))

  let fixedCount = 0
  for (const role of adminRoles) {
    const { rows } = await q(
      `SELECT id, can_view FROM hero_role_menu_permissions
       WHERE role_id = $1 AND menu_item_id = $2 LIMIT 1`,
      [role.id, menuItem.id]
    )
    const existing = rows[0]

    if (existing) {
      await q(
        `UPDATE hero_role_menu_permissions
         SET can_view = true, can_edit = true
         WHERE id = $1`,
        [existing.id]
      )
      const icon = existing.can_view ? '✅ Already OK, ensured' : '🔧 Updated'
      console.log(`  ${icon}: "${role.name}"`)
    } else {
      await q(
        `INSERT INTO hero_role_menu_permissions
           (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [role.id, menuItem.id, true, true, false, true, 'global']
      )
      console.log(`  ✅ Inserted: "${role.name}"`)
    }
    fixedCount++
  }

  // 5. Default entry untuk non-admin roles
  for (const role of nonAdminRoles) {
    const { rows } = await q(
      `SELECT id FROM hero_role_menu_permissions
       WHERE role_id = $1 AND menu_item_id = $2 LIMIT 1`,
      [role.id, menuItem.id]
    )
    if (!rows[0]) {
      await q(
        `INSERT INTO hero_role_menu_permissions
           (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [role.id, menuItem.id, false, false, false, false, 'own']
      )
      console.log(`  ℹ️  Default (no-access) untuk: "${role.name}"`)
    }
  }

  // 6. Verifikasi final
  console.log('\n====== VERIFIKASI FINAL ======')
  for (const role of roles) {
    const { rows } = await q(
      `SELECT can_view, can_edit FROM hero_role_menu_permissions
       WHERE role_id = $1 AND menu_item_id = $2 LIMIT 1`,
      [role.id, menuItem.id]
    )
    const perm = rows[0]
    const icon = perm?.can_view ? '🟢' : '🔴'
    console.log(`  ${icon} ${role.name}: canView=${perm?.can_view ?? false}, canEdit=${perm?.can_edit ?? false}`)
  }

  // 7. Orphan accessRole check
  console.log('\n🔍 Cek orphan accessRole employees...')
  const registeredNames = roles.map(r => r.name)
  const { rows: distinctRoles } = await q(
    `SELECT DISTINCT access_role FROM hero_employees WHERE access_role IS NOT NULL`
  )
  const orphans = distinctRoles.filter(r => !registeredNames.includes(r.access_role))
  if (orphans.length > 0) {
    console.log('  ⚠️  AccessRole employee yang TIDAK TERDAFTAR di securityRoles:')
    orphans.forEach(o => console.log(`    → "${o.access_role}"`))
    console.log('  → User ini akan lolos hanya via fallback role string check di kode.')
  } else {
    console.log('  ✅ Semua accessRole valid.')
  }

  console.log(`\n🎉 Done! Fixed ${fixedCount} admin roles.\n`)
  await pool.end()
}

main().catch(e => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
