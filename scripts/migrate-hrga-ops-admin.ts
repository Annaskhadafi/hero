import { db } from '@/db'
import { navbarMenuItems, roleMenuPermissions, securityRoles } from '@/db/schema/hero'
import { eq, or, and, sql, notInArray, asc } from 'drizzle-orm'

async function runMigration() {
  console.log('🚀 Starting HRGA Group 1 Reorganization Migration...')

  // 1. Shift existing non-Group-1 HRGA items to sortOrder >= 9 to keep 1..8 strictly reserved
  const existingHrgaItems = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, 'HRGA'))
    .orderBy(asc(navbarMenuItems.sortOrder), asc(navbarMenuItems.id))

  const group1Resources = new Set([
    'hc_employee',
    'hrga_attendance',
    'hc_attendance_permission',
    'hc_contract_review',
    'hc_manpower_composition',
    'hc_surat',
    'central_service_marital_status',
    'hc_labour_turnover',
  ])

  let nextSortOrder = 9
  for (const item of existingHrgaItems) {
    if (!group1Resources.has(item.resource)) {
      if (item.sortOrder < 9) {
        await db
          .update(navbarMenuItems)
          .set({ sortOrder: nextSortOrder })
          .where(eq(navbarMenuItems.id, item.id))
        console.log(`➡️ Shifted non-Group-1 item "${item.title}" (${item.resource}) to sortOrder: ${nextSortOrder}`)
      }
      nextSortOrder = Math.max(nextSortOrder + 1, item.sortOrder + 1)
    }
  }

  // 2. Exact Group 1 Items definition per handwritten spec
  const group1Items = [
    {
      title: 'Data Karyawan',
      url: '/dashboard/hc/employee',
      resource: 'hc_employee',
      sortOrder: 1,
      iconName: 'users',
    },
    {
      title: 'Attendance',
      url: '/dashboard/scheduling-timesheet/attendance',
      resource: 'hrga_attendance',
      sortOrder: 2,
      iconName: 'checklist',
    },
    {
      title: 'Sakit & Terlambat',
      url: '/dashboard/hc/permission',
      resource: 'hc_attendance_permission',
      sortOrder: 3,
      iconName: 'shield-alert',
    },
    {
      title: 'Employee Contract Review',
      url: '/dashboard/hc/contract-review',
      resource: 'hc_contract_review',
      sortOrder: 4,
      iconName: 'file-signature',
    },
    {
      title: 'Composition Manpower',
      url: '/dashboard/central-service?tab=composition',
      resource: 'hc_manpower_composition',
      sortOrder: 5,
      iconName: 'users',
    },
    {
      title: 'Online Letter',
      url: '/dashboard/hc/surat',
      resource: 'hc_surat',
      sortOrder: 6,
      iconName: 'file-word',
    },
    {
      title: 'Marrital Change Status',
      url: '/dashboard/central-service/marital-status',
      resource: 'central_service_marital_status',
      sortOrder: 7,
      iconName: 'heart',
    },
    {
      title: 'Labour Turn over',
      url: '/dashboard/hc/turnover',
      resource: 'hc_labour_turnover',
      sortOrder: 8,
      iconName: 'trending-up',
    },
  ]

  for (const item of group1Items) {
    const existing = await db
      .select()
      .from(navbarMenuItems)
      .where(
        or(
          eq(navbarMenuItems.resource, item.resource),
          and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.url, item.url))
        )
      )
      .limit(1)

    let itemId: number
    if (existing.length > 0) {
      itemId = existing[0].id
      await db
        .update(navbarMenuItems)
        .set({
          section: 'HRGA',
          groupLabel: 'HR Operations & Administration',
          title: item.title,
          url: item.url,
          iconName: item.iconName,
          sortOrder: item.sortOrder,
          menuArea: 'main',
          isVisible: true,
        })
        .where(eq(navbarMenuItems.id, itemId))
      console.log(`✅ [HRGA] ${item.title} -> Updated (id: ${itemId}, sortOrder: ${item.sortOrder})`)
    } else {
      const inserted = await db
        .insert(navbarMenuItems)
        .values({
          section: 'HRGA',
          groupLabel: 'HR Operations & Administration',
          title: item.title,
          url: item.url,
          iconName: item.iconName,
          resource: item.resource,
          sortOrder: item.sortOrder,
          menuArea: 'main',
          isVisible: true,
          openInNewTab: false,
        })
        .returning({ id: navbarMenuItems.id })
      itemId = inserted[0].id
      console.log(`✨ [HRGA] ${item.title} -> Inserted new menu item (id: ${itemId})`)
    }

    // Ensure permissions for newly introduced items
    if (item.resource === 'hrga_attendance') {
      const sourcePerms = await db
        .select({
          roleId: roleMenuPermissions.roleId,
          canView: roleMenuPermissions.canView,
          canEdit: roleMenuPermissions.canEdit,
          canDelete: roleMenuPermissions.canDelete,
          canSelectAll: roleMenuPermissions.canSelectAll,
          dataScope: roleMenuPermissions.dataScope,
        })
        .from(roleMenuPermissions)
        .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
        .where(eq(navbarMenuItems.resource, 'scheduling_timesheet_attendance'))

      for (const sp of sourcePerms) {
        const existingPerm = await db
          .select()
          .from(roleMenuPermissions)
          .where(
            and(
              eq(roleMenuPermissions.roleId, sp.roleId),
              eq(roleMenuPermissions.menuItemId, itemId)
            )
          )
          .limit(1)

        if (existingPerm.length === 0) {
          await db.insert(roleMenuPermissions).values({
            roleId: sp.roleId,
            menuItemId: itemId,
            canView: sp.canView,
            canEdit: sp.canEdit,
            canDelete: sp.canDelete,
            canSelectAll: sp.canSelectAll,
            dataScope: sp.dataScope,
          })
        }
      }
      console.log(`🔑 Synced permissions for hrga_attendance`)
    } else if (item.resource === 'hc_manpower_composition') {
      const sourcePerms = await db
        .select({
          roleId: roleMenuPermissions.roleId,
          canView: roleMenuPermissions.canView,
          canEdit: roleMenuPermissions.canEdit,
          canDelete: roleMenuPermissions.canDelete,
          canSelectAll: roleMenuPermissions.canSelectAll,
          dataScope: roleMenuPermissions.dataScope,
        })
        .from(roleMenuPermissions)
        .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
        .where(eq(navbarMenuItems.resource, 'central_service'))

      for (const sp of sourcePerms) {
        const existingPerm = await db
          .select()
          .from(roleMenuPermissions)
          .where(
            and(
              eq(roleMenuPermissions.roleId, sp.roleId),
              eq(roleMenuPermissions.menuItemId, itemId)
            )
          )
          .limit(1)

        if (existingPerm.length === 0) {
          await db.insert(roleMenuPermissions).values({
            roleId: sp.roleId,
            menuItemId: itemId,
            canView: sp.canView,
            canEdit: sp.canEdit,
            canDelete: sp.canDelete,
            canSelectAll: sp.canSelectAll,
            dataScope: sp.dataScope,
          })
        }
      }
      console.log(`🔑 Synced permissions for hc_manpower_composition`)
    }
  }

  // 3. Ensure Roster & Timesheet Attendance remains intact
  await db
    .update(navbarMenuItems)
    .set({
      section: 'Roster & Timesheet',
      title: 'Attendance',
      url: '/dashboard/scheduling-timesheet/attendance',
      iconName: 'checklist',
      sortOrder: 6,
      isVisible: true,
    })
    .where(eq(navbarMenuItems.resource, 'scheduling_timesheet_attendance'))
  console.log(`✅ Verified Roster & Timesheet Attendance is preserved`)

  console.log(`\n🎉 HRGA Group 1 Migration Completed Successfully!`)
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration error:', err)
    process.exit(1)
  })
