import { db } from '@/db';
import { navbarMenuItems, roleMenuPermissions, securityRoles } from '@/db/schema/hero';
import { eq, and, sql, asc } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 Starting HRGA Group 4 (Industrial Relation) & Group 5 (Learning Development) Migration...');

  // 1. Shift remaining HRGA items to sortOrder >= 17
  const shiftMap: Record<string, number> = {
    '/dashboard/security/users': 17,
    '/dashboard/hc/org-chart-v2': 18,
    '/dashboard/hc': 19,
    '/dashboard/curhat': 20,
    '/dashboard/hr-counseling': 21,
    '/dashboard/ga/flight-route-change': 22,
    '/dashboard/hc/flight-route-change': 22,
    '/dashboard/hc/disciplinary': 23,
    '/dashboard/hc/mcu-wellness': 24,
    '/dashboard/apd': 25,
    '/dashboard/central-service/refueling': 26,
    '/dashboard/ga/house-rental': 27,
    '/dashboard/hc/performance': 28,
    '/dashboard/hc/leader-performance': 29,
  };

  for (const [url, order] of Object.entries(shiftMap)) {
    await db
      .update(navbarMenuItems)
      .set({ sortOrder: order })
      .where(and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.url, url)));
  }

  // 2. Setup Group 4: Industrial Relation -> Corporate Partnership (/dashboard/hc/kerjasama)
  console.log('Setting up Group 4: Industrial Relation -> Corporate Partnership...');
  const existingKerjasama = await db
    .select()
    .from(navbarMenuItems)
    .where(
      and(
        eq(navbarMenuItems.section, 'HRGA'),
        eq(navbarMenuItems.url, '/dashboard/hc/kerjasama')
      )
    );

  let kerjasamaId: number;
  if (existingKerjasama.length > 0) {
    kerjasamaId = existingKerjasama[0].id;
    await db
      .update(navbarMenuItems)
      .set({
        title: 'Corporate Partnership',
        groupLabel: 'Industrial Relation',
        sortOrder: 14,
        iconName: 'handshake',
        resource: 'hc_kerjasama',
        isVisible: true,
      })
      .where(eq(navbarMenuItems.id, kerjasamaId));
  } else {
    const inserted = await db
      .insert(navbarMenuItems)
      .values({
        menuArea: 'main',
        section: 'HRGA',
        groupLabel: 'Industrial Relation',
        title: 'Corporate Partnership',
        url: '/dashboard/hc/kerjasama',
        iconName: 'handshake',
        resource: 'hc_kerjasama',
        sortOrder: 14,
        isVisible: true,
        openInNewTab: false,
      })
      .returning({ id: navbarMenuItems.id });
    kerjasamaId = inserted[0].id;
  }
  console.log(`Corporate Partnership ID: ${kerjasamaId}`);

  // 3. Setup Group 5 Item 1: List Sertifikasi (/dashboard/training-records?tab=sio)
  console.log('Setting up Group 5 Item 1: Learning Development -> List Sertifikasi...');
  const existingSertifikasi = await db
    .select()
    .from(navbarMenuItems)
    .where(
      and(
        eq(navbarMenuItems.section, 'HRGA'),
        eq(navbarMenuItems.url, '/dashboard/training-records?tab=sio')
      )
    );

  let sertifikasiId: number;
  if (existingSertifikasi.length > 0) {
    sertifikasiId = existingSertifikasi[0].id;
    await db
      .update(navbarMenuItems)
      .set({
        title: 'List Sertifikasi',
        groupLabel: 'Learning Development',
        sortOrder: 15,
        iconName: 'award',
        resource: 'hrga_training_records',
        isVisible: true,
      })
      .where(eq(navbarMenuItems.id, sertifikasiId));
  } else {
    const inserted = await db
      .insert(navbarMenuItems)
      .values({
        menuArea: 'main',
        section: 'HRGA',
        groupLabel: 'Learning Development',
        title: 'List Sertifikasi',
        url: '/dashboard/training-records?tab=sio',
        iconName: 'award',
        resource: 'hrga_training_records',
        sortOrder: 15,
        isVisible: true,
        openInNewTab: false,
      })
      .returning({ id: navbarMenuItems.id });
    sertifikasiId = inserted[0].id;
  }
  console.log(`List Sertifikasi ID: ${sertifikasiId}`);

  // 4. Setup Group 5 Item 2: List Training (/dashboard/training-records)
  console.log('Setting up Group 5 Item 2: Learning Development -> List Training...');
  const existingTraining = await db
    .select()
    .from(navbarMenuItems)
    .where(
      and(
        eq(navbarMenuItems.section, 'HRGA'),
        eq(navbarMenuItems.url, '/dashboard/training-records')
      )
    );

  let trainingId: number;
  if (existingTraining.length > 0) {
    trainingId = existingTraining[0].id;
    await db
      .update(navbarMenuItems)
      .set({
        title: 'List Training',
        groupLabel: 'Learning Development',
        sortOrder: 16,
        iconName: 'book-open',
        resource: 'training_records',
        isVisible: true,
      })
      .where(eq(navbarMenuItems.id, trainingId));
  } else {
    const inserted = await db
      .insert(navbarMenuItems)
      .values({
        menuArea: 'main',
        section: 'HRGA',
        groupLabel: 'Learning Development',
        title: 'List Training',
        url: '/dashboard/training-records',
        iconName: 'book-open',
        resource: 'training_records',
        sortOrder: 16,
        isVisible: true,
        openInNewTab: false,
      })
      .returning({ id: navbarMenuItems.id });
    trainingId = inserted[0].id;
  }
  console.log(`List Training ID: ${trainingId}`);

  // 5. Grant role_menu_permissions for List Sertifikasi and List Training
  // Find all roles that have access to training_records or are admin/superadmin
  const sourcePermissions = await db
    .select({
      roleId: roleMenuPermissions.roleId,
      canView: roleMenuPermissions.canView,
    })
    .from(roleMenuPermissions)
    .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
    .where(eq(navbarMenuItems.resource, 'training_records'));

  const allowedRoleIds = new Set<number>();
  for (const perm of sourcePermissions) {
    if (perm.canView) {
      allowedRoleIds.add(perm.roleId);
    }
  }

  // Ensure all active security roles have view access
  const allRoles = await db.select().from(securityRoles);
  for (const r of allRoles) {
    allowedRoleIds.add(r.id);
  }

  console.log(`Granting permissions to ${allowedRoleIds.size} roles...`);
  for (const targetMenuId of [sertifikasiId, trainingId, kerjasamaId]) {
    for (const roleId of allowedRoleIds) {
      const existing = await db
        .select()
        .from(roleMenuPermissions)
        .where(
          and(
            eq(roleMenuPermissions.roleId, roleId),
            eq(roleMenuPermissions.menuItemId, targetMenuId)
          )
        );

      if (existing.length === 0) {
        await db.insert(roleMenuPermissions).values({
          roleId,
          menuItemId: targetMenuId,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        });
      } else {
        await db
          .update(roleMenuPermissions)
          .set({ canView: true })
          .where(
            and(
              eq(roleMenuPermissions.roleId, roleId),
              eq(roleMenuPermissions.menuItemId, targetMenuId)
            )
          );
      }
    }
  }

  // 6. Verify ChitraLearning Training Records is preserved
  const originalTrainingRecords = await db
    .select()
    .from(navbarMenuItems)
    .where(
      and(
        eq(navbarMenuItems.section, 'ChitraLearning & Training'),
        eq(navbarMenuItems.url, '/dashboard/training-records')
      )
    );
  console.log('ChitraLearning Training Records preserved:', originalTrainingRecords.length > 0);

  // 7. Print updated HRGA menu table
  const updatedItems = await db
    .select({
      id: navbarMenuItems.id,
      title: navbarMenuItems.title,
      groupLabel: navbarMenuItems.groupLabel,
      url: navbarMenuItems.url,
      resource: navbarMenuItems.resource,
      sortOrder: navbarMenuItems.sortOrder,
      isVisible: navbarMenuItems.isVisible,
    })
    .from(navbarMenuItems)
    .where(and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.isVisible, true)))
    .orderBy(asc(navbarMenuItems.sortOrder));

  console.log('\n✅ Updated HRGA Menu Table:');
  console.table(updatedItems.slice(0, 22));

  console.log('\n🎉 HRGA Groups 4 & 5 Migration Completed Successfully!');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
