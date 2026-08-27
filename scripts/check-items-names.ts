import { db } from '../db';
import { apdRequestItems, apdRequests } from '../db/schema/hero';
import { eq, desc } from 'drizzle-orm';
async function main() {
  const items = await db.select({ itemType: apdRequestItems.itemType, quantity: apdRequestItems.quantity, requestId: apdRequestItems.requestId })
    .from(apdRequestItems).orderBy(desc(apdRequestItems.id)).limit(15);
  console.log('APD Request Items:');
  for (const i of items) {
    console.log(`  Request#${i.requestId} | ${i.itemType} x${i.quantity}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
