import { db } from '../db';
import { approvals } from '../db/schema/hero';
import { eq, and, isNotNull } from 'drizzle-orm';

async function main() {
  await db.delete(approvals).where(and(isNotNull(approvals.apdSummaryId), eq(approvals.apdSummaryId, 3)));
  console.log('Cleaned hero_approvals for summary 3');
}
main().then(() => process.exit(0));
