import { db } from "../db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating table hero_employee_assets...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_employee_assets (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
      item_category TEXT NOT NULL DEFAULT 'APD',
      item_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
      next_replacement_due TIMESTAMP,
      last_request_id INTEGER REFERENCES hero_apd_requests(id) ON DELETE SET NULL,
      remarks TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Done.");
  process.exit(0);
}

run().catch(console.error);
