import { db } from '../db';
import { apdSummaryApprovals } from '../db/schema/apd-summary';
import { approvals } from '../db/schema/hero';
import { eq, and, isNotNull } from 'drizzle-orm';

async function main() {
  // Check apdSummaryApprovals
  const sumApprovals = await db.select().from(apdSummaryApprovals).where(eq(apdSummaryApprovals.summaryId, 5));
  console.log('apdSummaryApprovals for summary 5:');
  for (const a of sumApprovals) {
    console.log(`  Level ${a.level}: status=${a.status}, sig=${a.signatureUrl ? 'HAS (' + a.signatureUrl.substring(0, 40) + '...)' : 'NULL'}, note="${a.decisionNote}", reviewedAt=${a.reviewedAt}`);
  }

  // Check hero_approvals
  const heroApprovals = await db.select().from(approvals).where(and(isNotNull(approvals.apdSummaryId), eq(approvals.apdSummaryId, 5)));
  console.log('\nhero_approvals for summary 5:');
  for (const a of heroApprovals) {
    console.log(`  Level ${a.level}: status=${a.status}, sig=${a.signatureUrl ? 'HAS (' + a.signatureUrl.substring(0, 40) + '...)' : 'NULL'}, note="${a.decisionNote}", reviewedAt=${a.reviewedAt}`);
  }
}
main().then(() => process.exit(0));
