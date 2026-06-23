import { db } from "@/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating hero_hc_leader_performance table if not exists...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_hc_leader_performance (
      id SERIAL PRIMARY KEY,
      leader_sn TEXT NOT NULL,
      reviewer_sn TEXT,
      period TEXT NOT NULL,
      survey_score INTEGER NOT NULL DEFAULT 0,
      response_time_score INTEGER NOT NULL DEFAULT 3,
      leadership_score INTEGER NOT NULL DEFAULT 3,
      overall_score DECIMAL(3, 2) NOT NULL DEFAULT 0,
      feedback TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log("✅ Table hero_hc_leader_performance created (or already exists).");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
