import { sql } from "drizzle-orm"
import { db } from "../db"

async function run() {
  console.log("Checking and migrating hero_employees business card columns...")
  try {
    await db.execute(sql`
      ALTER TABLE "hero_employees"
        ADD COLUMN IF NOT EXISTS "business_card_public_enabled" boolean NOT NULL DEFAULT false;
    `)
    console.log("Added column business_card_public_enabled (if not exists)")

    await db.execute(sql`
      ALTER TABLE "hero_employees"
        ADD COLUMN IF NOT EXISTS "business_card_public_token" text;
    `)
    console.log("Added column business_card_public_token (if not exists)")

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "hero_employees_business_card_public_token_uq"
        ON "hero_employees" USING btree ("business_card_public_token");
    `)
    console.log("Created index hero_employees_business_card_public_token_uq (if not exists)")

    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'hero_employees' 
        AND column_name IN ('business_card_public_enabled', 'business_card_public_token');
    `)
    console.log("Verification result:", result)
    console.log("Migration finished successfully!")
  } catch (error) {
    console.error("Migration error:", error)
  }
  process.exit(0)
}

run()
