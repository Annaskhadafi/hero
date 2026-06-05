import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";

async function main() {
  console.log("Applying manual migrations...");
  try {
    await db.execute(sql`
      ALTER TABLE hero_hc_candidates ADD COLUMN IF NOT EXISTS ai_score integer;
      ALTER TABLE hero_hc_candidates ADD COLUMN IF NOT EXISTS ai_summary text NOT NULL DEFAULT '';
      ALTER TABLE hero_hc_candidates ADD COLUMN IF NOT EXISTS ai_assessment_date timestamp;
    `);
    
    // Also try to fix the offboarding_request_id if needed, but it might just be the column renaming.
    // If it's a rename, we can do it:
    try {
      await db.execute(sql`ALTER TABLE hero_hc_clearance_items RENAME COLUMN offboarding_request_id TO offboarding_id;`);
      console.log("Renamed offboarding_request_id to offboarding_id");
    } catch (e) {
      // Column might already be renamed or doesn't exist
      console.log("Skip rename (already done or table missing)");
    }

    console.log("Migrations applied successfully!");
  } catch (error) {
    console.error("Failed to apply migrations:", error);
  }
  process.exit(0);
}

main();
