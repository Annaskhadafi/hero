import "dotenv/config";
import { getSidebarDataForUser } from "../lib/hero-admin";

async function main() {
  console.log("Triggering menu sync...");
  // this will trigger ensureHeroGovernanceSeedData which checks and seeds missing menus
  await getSidebarDataForUser("admin@chitraparatama.co.id");
  console.log("Sync complete!");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
