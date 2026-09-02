import { db } from '../db'
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, employees } from '../db/schema/hero'
import { eq } from 'drizzle-orm'

async function main() {
  const rows = await db
    .select({
      id: approvalMatrices.id,
      name: approvalMatrices.name,
      desc: approvalMatrices.description,
      siteId: approvalMatrices.siteId,
      stepId: approvalMatrixSteps.id,
      stepOrder: approvalMatrixSteps.stepOrder,
      stepLabel: approvalMatrixSteps.label,
      empId: employees.id,
      empName: employees.name,
    })
    .from(approvalMatrices)
    .innerJoin(approvalMatrixSteps, eq(approvalMatrices.id, approvalMatrixSteps.matrixId))
    .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
    .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
    .where(eq(approvalMatrices.transactionType, 'five_r_report'))
    .orderBy(approvalMatrices.id, approvalMatrixSteps.stepOrder)

  console.log(`Total rows in DB: ${rows.length}`)
  const byMatrix = new Map<number, typeof rows>()
  for (const r of rows) {
    if (!byMatrix.has(r.id)) byMatrix.set(r.id, [])
    byMatrix.get(r.id)!.push(r)
  }

  console.log(`Total matrices: ${byMatrix.size}`)
  for (const [mId, mRows] of byMatrix) {
    console.log(`Matrix ${mId} | ${mRows[0].name} | ${mRows[0].desc}`)
    for (const step of mRows) {
      console.log(`   Step ${step.stepOrder}: ${step.stepLabel} -> ${step.empName} (ID: ${step.empId})`)
    }
  }
}

main().then(() => process.exit(0)).catch(console.error)
