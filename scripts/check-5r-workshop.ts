import { db } from '../db';
import { fiveRMasterAreas } from '../db/schema/five-r';
import { employees, sites, masterSections, orgChartNodes } from '../db/schema/hero';
import { eq, ilike } from 'drizzle-orm';
import { resolveFiveRApprovalRoute } from '../lib/five-r-approval';

async function main() {
  const areas = await db
    .select({
      id: fiveRMasterAreas.id,
      name: fiveRMasterAreas.name,
      siteId: fiveRMasterAreas.siteId,
      siteName: sites.name,
      picEmployeeId: fiveRMasterAreas.picEmployeeId,
      picName: employees.name,
    })
    .from(fiveRMasterAreas)
    .leftJoin(sites, eq(fiveRMasterAreas.siteId, sites.id))
    .leftJoin(employees, eq(fiveRMasterAreas.picEmployeeId, employees.id))
    .where(eq(fiveRMasterAreas.isActive, true));

  console.log('=== ALL 5R MASTER AREAS & STEP 2 APPROVER RESOLUTION ===');
  for (const a of areas) {
    const route = await resolveFiveRApprovalRoute({
      siteId: a.siteId,
      areaId: a.id,
      picEmployeeId: a.picEmployeeId,
    });
    const step2 = route.steps[1];
    console.log(`\nArea [${a.id}]: "${a.name}"`);
    console.log(`  Site: ${a.siteName} (ID: ${a.siteId})`);
    console.log(`  PIC: ${a.picName || '(belum ada)'} (ID: ${a.picEmployeeId})`);
    console.log(`  -> Approver Step 2: ${step2?.approverName} (${step2?.roleLabel}) [ID: ${step2?.approverEmployeeId}]`);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
