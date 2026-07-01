import { db } from "./db/index.js"
import { sql } from "drizzle-orm"

async function main() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_service360_employee_prices" (
        "employee_id" integer PRIMARY KEY NOT NULL REFERENCES "hero_employees"("id") ON DELETE cascade,
        "price" numeric(15, 2) DEFAULT '0' NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `)
    console.log("Table created")
  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}
main()
