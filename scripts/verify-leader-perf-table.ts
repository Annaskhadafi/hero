import { db } from "@/db";
import { sql } from "drizzle-orm";

async function run() {
  const result = await db.execute(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'hero_hc_leader_performance'
    ORDER BY ordinal_position;
  `);
  console.log("Columns in hero_hc_leader_performance:");
  console.table(result.rows);
  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
