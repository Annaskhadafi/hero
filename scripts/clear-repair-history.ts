import { db } from "../db"
import { warehouseRepairInbound, warehouseRepairOutbound } from "../db/schema/warehouse-repair"

async function clearHistory() {
  console.log("Clearing warehouse repair inbound & outbound history...")
  await db.delete(warehouseRepairInbound)
  await db.delete(warehouseRepairOutbound)
  console.log("History cleared successfully!")
  process.exit(0)
}

clearHistory().catch((err) => {
  console.error("Error clearing history:", err)
  process.exit(1)
})
