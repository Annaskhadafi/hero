import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps, employees, orgChartNodes } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const mats = await db
    .select()
    .from(approvalMatrices)
    .where(eq(approvalMatrices.transactionType, 'form_wo_service_other'));

  for (const m of mats) {
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

    const hasAnnas = steps.some((s) => s.empId === 5);
    if (hasAnnas) {
      console.log(`FOUND ANNAS in Matrix #${m.id}: site=${m.siteId}, sec=${m.sectionId}, steps:`, steps);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
