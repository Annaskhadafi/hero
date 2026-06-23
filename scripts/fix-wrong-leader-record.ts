import { db } from "@/db";
import { sql } from "drizzle-orm";

async function run() {
  // Delete the wrong record (leader_sn = '164' = Zulfikar, reviewer_sn = '71261' = Annas)
  const result = await db.execute(sql`
    DELETE FROM hero_hc_leader_performance
    WHERE leader_sn = '164' AND reviewer_sn = '71261'
    RETURNING id, leader_sn, reviewer_sn, status;
  `);
  
  console.log("Deleted records:");
  console.table(result.rows);
  
  // Confirm remaining records
  const remaining = await db.execute(sql`
    SELECT id, leader_sn, reviewer_sn, period, status FROM hero_hc_leader_performance ORDER BY id;
  `);
  console.log("\nRemaining records:");
  console.table(remaining.rows);
  
  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
