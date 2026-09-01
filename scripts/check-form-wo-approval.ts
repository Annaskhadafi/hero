import { db } from '../db';
import { repairFormWo } from '../db/schema/form-wo';
import { approvals, approvalMatrices, approvalMatrixSteps, employees, orgChartNodes } from '../db/schema/hero';
import { desc, eq } from 'drizzle-orm';

async function main() {
  console.log('=== LATEST REPAIR FORM WO ===');
  const wos = await db
    .select()
    .from(repairFormWo)
    .orderBy(desc(repairFormWo.id))
    .limit(3);

  console.log('Latest Form WOs:', JSON.stringify(wos, null, 2));

  if (wos.length > 0) {
    const latestWo = wos[0];
    console.log(`\n=== APPROVALS FOR FORM WO #${latestWo.id} (${latestWo.noPengajuan}) ===`);
    const appvs = await db
      .select({
        id: approvals.id,
        level: approvals.level,
        status: approvals.status,
        approverName: approvals.approverName,
        approverEmployeeId: approvals.approverEmployeeId,
        approverNodeId: approvals.approverNodeId,
        approvalMatrixId: approvals.approvalMatrixId,
        submittedAt: approvals.submittedAt,
        routeSnapshot: approvals.routeSnapshot,
      })
      .from(approvals)
      .where(eq(approvals.repairFormWoId, latestWo.id));

    console.log('Approvals:', JSON.stringify(appvs, null, 2));
  }

  console.log('\n=== ALL MATRICES IN DB WITH "WO" IN TRANSACTION TYPE ===');
  const mats = await db
    .select({
      id: approvalMatrices.id,
      name: approvalMatrices.name,
      transactionType: approvalMatrices.transactionType,
      siteId: approvalMatrices.siteId,
      sectionId: approvalMatrices.sectionId,
      isActive: approvalMatrices.isActive,
    })
    .from(approvalMatrices);

  const woMats = mats.filter((m) => m.transactionType && (m.transactionType.toLowerCase().includes('wo') || m.name.toLowerCase().includes('wo')));
  console.log('WO Matrices in DB:', JSON.stringify(woMats, null, 2));

  for (const m of woMats) {
    console.log(`\n--- Steps for Matrix #${m.id} (${m.name} - ${m.transactionType}) ---`);
    const steps = await db
      .select({
        id: approvalMatrixSteps.id,
        stepOrder: approvalMatrixSteps.stepOrder,
        label: approvalMatrixSteps.label,
        nodeId: approvalMatrixSteps.nodeId,
        empId: orgChartNodes.employeeId,
        empName: employees.name,
      })
      .from(approvalMatrixSteps)
      .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
      .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
      .where(eq(approvalMatrixSteps.matrixId, m.id));
    console.log('Steps:', steps);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
