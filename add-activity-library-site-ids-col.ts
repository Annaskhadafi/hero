import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      ALTER TABLE "hero_activity_libraries"
      ADD COLUMN IF NOT EXISTS "site_ids" jsonb NOT NULL DEFAULT '[]'::jsonb;
    `);
    // Backfill existing single-site rows into the multi-site array column.
    await db.execute(sql`
      UPDATE "hero_activity_libraries"
      SET "site_ids" = jsonb_build_array("site_id")
      WHERE "site_id" IS NOT NULL
        AND ("site_ids" IS NULL OR jsonb_array_length("site_ids") = 0);
    `);
    console.log("Added hero_activity_libraries.site_ids and backfilled from site_id.");
  } catch (e: any) {
    console.log(e?.message ?? e);
  }
  process.exit(0);
}
run();
