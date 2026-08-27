import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps } from '../db/schema/hero';
import { eq, asc } from 'drizzle-orm';

async function main() {
  const matrices = await db.select().from(approvalMatrices).where(eq(approvalMatrices.isActive, true));
  console.log('=== ACTIVE MATRICES (' + matrices.length + ') ===');
  for (const m of matrices) {
    const steps = await db.select().from(approvalMatrixSteps).where(eq(approvalMatrixSteps.matrixId, m.id)).orderBy(asc(approvalMatrixSteps.stepOrder));
    const stepLabels = steps.map(s => `${s.stepOrder}. ${s.label}`).join(' → ');
    console.log(`  ${m.transactionType} | site=${m.siteId} | steps=${steps.length} | ${stepLabels || '(no steps)'}`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
