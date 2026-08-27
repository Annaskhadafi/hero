import { db } from '@/db';
import { approvals, apdRequests } from '@/db/schema/hero';
import { eq, inArray } from 'drizzle-orm';

async function main() {
  const badIds = [108, 97, 83, 56];
  
  console.log('Cancelling approvals:', badIds);
  
  for (const id of badIds) {
    const [approval] = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
    if (!approval) {
      console.log(`  #${id}: NOT FOUND`);
      continue;
    }
    
    // Update approval status to cancelled
    await db.update(approvals).set({ status: 'cancel' }).where(eq(approvals.id, id));
    console.log(`  #${id}: Approval cancelled (was level ${approval.level}, APD: ${approval.apdRequestId})`);
    
    // If this was level 1, also cancel the APD request
    if (approval.level === 1 && approval.apdRequestId) {
      await db.update(apdRequests).set({ status: 'cancel' }).where(eq(apdRequests.id, approval.apdRequestId));
      console.log(`    → APD Request ${approval.apdRequestId} also cancelled`);
    }
  }
  
  console.log('\nDone! All bad route approvals cancelled.');
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
