import { db } from '@/db';
import { navbarMenuItems, roleMenuPermissions, securityRoles } from '@/db/schema/hero';
import { eq, or, and, sql, notInArray, asc } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 Starting HRGA Group 2 (Recruitment & Selection) Migration...');

  // Group 1 & 2 protected URLs/resources
  const group1Urls = [
    '/dashboard/hc/employee',
    '/dashboard/scheduling-timesheet/attendance',
    '/dashboard/hc/permission',
    '/dashboard/hc/contract-review',
    '/dashboard/central-service?tab=composition',
    '/dashboard/hc/surat',
    '/dashboard/central-service/marital-status',
    '/dashboard/hc/turnover',
  ];

  const group2Urls = [
    '/dashboard/hc/rfr',
    '/dashboard/hc/recruitment',
    '/dashboard/hc/recruitment/tests',
  ];

  // 1. Shift remaining HRGA items to sortOrder >= 12
  const shiftMap: Record<string, number> = {
    '/dashboard/security/users': 12,
    '/dashboard/hc/org-chart-v2': 13,
    '/dashboard/hc/compensation': 14,
    '/dashboard/hc': 15,
    '/dashboard/curhat': 16,
    '/dashboard/hr-counseling': 17,
    '/dashboard/ga/flight-route-change': 18,
    '/dashboard/hc/flight-route-change': 18,
    '/dashboard/hc/disciplinary': 19,
    '/dashboard/hc/mcu-wellness': 20,
    '/dashboard/hc/kerjasama': 21,
    '/dashboard/apd': 22,
    '/dashboard/central-service/refueling': 23,
    '/dashboard/ga/house-rental': 24,
    '/dashboard/hc/performance': 25,
    '/dashboard/hc/leader-performance': 26,
  };

  for (const [url, order] of Object.entries(shiftMap)) {
    await db
      .update(navbarMenuItems)
      .set({ sortOrder: order })
      .where(and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.url, url)));
  }

  // 2. Update Group 2 Items
  // Item 1: Request For Recruitment (sortOrder: 9)
  console.log('Updating Item 1: Request For Recruitment...');
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'Recruitment & Selection',
      title: 'Request For Recruitment',
      sortOrder: 9,
      isVisible: true,
    })
    .where(and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.url, '/dashboard/hc/rfr')));

  // Item 2: Recruitment (sortOrder: 10)
  console.log('Updating Item 2: Recruitment...');
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'Recruitment & Selection',
      title: 'Recruitment',
      sortOrder: 10,
      isVisible: true,
    })
    .where(and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.url, '/dashboard/hc/recruitment')));

  // Item 3: Online Test (sortOrder: 11)
  console.log('Updating Item 3: Online Test...');
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'Recruitment & Selection',
      title: 'Online Test',
      sortOrder: 11,
      isVisible: true,
    })
    .where(and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.url, '/dashboard/hc/recruitment/tests')));

  // Hide any legacy /dashboard/hc/recruitment/wawancara item
  await db
    .update(navbarMenuItems)
    .set({
      isVisible: false,
      sortOrder: 98,
    })
    .where(eq(navbarMenuItems.url, '/dashboard/hc/recruitment/wawancara'));

  // 3. Verification - Print updated HRGA menu table
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
  console.table(updatedItems.slice(0, 15));

  console.log('\n🎉 HRGA Group 2 Migration Completed Successfully!');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
