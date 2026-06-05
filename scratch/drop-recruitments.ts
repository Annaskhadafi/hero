import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";

async function main() {
  console.log("Dropping recruitment tables...");
  try {
    await db.execute(sql`
      DROP TABLE IF EXISTS hero_hc_candidate_stages CASCADE;
      DROP TABLE IF EXISTS hero_hc_candidates CASCADE;
      DROP TABLE IF EXISTS hero_hc_recruitments CASCADE;
    `);
    
    console.log("Tables dropped successfully!");
  } catch (error) {
    console.error("Failed to drop tables:", error);
  }
  process.exit(0);
}

main();
