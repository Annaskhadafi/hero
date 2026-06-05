import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Adding onboarding fields to hero_hc_candidates...");
  try {
    const queries = [
      `ALTER TABLE "hero_hc_candidates" ADD COLUMN IF NOT EXISTS "onboarding_token" text;`,
      `ALTER TABLE "hero_hc_candidates" ADD CONSTRAINT "hero_hc_candidates_onboarding_token_unique" UNIQUE ("onboarding_token");`,
      `ALTER TABLE "hero_hc_candidates" ADD COLUMN IF NOT EXISTS "nik_ktp" text;`,
      `ALTER TABLE "hero_hc_candidates" ADD COLUMN IF NOT EXISTS "npwp_number" text;`,
      `ALTER TABLE "hero_hc_candidates" ADD COLUMN IF NOT EXISTS "bpjs_kesehatan" text;`,
      `ALTER TABLE "hero_hc_candidates" ADD COLUMN IF NOT EXISTS "bpjs_ketenagakerjaan" text;`,
      `ALTER TABLE "hero_hc_candidates" ADD COLUMN IF NOT EXISTS "bank_name" text;`,
      `ALTER TABLE "hero_hc_candidates" ADD COLUMN IF NOT EXISTS "bank_account_number" text;`,
      `ALTER TABLE "hero_hc_candidates" ADD COLUMN IF NOT EXISTS "emergency_contact_name" text;`,
      `ALTER TABLE "hero_hc_candidates" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" text;`
    ];
    
    for (const q of queries) {
      try {
        await db.execute(sql.raw(q));
      } catch (e) {
        console.log("Skipped/Failed:", e.message);
      }
    }
    
    console.log("Added onboarding columns!");
  } catch(e) { console.log(e.message); }
  process.exit(0);
}
run();
