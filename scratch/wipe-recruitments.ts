import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";

async function main() {
  console.log("Wiping recruitment tables...");
  try {
    await db.execute(sql`
      TRUNCATE TABLE hero_hc_candidates CASCADE;
      TRUNCATE TABLE hero_hc_recruitments CASCADE;
    `);
    
    console.log("Tables wiped successfully!");
  } catch (error) {
    console.error("Failed to wipe tables:", error);
  }
  process.exit(0);
}

main();
