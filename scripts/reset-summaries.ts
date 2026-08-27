import { db } from '../db';
import { apdSummaries, apdSummaryItems, apdSummaryApprovals } from '../db/schema/apd-summary';
import { approvals } from '../db/schema/hero';
import { eq } from 'drizzle-orm';
async function main() {
  await db.delete(apdSummaryItems);
  await db.delete(apdSummaryApprovals);
  await db.delete(apdSummaries);
  // Delete pending summary approvals from hero_approvals
  const del = await db.delete(approvals).where(eq(approvals.status, 'pending'));
  console.log('Reset done. Deleted pending approvals:', del.rowCount);
}
main().catch(console.error).finally(() => process.exit(0));
