import { db } from '../db'
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, employees, sites } from '../db/schema/hero'
import { ilike, desc, eq } from 'drizzle-orm'

async function main() {
  const annasSteps = await db
    .select({
      matrixId: approvalMatrixSteps.matrixId,
      matrixName: approvalMatrices.name,
      siteId: approvalMatrices.siteId,
      siteName: sites.name,
      type: approvalMatrices.transactionType,
      stepOrder: approvalMatrixSteps.stepOrder,
      label: approvalMatrixSteps.label,
      empId: orgChartNodes.employeeId,
      empName: employees.name,
    })
    .from(approvalMatrixSteps)
    .innerJoin(approvalMatrices, eq(approvalMatrixSteps.matrixId, approvalMatrices.id))
    .leftJoin(sites, eq(approvalMatrices.siteId, sites.id))
    .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
    .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
    .where(eq(orgChartNodes.employeeId, 5))

  console.log(`=== MATRICES CONTAINING ANNAS KHADAFI (COUNT: ${annasSteps.length}) ===`)
  for (const s of annasSteps) {
    console.log(`Matrix #${s.matrixId} [${s.matrixName}] (Site: ${s.siteName || 'Global'}, type: ${s.type}) -> Step ${s.stepOrder}: ${s.label}`)
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })





