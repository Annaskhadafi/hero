import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";

async function main() {
  console.log("Applying manual migrations for recruitments...");
  try {
    await db.execute(sql`
      ALTER TABLE hero_hc_recruitments ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
      ALTER TABLE hero_hc_recruitments ADD COLUMN IF NOT EXISTS job_description text NOT NULL DEFAULT '';
      ALTER TABLE hero_hc_recruitments ADD COLUMN IF NOT EXISTS requirements text NOT NULL DEFAULT '';
    `);
    
    console.log("Migrations applied successfully!");
  } catch (error) {
    console.error("Failed to apply migrations:", error);
  }
  process.exit(0);
}

main();
