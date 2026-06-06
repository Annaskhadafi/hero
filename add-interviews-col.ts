import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Adding missing column result to hero_hc_candidate_interviews...");
  try {
    await db.execute(sql`ALTER TABLE "hero_hc_candidate_interviews" ADD COLUMN IF NOT EXISTS "result" text DEFAULT 'Pending' NOT NULL;`);
    console.log("Added result column");
  } catch(e: any) { console.log(e.message); }
  process.exit(0);
}
run();
