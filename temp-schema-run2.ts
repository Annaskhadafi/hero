import { db } from "./db/index.js"
import { sql } from "drizzle-orm"

async function main() {
  try {
    await db.execute(sql`DROP TABLE IF EXISTS "hero_service360_rate_settings";`)
    
    await db.execute(sql`
      CREATE TABLE "hero_service360_rate_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "work_location" text NOT NULL,
        "level" integer NOT NULL,
        "price" numeric(15, 2) DEFAULT '0' NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `)
    
    await db.execute(sql`
      CREATE UNIQUE INDEX "hero_service360_rate_settings_location_level_idx" 
      ON "hero_service360_rate_settings" ("work_location", "level");
    `)
    
    console.log("Table recreated successfully")
  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}
main()
