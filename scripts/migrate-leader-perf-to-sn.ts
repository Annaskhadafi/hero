import { db } from "@/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Migrating hero_hc_leader_performance table...");

  // Add new SN-based columns if they don't exist
  await db.execute(sql`
    ALTER TABLE hero_hc_leader_performance
    ADD COLUMN IF NOT EXISTS leader_sn TEXT,
    ADD COLUMN IF NOT EXISTS reviewer_sn TEXT;
  `);
  console.log("✅ Added leader_sn and reviewer_sn columns.");

  // Backfill leader_sn from leader_id via employees table
  await db.execute(sql`
    UPDATE hero_hc_leader_performance hlp
    SET leader_sn = e.employee_sn
    FROM hero_employees e
    WHERE hlp.leader_id = e.id
      AND hlp.leader_sn IS NULL;
  `);
  console.log("✅ Backfilled leader_sn from leader_id.");

  // Backfill reviewer_sn from reviewer_id via employees table
  await db.execute(sql`
    UPDATE hero_hc_leader_performance hlp
    SET reviewer_sn = e.employee_sn
    FROM hero_employees e
    WHERE hlp.reviewer_id = e.id
      AND hlp.reviewer_sn IS NULL;
  `);
  console.log("✅ Backfilled reviewer_sn from reviewer_id.");

  // Make leader_sn NOT NULL (after backfill, set a default for any null)
  await db.execute(sql`
    UPDATE hero_hc_leader_performance
    SET leader_sn = 'UNKNOWN'
    WHERE leader_sn IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE hero_hc_leader_performance
    ALTER COLUMN leader_sn SET NOT NULL;
  `);
  console.log("✅ Set leader_sn NOT NULL.");

  // Verify final columns
  const result = await db.execute(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'hero_hc_leader_performance'
    ORDER BY ordinal_position;
  `);
  console.log("\nFinal columns:");
  console.table(result.rows);

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration error:", err);
  process.exit(1);
});
