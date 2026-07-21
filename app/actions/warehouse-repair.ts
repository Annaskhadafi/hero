"use server"

import { eq, sql, and, gte, lte, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  warehouseRepairItemTypes,
  warehouseRepairUnits,
  warehouseRepairItems,
  warehouseRepairInbound,
  warehouseRepairOutbound,
  warehouseRepairTransfers,
} from "@/db/schema/warehouse-repair"
import { getS3ObjectReadUrl } from "@/lib/s3-storage"

// Revalidation paths
const REVAL_PATHS = [
  "/dashboard/warehouse-repair",
  "/dashboard/warehouse-repair/barang",
  "/dashboard/warehouse-repair/jenis",
  "/dashboard/warehouse-repair/satuan",
  "/dashboard/warehouse-repair/barang-masuk",
  "/dashboard/warehouse-repair/barang-keluar",
  "/dashboard/warehouse-repair/laporan-stok",
  "/dashboard/warehouse-repair/laporan-barang-masuk",
  "/dashboard/warehouse-repair/laporan-barang-keluar",
]

function revalidateAll() {
  for (const path of REVAL_PATHS) {
    revalidatePath(path)
  }
}

// 1. Fetch Types
export async function getWarehouseRepairTypes() {
  try {
    const rows = await db
      .select()
      .from(warehouseRepairItemTypes)
      .orderBy(warehouseRepairItemTypes.typeName)
    return rows
  } catch (error) {
    console.error("[Postgres] Error fetching types:", error)
    return []
  }
}

// 2. Fetch Units
export async function getWarehouseRepairUnits() {
  try {
    const rows = await db
      .select()
      .from(warehouseRepairUnits)
      .orderBy(warehouseRepairUnits.unitName)
    return rows
  } catch (error) {
    console.error("[Postgres] Error fetching units:", error)
    return []
  }
}

// 3. Fetch Items (with category/unit names joined)
export async function getWarehouseRepairItems() {
  try {
    const rows = await db
      .select({
        id: warehouseRepairItems.id,
        itemCode: warehouseRepairItems.itemCode,
        itemName: warehouseRepairItems.itemName,
        materialDesc: warehouseRepairItems.materialDesc,
        storageLocation: warehouseRepairItems.storageLocation,
        storageLocationDesc: warehouseRepairItems.storageLocationDesc,
        typeId: warehouseRepairItems.typeId,
        typeName: warehouseRepairItemTypes.typeName,
        minimumStock: warehouseRepairItems.minimumStock,
        stock: warehouseRepairItems.stock,
        unitId: warehouseRepairItems.unitId,
        unitName: warehouseRepairUnits.unitName,
        photoUrl: warehouseRepairItems.photoUrl,
        isActive: warehouseRepairItems.isActive,
        createdAt: warehouseRepairItems.createdAt,
        updatedAt: warehouseRepairItems.updatedAt,
      })
      .from(warehouseRepairItems)
      .leftJoin(
        warehouseRepairItemTypes,
        eq(warehouseRepairItems.typeId, warehouseRepairItemTypes.id)
      )
      .leftJoin(
        warehouseRepairUnits,
        eq(warehouseRepairItems.unitId, warehouseRepairUnits.id)
      )
      .orderBy(desc(warehouseRepairItems.id))

    const items = rows.map((item) => ({
      ...item,
      photoUrl: item.photoUrl ? resolveUploadUrl(item.photoUrl) : "",
    }))

    return items
  } catch (error) {
    console.error("[Postgres] Error fetching items:", error)
    return []
  }
}

// 4. Fetch Inbound Transactions
export async function getWarehouseRepairInbound() {
  try {
    const rows = await db
      .select({
        id: warehouseRepairInbound.id,
        transactionNo: warehouseRepairInbound.transactionNo,
        transactionDate: warehouseRepairInbound.transactionDate,
        itemId: warehouseRepairInbound.itemId,
        itemCode: warehouseRepairItems.itemCode,
        materialDesc: warehouseRepairItems.materialDesc,
        itemName: warehouseRepairItems.itemName,
        typeName: warehouseRepairItemTypes.typeName,
        unitName: warehouseRepairUnits.unitName,
        storageLocation: warehouseRepairItems.storageLocation,
        storageLocationDesc: warehouseRepairItems.storageLocationDesc,
        quantity: warehouseRepairInbound.quantity,
        note: warehouseRepairInbound.note,
        createdAt: warehouseRepairInbound.createdAt,
      })
      .from(warehouseRepairInbound)
      .leftJoin(
        warehouseRepairItems,
        eq(warehouseRepairInbound.itemId, warehouseRepairItems.id)
      )
      .leftJoin(
        warehouseRepairItemTypes,
        eq(warehouseRepairItems.typeId, warehouseRepairItemTypes.id)
      )
      .leftJoin(
        warehouseRepairUnits,
        eq(warehouseRepairItems.unitId, warehouseRepairUnits.id)
      )
      .orderBy(desc(warehouseRepairInbound.transactionDate), desc(warehouseRepairInbound.id))
    return rows
  } catch (error) {
    console.error("[Postgres] Error fetching inbound transactions:", error)
    return []
  }
}

// 5. Fetch Outbound Transactions
export async function getWarehouseRepairOutbound() {
  try {
    const rows = await db
      .select({
        id: warehouseRepairOutbound.id,
        transactionNo: warehouseRepairOutbound.transactionNo,
        transactionDate: warehouseRepairOutbound.transactionDate,
        itemId: warehouseRepairOutbound.itemId,
        itemCode: warehouseRepairItems.itemCode,
        materialDesc: warehouseRepairItems.materialDesc,
        itemName: warehouseRepairItems.itemName,
        typeName: warehouseRepairItemTypes.typeName,
        unitName: warehouseRepairUnits.unitName,
        storageLocation: warehouseRepairItems.storageLocation,
        storageLocationDesc: warehouseRepairItems.storageLocationDesc,
        quantity: warehouseRepairOutbound.quantity,
        note: warehouseRepairOutbound.note,
        createdAt: warehouseRepairOutbound.createdAt,
      })
      .from(warehouseRepairOutbound)
      .leftJoin(
        warehouseRepairItems,
        eq(warehouseRepairOutbound.itemId, warehouseRepairItems.id)
      )
      .leftJoin(
        warehouseRepairItemTypes,
        eq(warehouseRepairItems.typeId, warehouseRepairItemTypes.id)
      )
      .leftJoin(
        warehouseRepairUnits,
        eq(warehouseRepairItems.unitId, warehouseRepairUnits.id)
      )
      .orderBy(desc(warehouseRepairOutbound.transactionDate), desc(warehouseRepairOutbound.id))
    return rows
  } catch (error) {
    console.error("[Postgres] Error fetching outbound transactions:", error)
    return []
  }
}

// 6. Bulk Page Data
export async function getWarehouseRepairPageData() {
  const [items, types, units, inbound, outbound] = await Promise.all([
    getWarehouseRepairItems(),
    getWarehouseRepairTypes(),
    getWarehouseRepairUnits(),
    getWarehouseRepairInbound(),
    getWarehouseRepairOutbound(),
  ])
  return { items, types, units, inbound, outbound }
}

// 7. Dashboard Data
export async function getWarehouseRepairDashboardData() {
  const data = await getWarehouseRepairPageData()
  return {
    ...data,
    metrics: {
      items: data.items.length,
      lowStock: data.items.filter((i: any) => i.stock <= i.minimumStock).length,
      inbound: data.inbound.length,
      outbound: data.outbound.length,
      totalStock: data.items.reduce((s: number, i: any) => s + i.stock, 0),
    },
  }
}

// 8. Upsert Category/Type
export async function upsertWarehouseRepairType(input: any, id?: number) {
  try {
    const values = {
      typeCode: input.typeCode || `WR-TYP-${Math.floor(1000 + Math.random() * 9000)}`,
      typeName: input.typeName,
      isActive: input.isActive ?? true,
      updatedAt: new Date(),
    }
    if (id) {
      await db.update(warehouseRepairItemTypes).set(values).where(eq(warehouseRepairItemTypes.id, id))
    } else {
      await db.insert(warehouseRepairItemTypes).values(values)
    }
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error upserting type:", error)
    return { success: false, error: error.message || "Gagal menyimpan jenis barang" }
  }
}

// 9. Upsert Unit
export async function upsertWarehouseRepairUnit(input: any, id?: number) {
  try {
    const values = {
      unitCode: input.unitCode || `WR-UNT-${Math.floor(1000 + Math.random() * 9000)}`,
      unitName: input.unitName,
      isActive: input.isActive ?? true,
      updatedAt: new Date(),
    }
    if (id) {
      await db.update(warehouseRepairUnits).set(values).where(eq(warehouseRepairUnits.id, id))
    } else {
      await db.insert(warehouseRepairUnits).values(values)
    }
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error upserting unit:", error)
    return { success: false, error: error.message || "Gagal menyimpan satuan barang" }
  }
}

// 10. Upsert Item
export async function upsertWarehouseRepairItem(input: any, id?: number) {
  try {
    const values = {
      itemCode: input.itemCode || `WR-ITM-${Math.floor(1000 + Math.random() * 9000)}`,
      itemName: input.itemName,
      materialDesc: input.materialDesc || "",
      storageLocation: input.storageLocation || "",
      storageLocationDesc: input.storageLocationDesc || "",
      typeId: input.typeId,
      unitId: input.unitId,
      minimumStock: input.minimumStock ?? 0,
      photoUrl: (input.photoUrl ?? "").split("?")[0],
      isActive: input.isActive ?? true,
      updatedAt: new Date(),
    }
    if (id) {
      await db.update(warehouseRepairItems).set(values).where(eq(warehouseRepairItems.id, id))
    } else {
      await db.insert(warehouseRepairItems).values({ ...values, stock: 0 })
    }
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error upserting item:", error)
    return { success: false, error: error.message || "Gagal menyimpan barang" }
  }
}

// 11. Delete Type
export async function deleteWarehouseRepairType(id: number) {
  try {
    await db.delete(warehouseRepairItemTypes).where(eq(warehouseRepairItemTypes.id, id))
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting type:", error)
    return { success: false, error: error.message || "Gagal menghapus jenis barang" }
  }
}

// 12. Delete Unit
export async function deleteWarehouseRepairUnit(id: number) {
  try {
    await db.delete(warehouseRepairUnits).where(eq(warehouseRepairUnits.id, id))
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting unit:", error)
    return { success: false, error: error.message || "Gagal menghapus satuan barang" }
  }
}

// 13. Delete Item
export async function deleteWarehouseRepairItem(id: number) {
  try {
    await db.delete(warehouseRepairItems).where(eq(warehouseRepairItems.id, id))
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting item:", error)
    return { success: false, error: error.message || "Gagal menghapus barang" }
  }
}

// 14. Create Inbound
export async function createWarehouseRepairInbound(input: any) {
  try {
    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, input.itemId)).limit(1)
      if (!item) throw new Error("Barang tidak ditemukan")

      const transactionNo = `WR-IN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`
      
      await tx.insert(warehouseRepairInbound).values({
        transactionNo,
        transactionDate: input.transactionDate,
        itemId: input.itemId,
        quantity: input.quantity,
        note: input.note || "",
      })

      await tx
        .update(warehouseRepairItems)
        .set({
          stock: item.stock + input.quantity,
          updatedAt: new Date(),
        })
        .where(eq(warehouseRepairItems.id, input.itemId))
    })
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error creating inbound transaction:", error)
    return { success: false, error: error.message || "Gagal mencatat barang masuk" }
  }
}

// 15. Create Outbound
export async function createWarehouseRepairOutbound(input: any) {
  try {
    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, input.itemId)).limit(1)
      if (!item) throw new Error("Barang tidak ditemukan")

      const transactionNo = `WR-OUT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`
      
      await tx.insert(warehouseRepairOutbound).values({
        transactionNo,
        transactionDate: input.transactionDate,
        itemId: input.itemId,
        quantity: input.quantity,
        note: input.note || "",
      })

      await tx
        .update(warehouseRepairItems)
        .set({
          stock: item.stock - input.quantity,
          updatedAt: new Date(),
        })
        .where(eq(warehouseRepairItems.id, input.itemId))
    })
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error creating outbound transaction:", error)
    return { success: false, error: error.message || "Gagal mencatat barang keluar" }
  }
}

// 16. Update Inbound
export async function updateWarehouseRepairInbound(id: number, input: any) {
  try {
    await db.transaction(async (tx) => {
      const [oldTrx] = await tx.select().from(warehouseRepairInbound).where(eq(warehouseRepairInbound.id, id)).limit(1)
      if (!oldTrx) throw new Error("Transaksi tidak ditemukan")

      // Revert old quantity from old item
      const [oldItem] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, oldTrx.itemId)).limit(1)
      if (oldItem) {
        await tx
          .update(warehouseRepairItems)
          .set({ stock: oldItem.stock - oldTrx.quantity })
          .where(eq(warehouseRepairItems.id, oldTrx.itemId))
      }

      // Update the transaction details
      await tx
        .update(warehouseRepairInbound)
        .set({
          transactionDate: input.transactionDate,
          itemId: input.itemId,
          quantity: input.quantity,
          note: input.note || "",
        })
        .where(eq(warehouseRepairInbound.id, id))

      // Apply new quantity to new item
      const [newItem] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, input.itemId)).limit(1)
      if (!newItem) throw new Error("Barang baru tidak ditemukan")

      await tx
        .update(warehouseRepairItems)
        .set({
          stock: newItem.stock + input.quantity,
          updatedAt: new Date(),
        })
        .where(eq(warehouseRepairItems.id, input.itemId))
    })
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error updating inbound transaction:", error)
    return { success: false, error: error.message || "Gagal memperbarui barang masuk" }
  }
}

// 17. Update Outbound
export async function updateWarehouseRepairOutbound(id: number, input: any) {
  try {
    await db.transaction(async (tx) => {
      const [oldTrx] = await tx.select().from(warehouseRepairOutbound).where(eq(warehouseRepairOutbound.id, id)).limit(1)
      if (!oldTrx) throw new Error("Transaksi tidak ditemukan")

      // Revert old quantity from old item (since outbound reduces stock, revert adds it back)
      const [oldItem] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, oldTrx.itemId)).limit(1)
      if (oldItem) {
        await tx
          .update(warehouseRepairItems)
          .set({ stock: oldItem.stock + oldTrx.quantity })
          .where(eq(warehouseRepairItems.id, oldTrx.itemId))
      }

      // Update transaction details
      await tx
        .update(warehouseRepairOutbound)
        .set({
          transactionDate: input.transactionDate,
          itemId: input.itemId,
          quantity: input.quantity,
          note: input.note || "",
        })
        .where(eq(warehouseRepairOutbound.id, id))

      // Apply new quantity to new item
      const [newItem] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, input.itemId)).limit(1)
      if (!newItem) throw new Error("Barang baru tidak ditemukan")

      await tx
        .update(warehouseRepairItems)
        .set({
          stock: newItem.stock - input.quantity,
          updatedAt: new Date(),
        })
        .where(eq(warehouseRepairItems.id, input.itemId))
    })
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error updating outbound transaction:", error)
    return { success: false, error: error.message || "Gagal memperbarui barang keluar" }
  }
}

// 18. Delete Inbound
export async function deleteWarehouseRepairInbound(id: number) {
  try {
    await db.transaction(async (tx) => {
      const [trx] = await tx.select().from(warehouseRepairInbound).where(eq(warehouseRepairInbound.id, id)).limit(1)
      if (!trx) throw new Error("Transaksi tidak ditemukan")

      const [item] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, trx.itemId)).limit(1)
      if (item) {
        await tx
          .update(warehouseRepairItems)
          .set({
            stock: item.stock - trx.quantity,
            updatedAt: new Date(),
          })
          .where(eq(warehouseRepairItems.id, trx.itemId))
      }

      await tx.delete(warehouseRepairInbound).where(eq(warehouseRepairInbound.id, id))
    })
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting inbound transaction:", error)
    return { success: false, error: error.message || "Gagal menghapus barang masuk" }
  }
}

// 19. Delete Outbound
export async function deleteWarehouseRepairOutbound(id: number) {
  try {
    await db.transaction(async (tx) => {
      const [trx] = await tx.select().from(warehouseRepairOutbound).where(eq(warehouseRepairOutbound.id, id)).limit(1)
      if (!trx) throw new Error("Transaksi tidak ditemukan")

      const [item] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, trx.itemId)).limit(1)
      if (item) {
        await tx
          .update(warehouseRepairItems)
          .set({
            stock: item.stock + trx.quantity,
            updatedAt: new Date(),
          })
          .where(eq(warehouseRepairItems.id, trx.itemId))
      }

      await tx.delete(warehouseRepairOutbound).where(eq(warehouseRepairOutbound.id, id))
    })
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting outbound transaction:", error)
    return { success: false, error: error.message || "Gagal menghapus barang keluar" }
  }
}

// 20. Stock Report
export async function getWarehouseRepairStockReport(filter: "all" | "minimum" = "all") {
  const items = await getWarehouseRepairItems()
  return filter === "minimum" ? items.filter((i: any) => i.stock <= i.minimumStock) : items
}

// 21. Inbound Report with Date Filter
export async function getWarehouseRepairInboundReport(start?: string, end?: string) {
  try {
    let query = db
      .select({
        id: warehouseRepairInbound.id,
        transactionNo: warehouseRepairInbound.transactionNo,
        transactionDate: warehouseRepairInbound.transactionDate,
        itemCode: warehouseRepairItems.itemCode,
        materialDesc: warehouseRepairItems.materialDesc,
        itemName: warehouseRepairItems.itemName,
        typeName: warehouseRepairItemTypes.typeName,
        unitName: warehouseRepairUnits.unitName,
        storageLocation: warehouseRepairItems.storageLocation,
        storageLocationDesc: warehouseRepairItems.storageLocationDesc,
        quantity: warehouseRepairInbound.quantity,
        note: warehouseRepairInbound.note,
      })
      .from(warehouseRepairInbound)
      .leftJoin(
        warehouseRepairItems,
        eq(warehouseRepairInbound.itemId, warehouseRepairItems.id)
      )
      .leftJoin(
        warehouseRepairItemTypes,
        eq(warehouseRepairItems.typeId, warehouseRepairItemTypes.id)
      )
      .leftJoin(
        warehouseRepairUnits,
        eq(warehouseRepairItems.unitId, warehouseRepairUnits.id)
      )

    const conditions = []
    if (start) {
      conditions.push(gte(warehouseRepairInbound.transactionDate, start))
    }
    if (end) {
      conditions.push(lte(warehouseRepairInbound.transactionDate, end))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    const rows = await query.orderBy(desc(warehouseRepairInbound.transactionDate), desc(warehouseRepairInbound.id))
    return rows
  } catch (error) {
    console.error("[Postgres] Error fetching inbound report:", error)
    return []
  }
}

// 22. Outbound Report with Date Filter
export async function getWarehouseRepairOutboundReport(start?: string, end?: string) {
  try {
    let query = db
      .select({
        id: warehouseRepairOutbound.id,
        transactionNo: warehouseRepairOutbound.transactionNo,
        transactionDate: warehouseRepairOutbound.transactionDate,
        itemCode: warehouseRepairItems.itemCode,
        materialDesc: warehouseRepairItems.materialDesc,
        itemName: warehouseRepairItems.itemName,
        typeName: warehouseRepairItemTypes.typeName,
        unitName: warehouseRepairUnits.unitName,
        storageLocation: warehouseRepairItems.storageLocation,
        storageLocationDesc: warehouseRepairItems.storageLocationDesc,
        quantity: warehouseRepairOutbound.quantity,
        note: warehouseRepairOutbound.note,
      })
      .from(warehouseRepairOutbound)
      .leftJoin(
        warehouseRepairItems,
        eq(warehouseRepairOutbound.itemId, warehouseRepairItems.id)
      )
      .leftJoin(
        warehouseRepairItemTypes,
        eq(warehouseRepairItems.typeId, warehouseRepairItemTypes.id)
      )
      .leftJoin(
        warehouseRepairUnits,
        eq(warehouseRepairItems.unitId, warehouseRepairUnits.id)
      )

    const conditions = []
    if (start) {
      conditions.push(gte(warehouseRepairOutbound.transactionDate, start))
    }
    if (end) {
      conditions.push(lte(warehouseRepairOutbound.transactionDate, end))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    const rows = await query.orderBy(desc(warehouseRepairOutbound.transactionDate), desc(warehouseRepairOutbound.id))
    return rows
  } catch (error) {
    console.error("[Postgres] Error fetching outbound report:", error)
    return []
  }
}

// 23. Bulk Import Items from Excel/CSV mapped payload
export async function bulkImportWarehouseRepairItems(items: any[]) {
  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        // 1. Find or create category (type)
        let typeId = null;
        if (item.categoryName) {
          const cat = item.categoryName.trim();
          let [existingType] = await tx
            .select()
            .from(warehouseRepairItemTypes)
            .where(eq(warehouseRepairItemTypes.typeName, cat))
            .limit(1);
          if (existingType) {
            typeId = existingType.id;
          } else {
            const typeCode = "CAT-" + cat.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
            const [newType] = await tx
              .insert(warehouseRepairItemTypes)
              .values({ typeCode, typeName: cat, isActive: true })
              .returning({ id: warehouseRepairItemTypes.id });
            typeId = newType.id;
          }
        }

        // 2. Find or create unit (UOM)
        let unitId = null;
        if (item.unitName) {
          const uom = item.unitName.trim();
          let [existingUnit] = await tx
            .select()
            .from(warehouseRepairUnits)
            .where(eq(warehouseRepairUnits.unitName, uom))
            .limit(1);
          if (existingUnit) {
            unitId = existingUnit.id;
          } else {
            const unitCode = "U-" + uom.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
            const [newUnit] = await tx
              .insert(warehouseRepairUnits)
              .values({ unitCode, unitName: uom, isActive: true })
              .returning({ id: warehouseRepairUnits.id });
            unitId = newUnit.id;
          }
        }

        // 3. Upsert item
        const itemCode = item.itemCode ? String(item.itemCode).trim() : `WR-ITM-${Math.floor(1000 + Math.random() * 9000)}`;
        const itemName = item.itemName ? String(item.itemName).trim() : "Unnamed Item";
        const materialDesc = item.materialDesc ? String(item.materialDesc).trim() : "";
        const storageLocation = item.storageLocation ? String(item.storageLocation).trim() : "";
        const storageLocationDesc = item.storageLocationDesc ? String(item.storageLocationDesc).trim() : "";
        const minimumStock = typeof item.minimumStock === "number" ? item.minimumStock : parseInt(item.minimumStock) || 0;
        const stock = typeof item.stock === "number" ? item.stock : parseInt(item.stock) || 0;

        let [existingItem] = await tx
          .select()
          .from(warehouseRepairItems)
          .where(eq(warehouseRepairItems.itemCode, itemCode))
          .limit(1);

        if (existingItem) {
          await tx
            .update(warehouseRepairItems)
            .set({
              itemName,
              materialDesc,
              storageLocation,
              storageLocationDesc,
              typeId,
              unitId,
              stock,
              minimumStock,
              updatedAt: new Date(),
            })
            .where(eq(warehouseRepairItems.itemCode, itemCode));
        } else {
          await tx
            .insert(warehouseRepairItems)
            .values({
              itemCode,
              itemName,
              materialDesc,
              storageLocation,
              storageLocationDesc,
              typeId,
              unitId,
              stock,
              minimumStock,
              photoUrl: "",
              isActive: true,
            });
        }
      }
    });
    revalidateAll();
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk importing items:", error);
    return { success: false, error: error.message || "Gagal mengimport data barang" };
  }
}

// 24. Create Stock Transfer
export async function createWarehouseRepairTransfer(input: {
  transactionDate: string;
  itemId: number;
  fromSLoc: string;
  fromSLocDesc: string;
  toSLoc: string;
  toSLocDesc: string;
  quantity: number;
  note?: string;
  updateItemLocation?: boolean;
}) {
  try {
    await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(warehouseRepairItems)
        .where(eq(warehouseRepairItems.id, input.itemId))
        .limit(1)

      if (!item) throw new Error("Barang tidak ditemukan")
      if (item.stock < input.quantity) {
        throw new Error(`Stok tidak mencukupi (stok saat ini: ${item.stock})`)
      }

      const transactionNo = `WR-TRF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`

      // 1. Insert transfer log
      await tx.insert(warehouseRepairTransfers).values({
        transactionNo,
        transactionDate: input.transactionDate,
        itemId: input.itemId,
        fromSLoc: input.fromSLoc || item.storageLocation || "-",
        fromSLocDesc: input.fromSLocDesc || item.storageLocationDesc || "-",
        toSLoc: input.toSLoc,
        toSLocDesc: input.toSLocDesc,
        quantity: input.quantity,
        note: input.note || `Transfer dari ${input.fromSLoc || item.storageLocation} ke ${input.toSLoc}`,
      })

      // 2. Insert Outbound transaction for auditing
      const outboundNo = `WR-OUT-TRF-${Math.floor(10000 + Math.random() * 90000)}`
      await tx.insert(warehouseRepairOutbound).values({
        transactionNo: outboundNo,
        transactionDate: input.transactionDate,
        itemId: input.itemId,
        quantity: input.quantity,
        note: `Transfer ke ${input.toSLoc} (${input.toSLocDesc})`,
      })

      // 3. Deduct stock or update storage location
      const newStock = item.stock - input.quantity
      const updatePayload: any = {
        stock: newStock,
        updatedAt: new Date(),
      }

      if (input.updateItemLocation || newStock === 0) {
        updatePayload.storageLocation = input.toSLoc
        updatePayload.storageLocationDesc = input.toSLocDesc
      }

      await tx
        .update(warehouseRepairItems)
        .set(updatePayload)
        .where(eq(warehouseRepairItems.id, input.itemId))
    })

    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error("Error transferring stock:", error)
    return { success: false, error: error.message || "Gagal melakukan transfer stok" }
  }
}

// 25. Get Stock Transfers
export async function getWarehouseRepairTransfers() {
  try {
    const rows = await db
      .select({
        id: warehouseRepairTransfers.id,
        transactionNo: warehouseRepairTransfers.transactionNo,
        transactionDate: warehouseRepairTransfers.transactionDate,
        itemId: warehouseRepairTransfers.itemId,
        itemCode: warehouseRepairItems.itemCode,
        materialDesc: warehouseRepairItems.materialDesc,
        itemName: warehouseRepairItems.itemName,
        typeName: warehouseRepairItemTypes.typeName,
        unitName: warehouseRepairUnits.unitName,
        fromSLoc: warehouseRepairTransfers.fromSLoc,
        fromSLocDesc: warehouseRepairTransfers.fromSLocDesc,
        toSLoc: warehouseRepairTransfers.toSLoc,
        toSLocDesc: warehouseRepairTransfers.toSLocDesc,
        quantity: warehouseRepairTransfers.quantity,
        note: warehouseRepairTransfers.note,
        createdAt: warehouseRepairTransfers.createdAt,
      })
      .from(warehouseRepairTransfers)
      .leftJoin(
        warehouseRepairItems,
        eq(warehouseRepairTransfers.itemId, warehouseRepairItems.id)
      )
      .leftJoin(
        warehouseRepairItemTypes,
        eq(warehouseRepairItems.typeId, warehouseRepairItemTypes.id)
      )
      .leftJoin(
        warehouseRepairUnits,
        eq(warehouseRepairItems.unitId, warehouseRepairUnits.id)
      )
      .orderBy(desc(warehouseRepairTransfers.transactionDate), desc(warehouseRepairTransfers.id))
    return rows
  } catch (error) {
    console.error("[Postgres] Error fetching transfers:", error)
    return []
  }
}


