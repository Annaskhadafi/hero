import { db } from '@/db';
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, employees } from '@/db/schema/hero';
import { eq, asc } from 'drizzle-orm';

async function main() {
  const matrices = await db.select().from(approvalMatrices).where(eq(approvalMatrices.transactionType, 'apd-request-apd'));
  console.log('APD matrices:', matrices.length);
  
  for (const m of matrices) {
    console.log(`\n--- Matrix #${m.id}: ${m.name} ---`);
    console.log(`  SiteId: ${m.siteId} | Active: ${m.isActive}`);
    
    const steps = await db.select({
      stepOrder: approvalMatrixSteps.stepOrder,
      label: approvalMatrixSteps.label,
      nodeId: approvalMatrixSteps.nodeId,
      employeeName: employees.name,
      resolutionSource: orgChartNodes.approvalRole,
    }).from(approvalMatrixSteps)
      .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
      .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
      .where(eq(approvalMatrixSteps.matrixId, m.id))
      .orderBy(asc(approvalMatrixSteps.stepOrder));
    
    if (steps.length === 0) {
      console.log('  NO STEPS');
    }
    for (const s of steps) {
      console.log(`  Step ${s.stepOrder}: ${s.label} → ${s.employeeName ?? 'VACANT'} (${s.resolutionSource ?? 'no role'})`);
    }
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
