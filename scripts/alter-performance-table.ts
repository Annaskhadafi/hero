import { db } from "@/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Altering hero_hc_leader_performance table...");
  
  const statements = [
    // Drop foreign key constraints first
    `ALTER TABLE hero_hc_leader_performance DROP CONSTRAINT IF EXISTS hero_hc_leader_performance_leader_id_hero_hr_employees_id_fk;`,
    `ALTER TABLE hero_hc_leader_performance DROP CONSTRAINT IF EXISTS hero_hc_leader_performance_reviewer_id_hero_hr_employees_id_fk;`,
    
    // Rename columns
    `ALTER TABLE hero_hc_leader_performance RENAME COLUMN leader_id TO leader_sn;`,
    `ALTER TABLE hero_hc_leader_performance RENAME COLUMN reviewer_id TO reviewer_sn;`,
    
    // Change types to text
    `ALTER TABLE hero_hc_leader_performance ALTER COLUMN leader_sn TYPE text;`,
    `ALTER TABLE hero_hc_leader_performance ALTER COLUMN reviewer_sn TYPE text;`
  ];

  for (const stmt of statements) {
    console.log("Executing:", stmt);
    try {
      await db.execute(sql.raw(stmt));
      console.log("Success");
    } catch (err: any) {
      console.error("Failed:", err.message);
    }
  }

  console.log("Done.");
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
