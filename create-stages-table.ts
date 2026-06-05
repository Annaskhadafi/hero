import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating hero_hc_candidate_stages...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_hc_candidate_stages" (
        "id" serial PRIMARY KEY NOT NULL,
        "candidate_id" integer NOT NULL,
        "stage" text NOT NULL,
        "notes" text DEFAULT '',
        "created_by_user_id" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Add unique constraint on manifest_number back just to keep DB schema correct
    try {
      await db.execute(sql`ALTER TABLE "hero_cargo_manifests" ADD CONSTRAINT "hero_cargo_manifests_manifest_number_unique" UNIQUE ("manifest_number");`);
    } catch(e) {} // Ignore if duplicates still exist
    
    console.log("Created table successfully");
  } catch(e) { console.log(e.message); }
  process.exit(0);
}
run();
