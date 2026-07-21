import { db } from "../db"
import { sql } from "drizzle-orm"

async function pushColumns() {
  console.log("Adding target_sloc and target_sloc_desc columns to hero_warehouse_repair_inbound...")
  await db.execute(sql`
    ALTER TABLE hero_warehouse_repair_inbound 
    ADD COLUMN IF NOT EXISTS target_sloc text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS target_sloc_desc text NOT NULL DEFAULT '';
  `)
  console.log("Columns added successfully!")
  process.exit(0)
}

pushColumns().catch((err) => {
  console.error("Error adding columns:", err)
  process.exit(1)
})
