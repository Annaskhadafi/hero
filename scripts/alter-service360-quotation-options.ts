import { db } from "../db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`
    ALTER TABLE hero_service360_quotations
      ADD COLUMN IF NOT EXISTS hide_month_column boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS discount_type text,
      ADD COLUMN IF NOT EXISTS discount_value numeric(15, 2) NOT NULL DEFAULT '0';
  `);
  console.log("Service360 quotation options columns are ready");
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
