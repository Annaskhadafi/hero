import { db } from "@/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Fixing NOT NULL constraints on old columns...");

  // Make old leader_id and reviewer_id nullable so new SN-based inserts work
  await db.execute(sql`
    ALTER TABLE hero_hc_leader_performance
    ALTER COLUMN leader_id DROP NOT NULL;
  `);
  console.log("✅ leader_id is now nullable.");

  // Verify constraints
  const result = await db.execute(sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'hero_hc_leader_performance'
    ORDER BY ordinal_position;
  `);
  console.log("\nFinal column constraints:");
  console.table(result.rows);

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
