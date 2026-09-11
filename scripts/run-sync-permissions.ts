// Script: run-sync-permissions.ts
// Sync menu × role permissions ke production DB via Drizzle ORM
import { db } from "@/db"
import { navbarMenuItems, roleMenuPermissions, securityRoles } from "@/db/schema/hero"
import { sql } from "drizzle-orm"

async function main() {
  console.log("🔌 Connecting to database...")

  // ─── Step 1: Fetch all menus ──────────────────────────────────────────────
  const allMenus = await db.select({
    id: navbarMenuItems.id,
    resource: navbarMenuItems.resource,
    title: navbarMenuItems.title,
  }).from(navbarMenuItems).orderBy(navbarMenuItems.resource)

  console.log(`📋 Total menu items in DB: ${allMenus.length}`)

  // ─── Step 2: Fetch all roles ──────────────────────────────────────────────
  const allRoles = await db.select({
    id: securityRoles.id,
    name: securityRoles.name,
  }).from(securityRoles).orderBy(securityRoles.name)

  console.log(`👥 Roles found: ${allRoles.length} → ${allRoles.map((r) => r.name).join(", ")}`)

  // ─── Step 3: Fetch existing permissions ──────────────────────────────────
  const existingPerms = await db.select({
    menuItemId: roleMenuPermissions.menuItemId,
    roleId: roleMenuPermissions.roleId,
  }).from(roleMenuPermissions)

  const permSet = new Set(existingPerms.map((p) => `${p.menuItemId}:${p.roleId}`))
  console.log(`🔐 Existing permission rows: ${permSet.size}`)

  // ─── Step 4: Build insert list ────────────────────────────────────────────
  const toInsert: {
    menuItemId: number
    roleId: number
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canSelectAll: boolean
    dataScope: string
  }[] = []

  for (const menu of allMenus) {
    for (const role of allRoles) {
      const key = `${menu.id}:${role.id}`
      if (!permSet.has(key)) {
        const roleName = role.name.toLowerCase()
        const resource = menu.resource.toLowerCase()

        const isSuper = roleName.includes("super")
        const isHC = roleName.includes("hc") || roleName.includes("human capital")
        const isHSE = roleName.includes("hse") || roleName.includes("safety")

        let canView = true
        let canEdit = false
        let canDelete = false
        let dataScope = "own"

        if (isSuper) {
          canView = true; canEdit = true; canDelete = true; dataScope = "global"
        } else if (isHC) {
          canView = true; canEdit = false; canDelete = false; dataScope = "global"
        } else if (isHSE) {
          const isHseResource = resource.includes("hse") || resource.includes("safety")
          canView = isHseResource
          canEdit = isHseResource
          canDelete = false
          dataScope = "site"
        }

        toInsert.push({
          menuItemId: menu.id,
          roleId: role.id,
          canView,
          canEdit,
          canDelete,
          canSelectAll: false,
          dataScope,
        })
      }
    }
  }

  if (toInsert.length === 0) {
    console.log("\n✅ Tidak ada rows yang perlu diinsert — semua sudah sinkron!")
    const finalCount = await db.select({ count: sql<number>`count(*)` }).from(roleMenuPermissions)
    console.log(`   📈 Total rows DB  : ${finalCount[0]?.count ?? 0}`)
    return
  }

  console.log(`\n⏳ Inserting ${toInsert.length} missing permission rows...`)

  // ─── Batch insert in chunks of 50 ────────────────────────────────────────
  const CHUNK = 50
  let insertedCount = 0
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    await db.insert(roleMenuPermissions).values(chunk).onConflictDoNothing()
    insertedCount += chunk.length
    process.stdout.write(`\r   ⏳ Progress: ${insertedCount}/${toInsert.length}`)
  }

  // ─── Final count ──────────────────────────────────────────────────────────
  const finalCount = await db.select({ count: sql<number>`count(*)` }).from(roleMenuPermissions)
  const total = Number(finalCount[0]?.count ?? 0)

  console.log(`\n\n✅ Sync selesai!`)
  console.log(`   📊 Menus di DB    : ${allMenus.length}`)
  console.log(`   👥 Roles          : ${allRoles.length}`)
  console.log(`   🆕 Rows inserted  : ${insertedCount}`)
  console.log(`   📈 Total rows DB  : ${total}`)
}

main().catch((e) => {
  console.error("❌ Error:", e)
  process.exit(1)
})
