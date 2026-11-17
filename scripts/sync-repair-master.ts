import "dotenv/config"
import { db } from "../db"
import { repairMasterItems, repairMasterSites } from "../db/schema/repair-master"
import { DEFAULT_REPAIR_SITES, normalizeRepairMasterCode } from "../lib/repair-master"
import { parseBahasaMaterialExcel } from "../lib/bahasa-material"

async function main() {
  console.log("=== SYNCHRONIZING REPAIR MASTER DATA ===")

  // 1. Sync 14 sites
  console.log(`Syncing ${DEFAULT_REPAIR_SITES.length} default repair sites...`)
  for (const [index, site] of DEFAULT_REPAIR_SITES.entries()) {
    await db
      .insert(repairMasterSites)
      .values({
        siteCode: site.siteCode,
        siteName: site.siteName,
        sortOrder: index + 1,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: repairMasterSites.siteCode,
        set: {
          siteName: site.siteName,
          sortOrder: index + 1,
          updatedAt: new Date(),
        },
      })
  }
  const sitesInDb = await db.select().from(repairMasterSites)
  console.log(`Verified ${sitesInDb.length} sites in database:`)
  sitesInDb.forEach((s) => console.log(`  [${s.siteCode}] -> ${s.siteName}`))

  // 2. Sync Bahasa Material items
  const parsedItems = parseBahasaMaterialExcel()
  console.log(`\nParsed ${parsedItems.length} items from public/Bahasa Material.xlsx...`)

  let count = 0
  for (const [index, item] of parsedItems.entries()) {
    const materialCode = normalizeRepairMasterCode(item.materialCode)
    await db
      .insert(repairMasterItems)
      .values({
        materialCode,
        materialName: item.materialName.trim(),
        valuationStockValue: item.valuationStockValue || null,
        currency: item.currency || "USD",
        valuatedStock: item.valuatedStock || null,
        uom: item.uom ? item.uom.toUpperCase() : "PC",
        category: item.category || null,
        smu: item.smu || null,
        defaultQty: item.defaultQty || null,
        standardTime: item.standardTime || null,
        notes: item.notes || null,
        isActive: true,
        sortOrder: index + 1,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: repairMasterItems.materialCode,
        set: {
          materialName: item.materialName.trim(),
          valuationStockValue: item.valuationStockValue || null,
          currency: item.currency || "USD",
          uom: item.uom ? item.uom.toUpperCase() : "PC",
          category: item.category || null,
          notes: item.notes || null,
          sortOrder: index + 1,
          updatedAt: new Date(),
        },
      })
    count++
  }

  const itemsInDb = await db.select().from(repairMasterItems)
  console.log(`\nSuccessfully synchronized ${count} items. Total items in DB: ${itemsInDb.length}`)
  console.log("Sample 5 items in DB:")
  itemsInDb.slice(0, 5).forEach((item) => {
    console.log(`  [${item.materialCode}] ${item.materialName} | ${item.category} | ${item.notes} | Qty: ${item.valuationStockValue} ${item.uom}`)
  })

  console.log("\n=== SYNC COMPLETE ===")
  process.exit(0)
}

main().catch((err) => {
  console.error("Sync failed:", err)
  process.exit(1)
})
