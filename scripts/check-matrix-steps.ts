import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps } from '../db/schema/hero';
import { eq, asc } from 'drizzle-orm';
async function main() {
  const matrices = await db.select().from(approvalMatrices).where(eq(approvalMatrices.transactionType, 'apd-request-apd'));
  for (const m of matrices) {
    console.log(`Matrix #${m.id}: ${m.name} | Site:${m.siteId} | Section:${m.sectionId}`);
    const steps = await db.select().from(approvalMatrixSteps).where(eq(approvalMatrixSteps.matrixId, m.id)).orderBy(asc(approvalMatrixSteps.stepOrder));
    for (const s of steps) {
      console.log(`  Step ${s.stepOrder}: ${s.label} | node:${s.nodeId || 'null'} fallback:${s.fallbackNodeId || 'null'}`);
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
