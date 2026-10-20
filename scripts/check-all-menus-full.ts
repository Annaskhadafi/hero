import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { ensureHeroGovernanceSeedData, syncMenuPermissionsMatrix } from "@/lib/hero-admin";

async function main() {
  console.log("Syncing governance seed and permissions matrix...");
  await ensureHeroGovernanceSeedData();
  await syncMenuPermissionsMatrix();
  
  const items = await db.select().from(navbarMenuItems).orderBy(navbarMenuItems.section, navbarMenuItems.sortOrder);
  console.log("Total menus after sync:", items.length);
  
  const bySection: Record<string, typeof items> = {};
  for (const item of items) {
    bySection[item.section] = bySection[item.section] || [];
    bySection[item.section].push(item);
  }
  
  for (const [sec, secItems] of Object.entries(bySection)) {
    console.log(`\n=== [${sec}] (${secItems.length} items) ===`);
    secItems.forEach(i => {
      console.log(`  ${i.sortOrder}. ${i.title} -> ${i.url} (area: ${i.menuArea}, visible: ${i.isVisible})`);
    });
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
