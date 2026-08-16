import * as path from "path";
import * as xlsx from "xlsx";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  warehouseRepairItemTypes,
  warehouseRepairUnits,
  warehouseRepairItems,
} from "../db/schema/warehouse-repair";

// Load environment variables
require("dotenv").config();

async function main() {
  const excelPath = "D:\\Stock Repair\\Bahasa Material.xlsx";
  console.log(`[Seed] Reading Excel file from: ${excelPath}`);
  
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[1]; // Sheet2
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[] = xlsx.utils.sheet_to_json(worksheet);

  console.log(`[Seed] Found ${jsonData.length} rows in ${sheetName}`);

  // 1. Process and cache Types/Categories
  console.log("[Seed] Processing item categories/types...");
  const categories = Array.from(
    new Set(
      jsonData
        .map((row) => (row["Category"] ? String(row["Category"]).trim() : "Accessories"))
    )
  );

  const categoryMap = new Map<string, number>();
  for (const cat of categories) {
    // Check if category exists
    let existing = await db
      .select()
      .from(warehouseRepairItemTypes)
      .where(eq(warehouseRepairItemTypes.typeName, cat))
      .limit(1);

    if (existing.length > 0) {
      categoryMap.set(cat, existing[0].id);
    } else {
      // Create new type code based on string hashing or simple prefix
      const typeCode = "CAT-" + cat.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
      const inserted = await db
        .insert(warehouseRepairItemTypes)
        .values({
          typeCode,
          typeName: cat,
          isActive: true,
        })
        .returning({ id: warehouseRepairItemTypes.id });
      categoryMap.set(cat, inserted[0].id);
    }
  }

  // 2. Process and cache Units/UOMs
  console.log("[Seed] Processing units/UOMs...");
  const uoms = Array.from(
    new Set(
      jsonData
        .map((row) => (row["UOM"] ? String(row["UOM"]).trim() : "PC"))
    )
  );

  const uomMap = new Map<string, number>();
  for (const uom of uoms) {
    let existing = await db
      .select()
      .from(warehouseRepairUnits)
      .where(eq(warehouseRepairUnits.unitName, uom))
      .limit(1);

    if (existing.length > 0) {
      uomMap.set(uom, existing[0].id);
    } else {
      const unitCode = "U-" + uom.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
      const inserted = await db
        .insert(warehouseRepairUnits)
        .values({
          unitCode,
          unitName: uom,
          isActive: true,
        })
        .returning({ id: warehouseRepairUnits.id });
      uomMap.set(uom, inserted[0].id);
    }
  }

  // 3. Process Items
  console.log("[Seed] Processing items...");
  let count = 0;
  for (const row of jsonData) {
    const itemCode = row["Material Number"] ? String(row["Material Number"]).trim() : null;
    if (!itemCode) continue;

    const rawName = row["Nama"] ? String(row["Nama"]).trim() : "";
    const rawDesc = row["Material Desc"] ? String(row["Material Desc"]).trim() : "";
    const itemName = rawName || rawDesc || "Unnamed Item";
    const qty = typeof row["Qty"] === "number" ? row["Qty"] : parseInt(row["Qty"]) || 0;
    const cat = row["Category"] ? String(row["Category"]).trim() : "Accessories";
    const uom = row["UOM"] ? String(row["UOM"]).trim() : "PC";

    const typeId = categoryMap.get(cat) || null;
    const unitId = uomMap.get(uom) || null;

    const sLoc = row["S-Loc"] ? String(row["S-Loc"]).trim() : "";
    const sLocDesc = row["S-Loc Description"] ? String(row["S-Loc Description"]).trim() : "";

    // Check if item exists
    const existingItem = await db
      .select()
      .from(warehouseRepairItems)
      .where(eq(warehouseRepairItems.itemCode, itemCode))
      .limit(1);

    if (existingItem.length > 0) {
      // Update existing item
      await db
        .update(warehouseRepairItems)
        .set({
          itemName,
          materialDesc: rawDesc,
          storageLocation: sLoc,
          storageLocationDesc: sLocDesc,
          typeId,
          unitId,
          stock: qty, // overwrite or update to Excel stock
          updatedAt: new Date(),
        })
        .where(eq(warehouseRepairItems.itemCode, itemCode));
    } else {
      // Insert new item
      await db
        .insert(warehouseRepairItems)
        .values({
          itemCode,
          itemName,
          materialDesc: rawDesc,
          storageLocation: sLoc,
          storageLocationDesc: sLocDesc,
          typeId,
          unitId,
          stock: qty,
          minimumStock: 0,
          photoUrl: "",
          isActive: true,
        });
    }
    count++;
  }

  console.log(`[Seed] Successfully processed ${count} items.`);
}

main()
  .then(() => {
    console.log("[Seed] Completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Seed] Error:", err);
    process.exit(1);
  });
