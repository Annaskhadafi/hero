import { db } from "../db"
import { sql } from "drizzle-orm"

async function run() {
  console.log("Creating hero_warehouse_repair_transfers table if not exists...")
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_warehouse_repair_transfers (
      id SERIAL PRIMARY KEY,
      transaction_no TEXT NOT NULL UNIQUE,
      transaction_date DATE NOT NULL,
      item_id INTEGER NOT NULL REFERENCES hero_warehouse_repair_items(id) ON DELETE CASCADE,
      from_sloc TEXT NOT NULL,
      from_sloc_desc TEXT NOT NULL,
      to_sloc TEXT NOT NULL,
      to_sloc_desc TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)
  console.log("Table hero_warehouse_repair_transfers created successfully!")
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
