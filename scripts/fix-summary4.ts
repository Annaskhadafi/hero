import { db } from '../db';
import { apdSummaries, apdSummaryItems, apdSummaryApprovals } from '../db/schema/apd-summary';
import { approvals } from '../db/schema/hero';
import { eq, and, isNotNull } from 'drizzle-orm';

async function main() {
  await db.delete(apdSummaryItems).where(eq(apdSummaryItems.summaryId, 4));
  await db.delete(apdSummaryApprovals).where(eq(apdSummaryApprovals.summaryId, 4));
  await db.delete(approvals).where(and(isNotNull(approvals.apdSummaryId), eq(approvals.apdSummaryId, 4)));
  await db.delete(apdSummaries).where(eq(apdSummaries.id, 4));
  console.log('Deleted summary 4 (unmapped items).');
}
main().then(() => process.exit(0));
