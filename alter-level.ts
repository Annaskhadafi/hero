import { db } from "./db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Altering level columns to text...");
  await db.execute(sql`ALTER TABLE hero_service360_employee_levels ALTER COLUMN level TYPE text USING level::text`);
  await db.execute(sql`ALTER TABLE hero_service360_rate_settings ALTER COLUMN level TYPE text USING level::text`);
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
