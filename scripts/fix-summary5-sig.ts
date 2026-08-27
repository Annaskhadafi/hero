import { db } from '../db';
import { apdSummaryApprovals } from '../db/schema/apd-summary';
import { approvals } from '../db/schema/hero';
import { eq, and, isNotNull } from 'drizzle-orm';

async function main() {
  // Get signatureUrl from hero_approvals level 1
  const [heroApproval] = await db.select({ signatureUrl: approvals.signatureUrl })
    .from(approvals)
    .where(and(isNotNull(approvals.apdSummaryId), eq(approvals.apdSummaryId, 5), eq(approvals.level, 1)));
  
  if (heroApproval?.signatureUrl) {
    // Update apdSummaryApprovals with the same signature
    await db.update(apdSummaryApprovals)
      .set({ signatureUrl: heroApproval.signatureUrl })
      .where(and(eq(apdSummaryApprovals.summaryId, 5), eq(apdSummaryApprovals.level, 1)));
    console.log('Fixed! Set apdSummaryApprovals sig to:', heroApproval.signatureUrl);
  } else {
    console.log('No signature found in hero_approvals for level 1');
  }
}
main().then(() => process.exit(0));
