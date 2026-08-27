import { db } from '../db';
import { apdRequestItems } from '../db/schema/apd';

async function main() {
  const items = await db.select({ itemType: apdRequestItems.itemType }).from(apdRequestItems);
  const unique = [...new Set(items.map(i => i.itemType))];
  console.log('Unique item types in DB:', unique);
}
main().then(() => process.exit(0));
