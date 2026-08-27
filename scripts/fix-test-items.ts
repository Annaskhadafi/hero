import { db } from '../db';
import { apdRequestItems } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

const ITEM_MAP: Record<string, string> = {
  'TES': 'Helmet',
  'BARANG': 'Safety Glasses',
  'Padlock Kuning': 'Safety Shoes',
  'Apron': 'Hand Glove (Kabel)',
  'Sisor': 'Masker Kain',
};

async function main() {
  const items = await db.select().from(apdRequestItems);
  let updated = 0;
  for (const item of items) {
    const newName = ITEM_MAP[item.itemType];
    if (newName) {
      await db.update(apdRequestItems).set({ itemType: newName }).where(eq(apdRequestItems.id, item.id));
      console.log(`#${item.id}: ${item.itemType} → ${newName}`);
      updated++;
    }
  }
  console.log(`\nUpdated ${updated} items`);
}
main().catch(console.error).finally(() => process.exit(0));
