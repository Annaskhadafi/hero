import { db } from '../db';
import { apdSummaries, apdSummaryApprovals } from '../db/schema/apd-summary';
import { eq } from 'drizzle-orm';

async function main() {
  const [summary] = await db.select({
    id: apdSummaries.id,
    status: apdSummaries.status,
    submitterSignatureUrl: apdSummaries.submitterSignatureUrl,
  }).from(apdSummaries).where(eq(apdSummaries.id, 3));
  
  console.log('Summary:', JSON.stringify(summary, null, 2));
  
  const approvals = await db.select().from(apdSummaryApprovals).where(eq(apdSummaryApprovals.summaryId, 3));
  console.log('Approvals:', JSON.stringify(approvals.map(a => ({ level: a.level, status: a.status, signatureUrl: a.signatureUrl ? a.signatureUrl.substring(0, 50) + '...' : null })), null, 2));
}
main().then(() => process.exit(0));
