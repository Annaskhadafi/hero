import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps } from '../db/schema/hero';
import { eq, asc } from 'drizzle-orm';
async function main() {
  const m = await db.select().from(approvalMatrices).where(eq(approvalMatrices.transactionType, 'apd-summary'));
  console.log('Summary matrices:', m.length);
  for (const r of m) {
    console.log(`  #${r.id} ${r.name} active:${r.isActive}`);
    const steps = await db.select().from(approvalMatrixSteps).where(eq(approvalMatrixSteps.matrixId, r.id)).orderBy(asc(approvalMatrixSteps.stepOrder));
    for (const s of steps) console.log(`    Step ${s.stepOrder}: ${s.label}`);
  }
  if (m.length === 0) console.log('  (belum ada matrix untuk summary)');
}
main().catch(console.error).finally(() => process.exit(0));
