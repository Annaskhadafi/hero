import { db } from '../db';
import { apdSummaryApprovals } from '../db/schema/apd-summary';
import { eq } from 'drizzle-orm';

async function main() {
  const rows = await db.select().from(apdSummaryApprovals).where(eq(apdSummaryApprovals.summaryId, 5));
  for (const r of rows) {
    console.log(`Level: ${r.level} (type: ${typeof r.level}), Status: ${r.status}, Sig: ${r.signatureUrl || 'NULL'}`);
  }
}
main().then(() => process.exit(0));
