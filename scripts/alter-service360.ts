import { db } from "../db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Altering table...");
  await db.execute(sql`
    ALTER TABLE hero_service360_quotation_items ADD COLUMN IF NOT EXISTS is_backup boolean DEFAULT false NOT NULL;
    ALTER TABLE hero_service360_quotation_items ADD COLUMN IF NOT EXISTS backup_start_date date;
    ALTER TABLE hero_service360_quotation_items ADD COLUMN IF NOT EXISTS backup_end_date date;
    ALTER TABLE hero_service360_quotation_items ADD COLUMN IF NOT EXISTS backup_month_period text;
    ALTER TABLE hero_service360_quotation_items ADD COLUMN IF NOT EXISTS backup_level text;
    ALTER TABLE hero_service360_quotation_items ADD COLUMN IF NOT EXISTS backup_description text;
    ALTER TABLE hero_service360_quotation_items ADD COLUMN IF NOT EXISTS backup_price numeric(15, 2) DEFAULT '0' NOT NULL;
  `);
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
