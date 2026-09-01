import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps, employees, orgChartNodes } from '../db/schema/hero';
import { inArray, eq } from 'drizzle-orm';

async function main() {
  const mats = await db
    .select()
    .from(approvalMatrices)
    .where(inArray(approvalMatrices.id, [1317, 2846]));

  for (const m of mats) {
    console.log(`Matrix #${m.id}: name="${m.name}", type="${m.transactionType}", site=${m.siteId}, sec=${m.sectionId}, isActive=${m.isActive}, effectiveFrom=${m.effectiveFrom}`);
    const steps = await db
      .select({
        stepOrder: approvalMatrixSteps.stepOrder,
        label: approvalMatrixSteps.label,
        empId: orgChartNodes.employeeId,
        empName: employees.name,
      })
      .from(approvalMatrixSteps)
      .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
      .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
      .where(eq(approvalMatrixSteps.matrixId, m.id));
    console.log('  Steps:', steps);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
