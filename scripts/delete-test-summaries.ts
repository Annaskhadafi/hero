import { db } from '../db';
import { apdSummaries, apdSummaryItems, apdSummaryApprovals } from '../db/schema/apd-summary';
import { approvals } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  // Delete all summary data
  const deletedItems = await db.delete(apdSummaryItems);
  console.log('Deleted summary items:', deletedItems.rowCount);
  
  const deletedApprovals = await db.delete(apdSummaryApprovals);
  console.log('Deleted summary approvals:', deletedApprovals.rowCount);
  
  const deletedApprovals2 = await db.delete(approvals).where(eq(approvals.status, 'pending'));
  console.log('Deleted hero_approvals pending:', deletedApprovals2.rowCount);
  
  const deletedSummaries = await db.delete(apdSummaries);
  console.log('Deleted summaries:', deletedSummaries.rowCount);
  
  console.log('\nSemua data summary test sudah dihapus!');
}
main().catch(console.error).finally(() => process.exit(0));
