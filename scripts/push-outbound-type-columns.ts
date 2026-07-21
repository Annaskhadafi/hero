import { db } from "../db"
import { sql } from "drizzle-orm"

async function pushColumns() {
  console.log("Adding outbound_type, destination_sloc, destination_sloc_desc columns...")
  await db.execute(sql`
    ALTER TABLE hero_warehouse_repair_outbound 
    ADD COLUMN IF NOT EXISTS outbound_type text NOT NULL DEFAULT 'Pemakaian Internal',
    ADD COLUMN IF NOT EXISTS destination_sloc text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS destination_sloc_desc text NOT NULL DEFAULT '';
  `)
  console.log("Columns added successfully!")
  process.exit(0)
}

pushColumns().catch((err) => {
  console.error("Error adding columns:", err)
  process.exit(1)
})
