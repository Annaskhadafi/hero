import { db } from '@/db'
import { approvalMatrices, approvalMatrixSteps, employees } from '@/db/schema/hero'
import { eq, or } from 'drizzle-orm'

async function main() {
  const csMatrices = await db
    .select()
    .from(approvalMatrices)
    .where(eq(approvalMatrices.departmentId, 2))
  console.log(`Central Services (dept 2) matrices count: ${csMatrices.length}`)
  for (const m of csMatrices) {
    const steps = await db
      .select()
      .from(approvalMatrixSteps)
      .where(eq(approvalMatrixSteps.matrixId, m.id))
      .orderBy(approvalMatrixSteps.stepOrder)
    console.log(`Matrix [${m.id}] ${m.code} - ${m.name} (type: ${m.transactionType}, section: ${m.sectionId}, site: ${m.siteId}):`)
    for (const s of steps) {
      console.log(`  Step ${s.stepOrder}: ${s.label}`)
    }
  }
  process.exit(0)
}

main().catch(console.error)
