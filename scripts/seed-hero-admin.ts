import "dotenv/config";
import { ensureHeroGovernanceSeedData, ensureHeroSeedData } from "@/lib/hero-admin";

async function main() {
  await ensureHeroSeedData();
  await ensureHeroGovernanceSeedData();
  console.log("HERO admin seed completed.");
}

main().catch((error) => {
  console.error("HERO admin seed failed.", error);
  process.exit(1);
});
