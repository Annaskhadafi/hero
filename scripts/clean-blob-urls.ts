import { db } from "../db"
import { warehouseRepairItems } from "../db/schema/warehouse-repair"
import { sql, like } from "drizzle-orm"

async function cleanBlobUrls() {
  console.log("Cleaning temporary blob URLs from database...")
  const res = await db
    .update(warehouseRepairItems)
    .set({ photoUrl: "" })
    .where(like(warehouseRepairItems.photoUrl, "blob:%"))
  console.log("Cleaned temporary blob URLs successfully!")
  process.exit(0)
}

cleanBlobUrls().catch((err) => {
  console.error("Error cleaning blob URLs:", err)
  process.exit(1)
})
