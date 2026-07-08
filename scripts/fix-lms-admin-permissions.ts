/**
 * Script: fix-lms-admin-permissions.ts
 * Fix permission LMS Builder di DB untuk semua role yang berhak (admin/super)
 * Usage: npx tsx scripts/fix-lms-admin-permissions.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, and } from 'drizzle-orm'
import {
  securityRoles,
  navbarMenuItems,
  roleMenuPermissions,
  employees,
} from '../db/schema/hero'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL tidak ditemukan di .env / .env.local')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})
const db = drizzle({ client: pool })

async function main() {
  console.log('\n🔍 Diagnosa LMS Admin Permission...\n')

  // 1. Ambil semua security roles
  const roles = await db.select().from(securityRoles)
  console.log('📋 Security Roles di DB:')
  roles.forEach((r) => console.log(`  [${r.id}] ${r.name}`))

  // 2. Cek menu item chitralearning_lms_builder
  const [builderMenuItem] = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.resource, 'chitralearning_lms_builder'))
    .limit(1)

  if (!builderMenuItem) {
    console.log('\n⚠️  Menu item "chitralearning_lms_builder" TIDAK ADA di DB!')
    console.log('   → Inserting...')

    await db.insert(navbarMenuItems).values({
      menuArea: 'main',
      section: 'ChitraLearning LMS',
      groupLabel: 'Internal LMS Baru',
      title: 'Course Builder',
      url: '/dashboard/chitralearning-lms/courses/new',
      iconName: 'hammer',
      resource: 'chitralearning_lms_builder',
      sortOrder: 2,
      isVisible: true,
      openInNewTab: false,
    })
    console.log('   ✅ Menu item inserted.')
  } else {
    console.log(`\n✅ Menu item: [${builderMenuItem.id}] "${builderMenuItem.title}"`)
  }

  // Ambil ulang
  const [menuItem] = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.resource, 'chitralearning_lms_builder'))
    .limit(1)

  if (!menuItem) throw new Error('Gagal mendapatkan menu item')

  // 3. Cek existing permissions
  console.log('\n📊 Status roleMenuPermissions per role:')
  for (const role of roles) {
    const [perm] = await db
      .select({
        id: roleMenuPermissions.id,
        canView: roleMenuPermissions.canView,
        canEdit: roleMenuPermissions.canEdit,
      })
      .from(roleMenuPermissions)
      .where(
        and(
          eq(roleMenuPermissions.roleId, role.id),
          eq(roleMenuPermissions.menuItemId, menuItem.id)
        )
      )
      .limit(1)

    const status = perm
      ? `canView=${perm.canView}, canEdit=${perm.canEdit}`
      : '❌ BELUM ADA entry'
    console.log(`  [${role.id}] ${role.name}: ${status}`)
  }

  // 4. Tentukan role yang harus dapat akses LMS Builder
  const ADMIN_KEYWORDS = ['admin', 'super', 'hr']
  const adminRoles = roles.filter((r) =>
    ADMIN_KEYWORDS.some((kw) => r.name.toLowerCase().includes(kw))
  )

  console.log('\n🎯 Role yang akan di-grant LMS Builder access:')
  adminRoles.forEach((r) => console.log(`  → ${r.name}`))

  // 5. Upsert permissions untuk admin roles
  let fixedCount = 0
  for (const role of adminRoles) {
    const [existing] = await db
      .select({ id: roleMenuPermissions.id, canView: roleMenuPermissions.canView })
      .from(roleMenuPermissions)
      .where(
        and(
          eq(roleMenuPermissions.roleId, role.id),
          eq(roleMenuPermissions.menuItemId, menuItem.id)
        )
      )
      .limit(1)

    if (existing) {
      await db
        .update(roleMenuPermissions)
        .set({ canView: true, canEdit: true })
        .where(eq(roleMenuPermissions.id, existing.id))
      const icon = existing.canView ? '✅ Already OK' : '🔧 Updated'
      console.log(`  ${icon}: "${role.name}" → canView=true, canEdit=true`)
    } else {
      await db.insert(roleMenuPermissions).values({
        roleId: role.id,
        menuItemId: menuItem.id,
        canView: true,
        canEdit: true,
        canDelete: false,
        canSelectAll: true,
        dataScope: 'global',
      })
      console.log(`  ✅ Inserted: "${role.name}" → canView=true, canEdit=true`)
    }
    fixedCount++
  }

  // 6. Default entry untuk non-admin roles
  const nonAdminRoles = roles.filter(
    (r) => !ADMIN_KEYWORDS.some((kw) => r.name.toLowerCase().includes(kw))
  )
  for (const role of nonAdminRoles) {
    const [existing] = await db
      .select({ id: roleMenuPermissions.id })
      .from(roleMenuPermissions)
      .where(
        and(
          eq(roleMenuPermissions.roleId, role.id),
          eq(roleMenuPermissions.menuItemId, menuItem.id)
        )
      )
      .limit(1)

    if (!existing) {
      await db.insert(roleMenuPermissions).values({
        roleId: role.id,
        menuItemId: menuItem.id,
        canView: false,
        canEdit: false,
        canDelete: false,
        canSelectAll: false,
        dataScope: 'own',
      })
      console.log(`  ℹ️  Default (no-access) untuk: "${role.name}"`)
    }
  }

  // 7. Verifikasi final
  console.log('\n====== VERIFIKASI FINAL ======')
  for (const role of roles) {
    const [perm] = await db
      .select({ canView: roleMenuPermissions.canView, canEdit: roleMenuPermissions.canEdit })
      .from(roleMenuPermissions)
      .where(
        and(
          eq(roleMenuPermissions.roleId, role.id),
          eq(roleMenuPermissions.menuItemId, menuItem.id)
        )
      )
      .limit(1)

    const icon = perm?.canView ? '🟢' : '🔴'
    console.log(`  ${icon} ${role.name}: canView=${perm?.canView ?? false}, canEdit=${perm?.canEdit ?? false}`)
  }

  // 8. Cek orphan accessRole employees
  console.log('\n🔍 Cek employees dengan accessRole tidak terdaftar...')
  const registeredNames = roles.map((r) => r.name)
  const empRoles = await db
    .selectDistinct({ accessRole: employees.accessRole })
    .from(employees)

  const orphans = empRoles.filter(
    (e) => e.accessRole && !registeredNames.includes(e.accessRole)
  )
  if (orphans.length > 0) {
    console.log('  ⚠️  AccessRole employee yang TIDAK ADA di securityRoles:')
    orphans.forEach((o) => console.log(`    → "${o.accessRole}"`))
    console.log('  → User ini mungkin tidak bisa akses LMS via RBAC path!')
  } else {
    console.log('  ✅ Semua accessRole valid.')
  }

  console.log(`\n🎉 Done! Fixed ${fixedCount} admin roles.\n`)
  await pool.end()
}

main().catch((e) => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
