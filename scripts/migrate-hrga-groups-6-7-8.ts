import { db } from '../db';
import { navbarMenuItems, roleMenuPermissions, securityRoles } from '../db/schema/hero';
import { eq, and, or } from 'drizzle-orm';

async function migrate() {
  console.log('--- Migrating HRGA Groups 6, 7, and 8 ---');

  // 1. MCU (Wellbeing & Engagement, sortOrder 17)
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'Wellbeing & Engagement',
      title: 'MCU',
      sortOrder: 17,
      iconName: 'heart-pulse',
      isVisible: true,
    })
    .where(eq(navbarMenuItems.url, '/dashboard/hc/mcu-wellness'));
  console.log('✓ Updated MCU');

  // 2. Hero Point (Wellbeing & Engagement, sortOrder 18)
  const [existingHeroPoint] = await db
    .select()
    .from(navbarMenuItems)
    .where(
      and(
        eq(navbarMenuItems.section, 'HRGA'),
        eq(navbarMenuItems.url, '/dashboard/leaderboard')
      )
    );

  let heroPointId: number;
  if (existingHeroPoint) {
    await db
      .update(navbarMenuItems)
      .set({
        groupLabel: 'Wellbeing & Engagement',
        title: 'Hero Point',
        sortOrder: 18,
        iconName: 'award',
        isVisible: true,
      })
      .where(eq(navbarMenuItems.id, existingHeroPoint.id));
    heroPointId = existingHeroPoint.id;
    console.log('✓ Updated existing Hero Point item in HRGA, id:', heroPointId);
  } else {
    const [inserted] = await db
      .insert(navbarMenuItems)
      .values({
        menuArea: 'main',
        section: 'HRGA',
        groupLabel: 'Wellbeing & Engagement',
        title: 'Hero Point',
        url: '/dashboard/leaderboard',
        iconName: 'award',
        resource: 'hrga_hero_point',
        sortOrder: 18,
        isVisible: true,
        openInNewTab: false,
      })
      .returning({ id: navbarMenuItems.id });
    heroPointId = inserted.id;
    console.log('✓ Inserted new Hero Point item in HRGA, id:', heroPointId);
  }

  // 3. List Kegiatan Olahraga (Wellbeing & Engagement, sortOrder 19)
  const [existingOlahraga] = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.url, '/dashboard/hc/olahraga'));

  let olahragaId: number;
  if (existingOlahraga) {
    await db
      .update(navbarMenuItems)
      .set({
        section: 'HRGA',
        groupLabel: 'Wellbeing & Engagement',
        title: 'List Kegiatan Olahraga',
        sortOrder: 19,
        iconName: 'activity',
        isVisible: true,
      })
      .where(eq(navbarMenuItems.id, existingOlahraga.id));
    olahragaId = existingOlahraga.id;
    console.log('✓ Updated existing List Kegiatan Olahraga item, id:', olahragaId);
  } else {
    const [inserted] = await db
      .insert(navbarMenuItems)
      .values({
        menuArea: 'main',
        section: 'HRGA',
        groupLabel: 'Wellbeing & Engagement',
        title: 'List Kegiatan Olahraga',
        url: '/dashboard/hc/olahraga',
        iconName: 'activity',
        resource: 'hc_sports',
        sortOrder: 19,
        isVisible: true,
        openInNewTab: false,
      })
      .returning({ id: navbarMenuItems.id });
    olahragaId = inserted.id;
    console.log('✓ Inserted List Kegiatan Olahraga item, id:', olahragaId);
  }

  // 4. Pengaduan (Wellbeing & Engagement, sortOrder 20)
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'Wellbeing & Engagement',
      title: 'Pengaduan',
      sortOrder: 20,
      iconName: 'message-square',
      isVisible: true,
    })
    .where(eq(navbarMenuItems.url, '/dashboard/curhat'));
  console.log('✓ Updated Pengaduan');

  // 5. Employee Performance (Performance Management, sortOrder 21)
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'Performance Management',
      title: 'Employee Performance',
      sortOrder: 21,
      iconName: 'trending-up',
      isVisible: true,
    })
    .where(eq(navbarMenuItems.url, '/dashboard/hc/performance'));
  console.log('✓ Updated Employee Performance');

  // 6. Leader Performance (Performance Management, sortOrder 22)
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'Performance Management',
      title: 'Leader Performance',
      sortOrder: 22,
      iconName: 'award',
      isVisible: true,
    })
    .where(eq(navbarMenuItems.url, '/dashboard/hc/leader-performance'));
  console.log('✓ Updated Leader Performance');

  // 7. Vehicle Management (General Affair, sortOrder 23)
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'General Affair',
      title: 'Vehicle Management',
      sortOrder: 23,
      iconName: 'truck',
      isVisible: true,
    })
    .where(eq(navbarMenuItems.url, '/dashboard/ga/vehicles'));
  console.log('✓ Updated Vehicle Management');

  // 8. ATK (General Affair, sortOrder 24)
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'General Affair',
      title: 'ATK',
      sortOrder: 24,
      iconName: 'pencil',
      isVisible: true,
    })
    .where(eq(navbarMenuItems.url, '/dashboard/ga/atk'));
  console.log('✓ Updated ATK');

  // 9. Rental House (General Affair, sortOrder 25)
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'General Affair',
      title: 'Rental House',
      sortOrder: 25,
      iconName: 'home',
      isVisible: true,
    })
    .where(eq(navbarMenuItems.url, '/dashboard/ga/house-rental'));
  console.log('✓ Updated Rental House');

  // Shift other remaining items
  const shifts = [
    { url: '/dashboard/security/users', sortOrder: 26 },
    { url: '/dashboard/hc/org-chart-v2', sortOrder: 27 },
    { url: '/dashboard/hc', sortOrder: 28 },
    { url: '/dashboard/hr-counseling', sortOrder: 29 },
    { url: '/dashboard/hc/flight-route-change', sortOrder: 30 },
    { url: '/dashboard/ga/flight-route-change', sortOrder: 30 },
    { url: '/dashboard/hc/disciplinary', sortOrder: 31 },
    { url: '/dashboard/apd', sortOrder: 32 },
    { url: '/dashboard/central-service/refueling', sortOrder: 33 },
  ];

  for (const s of shifts) {
    await db
      .update(navbarMenuItems)
      .set({ sortOrder: s.sortOrder })
      .where(and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.url, s.url)));
  }
  console.log('✓ Shifted remaining items to sortOrder 26..33');

  // Grant permissions for all items to all active security roles
  const roles = await db.select().from(securityRoles);
  const targetItemIds = [heroPointId, olahragaId];

  for (const r of roles) {
    for (const itemId of targetItemIds) {
      const [existingPerm] = await db
        .select()
        .from(roleMenuPermissions)
        .where(
          and(
            eq(roleMenuPermissions.roleId, r.id),
            eq(roleMenuPermissions.menuItemId, itemId)
          )
        );

      if (!existingPerm) {
        await db.insert(roleMenuPermissions).values({
          roleId: r.id,
          menuItemId: itemId,
          canView: true,
          canEdit: true,
          canDelete: r.name === 'Super Admin',
          canSelectAll: true,
        });
      }
    }
  }
  console.log('✓ Granted permissions for new items to all security roles');

  console.log('--- Migration Finished Successfully ---');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
