import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`ALTER TABLE "hero_hc_candidate_mcu" ADD COLUMN IF NOT EXISTS "result_notes" text DEFAULT '' NOT NULL;`);
    await db.execute(sql`ALTER TABLE "hero_hc_candidate_mcu" ADD COLUMN IF NOT EXISTS "result_file_url" text DEFAULT '' NOT NULL;`);
    console.log("Added missing columns!");
  } catch(e) { console.log(e.message); }
  process.exit(0);
}
run();
