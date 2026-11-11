import { db } from '@/db';
import { navbarMenuItems, roleMenuPermissions, securityRoles } from '@/db/schema/hero';
import { eq, and, sql, asc } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 Starting HRGA Group 3 (Compensation & Benefit) Migration...');

  // 1. Shift remaining HRGA items to sortOrder >= 14
  const shiftMap: Record<string, number> = {
    '/dashboard/security/users': 14,
    '/dashboard/hc/org-chart-v2': 15,
    '/dashboard/hc': 16,
    '/dashboard/curhat': 17,
    '/dashboard/hr-counseling': 18,
    '/dashboard/ga/flight-route-change': 19,
    '/dashboard/hc/flight-route-change': 19,
    '/dashboard/hc/disciplinary': 20,
    '/dashboard/hc/mcu-wellness': 21,
    '/dashboard/hc/kerjasama': 22,
    '/dashboard/apd': 23,
    '/dashboard/central-service/refueling': 24,
    '/dashboard/ga/house-rental': 25,
    '/dashboard/hc/performance': 26,
    '/dashboard/hc/leader-performance': 27,
  };

  for (const [url, order] of Object.entries(shiftMap)) {
    await db
      .update(navbarMenuItems)
      .set({ sortOrder: order })
      .where(and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.url, url)));
  }

  // 2. Setup Item 1: Payroll (/dashboard/scheduling-timesheet/payroll)
  console.log('Setting up Item 1: Payroll...');
  const existingHrgaPayroll = await db
    .select()
    .from(navbarMenuItems)
    .where(
      and(
        eq(navbarMenuItems.section, 'HRGA'),
        eq(navbarMenuItems.url, '/dashboard/scheduling-timesheet/payroll')
      )
    );

  let hrgaPayrollId: number;
  if (existingHrgaPayroll.length > 0) {
    hrgaPayrollId = existingHrgaPayroll[0].id;
    await db
      .update(navbarMenuItems)
      .set({
        section: 'HRGA',
        groupLabel: 'Compensation & Benefit',
        title: 'Payroll',
        sortOrder: 12,
        isVisible: true,
      })
      .where(eq(navbarMenuItems.id, hrgaPayrollId));
  } else {
    const [inserted] = await db
      .insert(navbarMenuItems)
      .values({
        menuArea: 'main',
        section: 'HRGA',
        groupLabel: 'Compensation & Benefit',
        title: 'Payroll',
        url: '/dashboard/scheduling-timesheet/payroll',
        iconName: 'credit-card',
        resource: 'hrga_payroll',
        sortOrder: 12,
        isVisible: true,
        openInNewTab: false,
      })
      .returning({ id: navbarMenuItems.id });
    hrgaPayrollId = inserted.id;

    // Sync permissions from scheduling_timesheet_payroll or grant to roles
    const timesheetPayrollItem = await db
      .select()
      .from(navbarMenuItems)
      .where(eq(navbarMenuItems.resource, 'scheduling_timesheet_payroll'));

    if (timesheetPayrollItem.length > 0) {
      const timesheetPerms = await db
        .select({
          roleId: roleMenuPermissions.roleId,
          canView: roleMenuPermissions.canView,
          canEdit: roleMenuPermissions.canEdit,
          canDelete: roleMenuPermissions.canDelete,
          canSelectAll: roleMenuPermissions.canSelectAll,
          dataScope: roleMenuPermissions.dataScope,
        })
        .from(roleMenuPermissions)
        .where(eq(roleMenuPermissions.menuItemId, timesheetPayrollItem[0].id));

      if (timesheetPerms.length > 0) {
        await db.insert(roleMenuPermissions).values(
          timesheetPerms.map((p) => ({
            roleId: p.roleId,
            menuItemId: hrgaPayrollId,
            canView: p.canView,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            canSelectAll: p.canSelectAll,
            dataScope: p.dataScope,
          }))
        );
      }
    }
  }

  // 3. Setup Item 2: Allowance (/dashboard/hc/compensation)
  console.log('Setting up Item 2: Allowance...');
  await db
    .update(navbarMenuItems)
    .set({
      section: 'HRGA',
      groupLabel: 'Compensation & Benefit',
      title: 'Allowance',
      sortOrder: 13,
      isVisible: true,
    })
    .where(and(eq(navbarMenuItems.section, 'HRGA'), eq(navbarMenuItems.url, '/dashboard/hc/compensation')));

  // 4. Hide dummy comben entry (id: 1831)
  await db
    .update(navbarMenuItems)
    .set({
      isVisible: false,
      sortOrder: 99,
    })
    .where(eq(navbarMenuItems.url, 'comben'));

  // 5. Verify Roster & Timesheet Payroll Timesheet (id: 1517) is untouched
  const rosterPayroll = await db
    .select()
    .from(navbarMenuItems)
    .where(
      and(
        eq(navbarMenuItems.section, 'Roster & Timesheet'),
        eq(navbarMenuItems.url, '/dashboard/scheduling-timesheet/payroll')
      )
    );
  console.log('Roster & Timesheet Payroll preserved:', rosterPayroll.length > 0);

  // 6. Verification - Print updated HRGA menu table
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
  console.table(updatedItems.slice(0, 18));

  console.log('\n🎉 HRGA Group 3 Migration Completed Successfully!');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
