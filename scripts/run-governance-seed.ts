import { ensureHeroGovernanceSeedData } from '../lib/hero-admin';
import { db } from '../db';
import { navbarMenuItems } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Running ensureHeroGovernanceSeedData()...');
  await ensureHeroGovernanceSeedData();
  console.log('Seed completed. Checking HRGA items:');

  const items = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, 'HRGA'))
    .orderBy(navbarMenuItems.sortOrder);

  console.log(`Current HRGA items count: ${items.length}`);
  for (const it of items) {
    console.log(`[${it.id}] sort=${it.sortOrder} grp='${it.groupLabel}' title='${it.title}' url='${it.url}'`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
