import { db } from "./db/index.js"
import { sql } from "drizzle-orm"

async function main() {
  try {
    await db.execute(sql`DROP TABLE IF EXISTS "hero_service360_employee_prices";`)
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_service360_employee_levels" (
        "employee_id" integer PRIMARY KEY NOT NULL REFERENCES "hero_employees"("id") ON DELETE cascade,
        "level" integer DEFAULT 1 NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `)
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_service360_rate_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "site_id" integer NOT NULL REFERENCES "hero_sites"("id") ON DELETE cascade,
        "level" integer NOT NULL,
        "price" numeric(15, 2) DEFAULT '0' NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `)
    
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "hero_service360_rate_settings_site_level_idx" 
      ON "hero_service360_rate_settings" ("site_id", "level");
    `)
    
    console.log("Tables created successfully")
  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}
main()
