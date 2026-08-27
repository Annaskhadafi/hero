import { db } from '../db';
import { sites, employees, approvalMatrices, approvalMatrixSteps, orgChartNodes } from '../db/schema/hero';
import { eq, and, asc } from 'drizzle-orm';

async function main() {
  // 1. Get all active sites with their headEmployeeId
  const allSites = await db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.name));
  
  console.log('=== PJO PER SITE ===\n');
  
  const sitePjoMap = new Map<number, { siteName: string; pjoId: number | null; pjoName: string }>();
  
  for (const site of allSites) {
    let pjoName = 'TIDAK ADA PJO';
    if (site.headEmployeeId) {
      const [emp] = await db.select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(eq(employees.id, site.headEmployeeId))
        .limit(1);
      pjoName = emp?.name ?? `ID: ${site.headEmployeeId}`;
    }
    sitePjoMap.set(site.id, { siteName: site.name, pjoId: site.headEmployeeId, pjoName });
    console.log(`  ${site.name} → PJO: ${pjoName} (ID: ${site.headEmployeeId ?? 'NULL'})`);
  }
  
  // 2. Get current Tools matrices
  console.log('\n=== TOOLS MATRICES SAAT INI ===\n');
  
  const toolsMatrices = await db.select().from(approvalMatrices)
    .where(eq(approvalMatrices.transactionType, 'apd-request-tools'))
    .orderBy(asc(approvalMatrices.siteId));
  
  for (const matrix of toolsMatrices) {
    const siteInfo = sitePjoMap.get(matrix.siteId ?? 0);
    
    // Get current step + node
    const [step] = await db.select().from(approvalMatrixSteps)
      .where(eq(approvalMatrixSteps.matrixId, matrix.id))
      .orderBy(asc(approvalMatrixSteps.stepOrder))
      .limit(1);
    
    let currentNodeEmployee = 'N/A';
    if (step?.nodeId) {
      const [node] = await db.select({ employeeId: orgChartNodes.employeeId })
        .from(orgChartNodes)
        .where(eq(orgChartNodes.id, step.nodeId))
        .limit(1);
      if (node?.employeeId) {
        const [emp] = await db.select({ name: employees.name })
          .from(employees)
          .where(eq(employees.id, node.employeeId))
          .limit(1);
        currentNodeEmployee = emp?.name ?? `ID: ${node.employeeId}`;
      }
    }
    
    const correctPjo = siteInfo?.pjoName ?? 'UNKNOWN';
    const needsUpdate = siteInfo?.pjoId && currentNodeEmployee !== correctPjo;
    
    console.log(`  Matrix #${matrix.id} | ${siteInfo?.siteName ?? matrix.siteId} | Current: ${currentNodeEmployee} | Should be: ${correctPjo} ${needsUpdate ? '❌ NEEDS UPDATE' : '✅'}`);
  }
}

main().catch(console.error);
