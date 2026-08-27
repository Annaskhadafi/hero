import { db } from '../db';
import { apdSummaryApprovals } from '../db/schema/apd-summary';
import { approvals } from '../db/schema/hero';
import { eq, and, isNotNull } from 'drizzle-orm';

async function main() {
  // Get all hero_approvals for summary 5 with signatures
  const heroRows = await db.select({ 
    level: approvals.level, 
    signatureUrl: approvals.signatureUrl 
  }).from(approvals)
    .where(and(isNotNull(approvals.apdSummaryId), eq(approvals.apdSummaryId, 5)));

  for (const hero of heroRows) {
    if (hero.signatureUrl) {
      await db.update(apdSummaryApprovals)
        .set({ signatureUrl: hero.signatureUrl })
        .where(and(eq(apdSummaryApprovals.summaryId, 5), eq(apdSummaryApprovals.level, hero.level)));
      console.log(`Fixed level ${hero.level}: ${hero.signatureUrl.substring(0, 50)}...`);
    }
  }

  // Verify
  const sumRows = await db.select().from(apdSummaryApprovals).where(eq(apdSummaryApprovals.summaryId, 5));
  for (const r of sumRows) {
    console.log(`Level ${r.level}: sig=${r.signatureUrl ? 'OK' : 'NULL'}, date=${r.reviewedAt}`);
  }
}
main().then(() => process.exit(0));
