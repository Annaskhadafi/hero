import { db } from '../db';
import { apdSummaryItems } from '../db/schema/apd-summary';

async function main() {
  const items = await db.select().from(apdSummaryItems);
  for (const item of items) {
    console.log(`SummaryID: ${item.summaryId}, Employee: ${item.employeeName}, Item: "${item.itemName}", Qty: ${item.quantity}`);
  }
  if (items.length === 0) console.log('No summary items found');
}
main().then(() => process.exit(0));
