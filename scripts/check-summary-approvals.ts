import { db } from '../db';
import { approvals } from '../db/schema/hero';
import { isNotNull } from 'drizzle-orm';

async function main() {
  const rows = await db.select({
    id: approvals.id,
    apdSummaryId: approvals.apdSummaryId,
    apdRequestId: approvals.apdRequestId,
    status: approvals.status,
    approverName: approvals.approverName,
  }).from(approvals).where(isNotNull(approvals.apdSummaryId));

  console.log('Summary approval rows:', JSON.stringify(rows, null, 2));
  
  // Also check all pending approvals
  const allPending = await db.select({
    id: approvals.id,
    apdSummaryId: approvals.apdSummaryId,
    apdRequestId: approvals.apdRequestId,
    status: approvals.status,
    activityType: approvals.activityType,
  }).from(approvals).where(isNotNull(approvals.apdSummaryId));

  console.log('\nAll rows with apdSummaryId:', allPending.length);
}
main().then(() => process.exit(0));
