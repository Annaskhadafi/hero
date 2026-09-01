import { db } from '../db';
import { approvalMatrices, orgChartStructures, employees } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const [emp] = await db.select().from(employees).where(eq(employees.id, 5));
  console.log('Employee #5:', { id: emp.id, name: emp.name, siteId: emp.siteId, departmentId: emp.departmentId, sectionId: emp.sectionId });

  const mats = await db
    .select({
      id: approvalMatrices.id,
      name: approvalMatrices.name,
      transactionType: approvalMatrices.transactionType,
      siteId: approvalMatrices.siteId,
      departmentId: approvalMatrices.departmentId,
      sectionId: approvalMatrices.sectionId,
      effectiveFrom: approvalMatrices.effectiveFrom,
      effectiveTo: approvalMatrices.effectiveTo,
      isActive: approvalMatrices.isActive,
      structureId: approvalMatrices.structureId,
      structureName: orgChartStructures.name,
      structureIsActive: orgChartStructures.isActive,
    })
    .from(approvalMatrices)
    .leftJoin(orgChartStructures, eq(approvalMatrices.structureId, orgChartStructures.id))
    .where(eq(approvalMatrices.transactionType, 'form_wo_service_other'));

  console.log(`Found ${mats.length} matrices for form_wo_service_other`);
  for (const m of mats.slice(0, 10)) {
    console.log(`Matrix #${m.id} (${m.name}): site=${m.siteId}, dept=${m.departmentId}, sec=${m.sectionId}, isActive=${m.isActive}, structActive=${m.structureIsActive}`);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
