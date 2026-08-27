import { db } from '../db';
import { apdSummaryApprovals } from '../db/schema/apd-summary';
import { approvals } from '../db/schema/hero';
import { eq, and, isNotNull } from 'drizzle-orm';

async function main() {
  const sumRows = await db.select().from(apdSummaryApprovals).where(eq(apdSummaryApprovals.summaryId, 5));
  console.log('apdSummaryApprovals:');
  for (const r of sumRows) {
    console.log(`  Level ${r.level}: note="${r.decisionNote}", sig=${r.signatureUrl ? 'OK' : 'NULL'}`);
  }
  
  const heroRows = await db.select().from(approvals).where(and(isNotNull(approvals.apdSummaryId), eq(approvals.apdSummaryId, 5)));
  console.log('\nhero_approvals:');
  for (const r of heroRows) {
    console.log(`  Level ${r.level}: note="${r.decisionNote}", sig=${r.signatureUrl ? 'OK' : 'NULL'}`);
  }
}
main().then(() => process.exit(0));
