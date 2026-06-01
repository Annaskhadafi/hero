import { ensureHeroGovernanceSeedData } from "../lib/hero-admin";

async function syncMenu() {
  console.log("Seeding menus to database...");
  await ensureHeroGovernanceSeedData();
  console.log("Seeding complete. Check your menu!");
  process.exit(0);
}

syncMenu().catch(console.error);
