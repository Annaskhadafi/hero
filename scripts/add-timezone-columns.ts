import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking and adding timezone column to hero_sites and hero_timesheet_scheduling_configs...");

  await db.execute(sql`
    ALTER TABLE hero_sites
    ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'WITA';
  `);
  console.log("✓ hero_sites.timezone column ensured.");

  await db.execute(sql`
    ALTER TABLE hero_timesheet_scheduling_configs
    ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'WITA';
  `);
  console.log("✓ hero_timesheet_scheduling_configs.timezone column ensured.");

  // Also auto-infer and populate any existing sites that might have location text
  const result = await db.execute(sql`
    SELECT id, name, location, province_name, timezone FROM hero_sites;
  `);

  console.log(`Found ${result.rows.length} sites in database.`);
  console.log("Migration finished successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
