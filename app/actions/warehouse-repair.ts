"use server"

import { eq, sql, and, or, gte, lte, desc } from "drizzle-orm"
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
import { resolveUploadUrl } from "@/lib/s3-storage"

// Revalidation paths
const REVAL_PATHS = [
  "/dashboard/cargo-manifest",
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
      .where(eq(warehouseRepairItems.isActive, true))
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
        targetSLoc: warehouseRepairInbound.targetSLoc,
        targetSLocDesc: warehouseRepairInbound.targetSLocDesc,
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
        outboundType: warehouseRepairOutbound.outboundType,
        destinationSLoc: warehouseRepairOutbound.destinationSLoc,
        destinationSLocDesc: warehouseRepairOutbound.destinationSLocDesc,
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
    const targetSLoc = input.targetSLoc || ""
    const targetSLocDesc = input.targetSLocDesc || ""

    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, input.itemId)).limit(1)
      if (!item) throw new Error("Barang tidak ditemukan")

      const transactionNo = `WR-IN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`
      
      await tx.insert(warehouseRepairInbound).values({
        transactionNo,
        transactionDate: input.transactionDate,
        itemId: input.itemId,
        quantity: input.quantity,
        targetSLoc,
        targetSLocDesc,
        note: input.note || "",
      })

      const updateData: any = {
        stock: item.stock + input.quantity,
        updatedAt: new Date(),
      }
      if (input.updateItemLocation && targetSLoc) {
        updateData.storageLocation = targetSLoc
        updateData.storageLocationDesc = targetSLocDesc
      }

      await tx
        .update(warehouseRepairItems)
        .set(updateData)
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
    const outboundType = input.outboundType || "Pemakaian Internal"
    const destinationSLoc = input.destinationSLoc || ""
    const destinationSLocDesc = input.destinationSLocDesc || ""

    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(warehouseRepairItems).where(eq(warehouseRepairItems.id, input.itemId)).limit(1)
      if (!item) throw new Error("Barang tidak ditemukan")

      const transactionNo = `WR-OUT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`
      
      await tx.insert(warehouseRepairOutbound).values({
        transactionNo,
        transactionDate: input.transactionDate,
        itemId: input.itemId,
        quantity: input.quantity,
        outboundType,
        destinationSLoc,
        destinationSLocDesc,
        note: input.note || "",
      })

      await tx
        .update(warehouseRepairItems)
        .set({
          stock: item.stock - input.quantity,
          updatedAt: new Date(),
        })
        .where(eq(warehouseRepairItems.id, input.itemId))

      if (outboundType === "Stock Transfer" && destinationSLoc) {
        // 1. Find or create destination item at destinationSLoc
        const [destItem] = await tx
          .select()
          .from(warehouseRepairItems)
          .where(
            and(
              eq(warehouseRepairItems.storageLocation, destinationSLoc),
              or(
                eq(warehouseRepairItems.itemCode, item.itemCode),
                eq(warehouseRepairItems.itemName, item.itemName)
              )
            )
          )
          .limit(1)

        let destItemId: number
        if (destItem) {
          destItemId = destItem.id
          await tx
            .update(warehouseRepairItems)
            .set({
              stock: destItem.stock + input.quantity,
              updatedAt: new Date(),
            })
            .where(eq(warehouseRepairItems.id, destItem.id))
        } else {
          const [insertedDest] = await tx
            .insert(warehouseRepairItems)
            .values({
              itemCode: item.itemCode,
              itemName: item.itemName,
              materialDesc: item.materialDesc,
              storageLocation: destinationSLoc,
              storageLocationDesc: destinationSLocDesc || destinationSLoc,
              typeId: item.typeId,
              unitId: item.unitId,
              minimumStock: item.minimumStock || 0,
              stock: input.quantity,
              photoUrl: item.photoUrl || "",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning({ id: warehouseRepairItems.id })
          destItemId = insertedDest.id
        }

        // 2. Insert into Inbound for destination SLoc
        await tx.insert(warehouseRepairInbound).values({
          transactionNo: `WR-IN-${transactionNo}`,
          transactionDate: input.transactionDate,
          itemId: destItemId,
          quantity: input.quantity,
          targetSLoc: destinationSLoc,
          targetSLocDesc: destinationSLocDesc,
          note: `Transfer masuk dari ${item.storageLocation || 'RS01'} (${transactionNo}): ${input.note || ''}`,
        })

        // 3. Insert transfer log
        await tx.insert(warehouseRepairTransfers).values({
          transactionNo: `TRF-${transactionNo}`,
          transactionDate: input.transactionDate,
          itemId: input.itemId,
          fromSLoc: item.storageLocation || "RS01",
          fromSLocDesc: item.storageLocationDesc || "Balikpapan",
          toSLoc: destinationSLoc,
          toSLocDesc: destinationSLocDesc,
          quantity: input.quantity,
          note: `Stock Transfer via Outbound: ${input.note || ""}`,
        })
      }
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

        if (trx.outboundType === "Stock Transfer" && trx.destinationSLoc) {
          const [destItem] = await tx
            .select()
            .from(warehouseRepairItems)
            .where(
              and(
                eq(warehouseRepairItems.storageLocation, trx.destinationSLoc),
                or(
                  eq(warehouseRepairItems.itemCode, item.itemCode),
                  eq(warehouseRepairItems.itemName, item.itemName)
                )
              )
            )
            .limit(1)

          if (destItem) {
            await tx
              .update(warehouseRepairItems)
              .set({
                stock: Math.max(0, destItem.stock - trx.quantity),
                updatedAt: new Date(),
              })
              .where(eq(warehouseRepairItems.id, destItem.id))
          }

          await tx
            .delete(warehouseRepairInbound)
            .where(eq(warehouseRepairInbound.transactionNo, `WR-IN-${trx.transactionNo}`))

          await tx
            .delete(warehouseRepairTransfers)
            .where(eq(warehouseRepairTransfers.transactionNo, `TRF-${trx.transactionNo}`))
        }
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

      // 3. Deduct stock from source item
      const newStock = item.stock - input.quantity
      await tx
        .update(warehouseRepairItems)
        .set({
          stock: newStock,
          storageLocation: input.fromSLoc || item.storageLocation || "RS01",
          storageLocationDesc: input.fromSLocDesc || item.storageLocationDesc || "CP Balikpapan",
          updatedAt: new Date(),
        })
        .where(eq(warehouseRepairItems.id, input.itemId))

      // 4. Increase / create stock at destination SLoc
      const [destItem] = await tx
        .select()
        .from(warehouseRepairItems)
        .where(
          and(
            eq(warehouseRepairItems.storageLocation, input.toSLoc),
            or(
              eq(warehouseRepairItems.itemCode, item.itemCode),
              eq(warehouseRepairItems.itemName, item.itemName)
            )
          )
        )
        .limit(1)

      let destItemId: number
      if (destItem) {
        destItemId = destItem.id
        await tx
          .update(warehouseRepairItems)
          .set({
            stock: destItem.stock + input.quantity,
            updatedAt: new Date(),
          })
          .where(eq(warehouseRepairItems.id, destItem.id))
      } else {
        const [insertedDest] = await tx
          .insert(warehouseRepairItems)
          .values({
            itemCode: item.itemCode,
            itemName: item.itemName,
            materialDesc: item.materialDesc,
            storageLocation: input.toSLoc,
            storageLocationDesc: input.toSLocDesc,
            typeId: item.typeId,
            unitId: item.unitId,
            minimumStock: item.minimumStock || 0,
            stock: input.quantity,
            photoUrl: item.photoUrl || "",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: warehouseRepairItems.id })
        destItemId = insertedDest.id
      }

      // 5. Insert Inbound transaction for destination SLoc
      const inboundNo = `WR-IN-TRF-${Math.floor(10000 + Math.random() * 90000)}`
      await tx.insert(warehouseRepairInbound).values({
        transactionNo: inboundNo,
        transactionDate: input.transactionDate,
        itemId: destItemId,
        quantity: input.quantity,
        targetSLoc: input.toSLoc,
        targetSLocDesc: input.toSLocDesc,
        note: `Transfer masuk dari ${input.fromSLoc || item.storageLocation || "RS01"}`,
      })
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

// 26. Helper: Transfer stock between S-Locs (bidirectional: deduct source, add destination, record outbound, inbound, transfer)
export type TransferBetweenSLocsItem = {
  itemCode?: string
  itemName?: string
  materialDesc?: string
  qty: number
  sourceItemId?: number
  no?: number
  remark?: string
}

export type TransferBetweenSLocsOptions = {
  fromSLoc: string
  fromSLocDesc: string
  toSLoc: string
  toSLocDesc: string
  transactionDate?: string
  referenceType?: "cargo_manifest" | "manual_transfer"
  referenceNo: string // e.g. "CM-000329"
  items: TransferBetweenSLocsItem[]
  note?: string
}

export async function transferStockBetweenSLocs(
  txOrDb: any,
  options: TransferBetweenSLocsOptions
) {
  const dateValue = options.transactionDate || new Date().toISOString().slice(0, 10)
  const now = new Date()
  const results = []

  for (let i = 0; i < options.items.length; i++) {
    const item = options.items[i]
    if (!item.qty || item.qty <= 0) continue

    // 1. Find source item at fromSLoc
    let sourceItem = null

    if (item.sourceItemId) {
      const [found] = await txOrDb
        .select()
        .from(warehouseRepairItems)
        .where(eq(warehouseRepairItems.id, item.sourceItemId))
        .limit(1)
      sourceItem = found
    }

    if (!sourceItem) {
      // Search matching fromSLoc
      const candidates = await txOrDb
        .select()
        .from(warehouseRepairItems)
        .where(
          and(
            eq(warehouseRepairItems.isActive, true),
            or(
              eq(warehouseRepairItems.storageLocation, options.fromSLoc),
              sql`${warehouseRepairItems.storageLocation} IS NULL AND ${options.fromSLoc === "RS01"}`
            )
          )
        )

      sourceItem = candidates.find((c: any) => {
        if (item.itemCode && c.itemCode?.toLowerCase() === item.itemCode.toLowerCase()) return true
        if (item.itemName && c.itemName?.toLowerCase() === item.itemName.toLowerCase()) return true
        if (item.materialDesc && c.materialDesc?.toLowerCase() === item.materialDesc.toLowerCase()) return true
        return false
      })

      // If still not found, search regardless of location
      if (!sourceItem) {
        const allItems = await txOrDb
          .select()
          .from(warehouseRepairItems)
          .where(eq(warehouseRepairItems.isActive, true))

        sourceItem = allItems.find((c: any) => {
          if (item.itemCode && c.itemCode?.toLowerCase() === item.itemCode.toLowerCase()) return true
          if (item.itemName && c.itemName?.toLowerCase() === item.itemName.toLowerCase()) return true
          if (item.materialDesc && c.materialDesc?.toLowerCase() === item.materialDesc.toLowerCase()) return true
          return false
        })
      }
    }

    let sourceItemId: number
    if (sourceItem) {
      sourceItemId = sourceItem.id
      const newStock = Math.max(0, sourceItem.stock - item.qty)
      await txOrDb
        .update(warehouseRepairItems)
        .set({
          stock: newStock,
          storageLocation: options.fromSLoc,
          storageLocationDesc: options.fromSLocDesc,
          updatedAt: now,
        })
        .where(eq(warehouseRepairItems.id, sourceItem.id))
    } else {
      // Create placeholder source item with 0 stock
      const cleanCode = item.itemCode || `ITM-${Math.floor(1000 + Math.random() * 9000)}`
      const cleanName = item.itemName || item.materialDesc || "Barang Transfer"
      const [newSource] = await txOrDb
        .insert(warehouseRepairItems)
        .values({
          itemCode: cleanCode,
          itemName: cleanName,
          materialDesc: item.materialDesc || cleanName,
          storageLocation: options.fromSLoc,
          storageLocationDesc: options.fromSLocDesc,
          minimumStock: 0,
          stock: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: warehouseRepairItems.id })
      sourceItemId = newSource.id
      sourceItem = {
        id: sourceItemId,
        itemCode: cleanCode,
        itemName: cleanName,
        materialDesc: item.materialDesc || cleanName,
        typeId: null,
        unitId: null,
        photoUrl: "",
        minimumStock: 0,
      }
    }

    // 2. Find or create destination item at toSLoc
    const [destItem] = await txOrDb
      .select()
      .from(warehouseRepairItems)
      .where(
        and(
          eq(warehouseRepairItems.storageLocation, options.toSLoc),
          or(
            eq(warehouseRepairItems.itemCode, sourceItem.itemCode),
            eq(warehouseRepairItems.itemName, sourceItem.itemName)
          )
        )
      )
      .limit(1)

    let destItemId: number
    if (destItem) {
      destItemId = destItem.id
      await txOrDb
        .update(warehouseRepairItems)
        .set({
          stock: destItem.stock + item.qty,
          updatedAt: now,
        })
        .where(eq(warehouseRepairItems.id, destItem.id))
    } else {
      const [newDest] = await txOrDb
        .insert(warehouseRepairItems)
        .values({
          itemCode: sourceItem.itemCode,
          itemName: sourceItem.itemName,
          materialDesc: sourceItem.materialDesc,
          storageLocation: options.toSLoc,
          storageLocationDesc: options.toSLocDesc,
          typeId: sourceItem.typeId,
          unitId: sourceItem.unitId,
          minimumStock: sourceItem.minimumStock || 0,
          stock: item.qty,
          photoUrl: sourceItem.photoUrl || "",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: warehouseRepairItems.id })
      destItemId = newDest.id
    }

    // 3. Insert or update Outbound transaction (Barang Keluar)
    const cleanRef = options.referenceNo.replace(/[^a-zA-Z0-9-]/g, "_")
    const itemSeq = item.no || i + 1
    const outboundTxNo = `WR-OUT-${cleanRef}-${itemSeq}`
    const noteText =
      options.note ||
      `Transfer ke ${options.toSLoc} (${options.toSLocDesc}) via ${options.referenceNo}`

    const [existingOut] = await txOrDb
      .select({ id: warehouseRepairOutbound.id })
      .from(warehouseRepairOutbound)
      .where(eq(warehouseRepairOutbound.transactionNo, outboundTxNo))
      .limit(1)

    if (existingOut) {
      await txOrDb
        .update(warehouseRepairOutbound)
        .set({
          quantity: item.qty,
          itemId: sourceItemId,
          destinationSLoc: options.toSLoc,
          destinationSLocDesc: options.toSLocDesc,
          note: noteText,
        })
        .where(eq(warehouseRepairOutbound.id, existingOut.id))
    } else {
      await txOrDb.insert(warehouseRepairOutbound).values({
        transactionNo: outboundTxNo,
        transactionDate: dateValue,
        itemId: sourceItemId,
        quantity: item.qty,
        outboundType: "Stock Transfer",
        destinationSLoc: options.toSLoc,
        destinationSLocDesc: options.toSLocDesc,
        note: noteText,
        createdAt: now,
      })
    }

    // 4. Insert or update Inbound transaction (Barang Masuk)
    const inboundTxNo = `WR-IN-${cleanRef}-${itemSeq}`
    const inNoteText = `Transfer masuk dari ${options.fromSLoc} (${options.fromSLocDesc}) via ${options.referenceNo}`

    const [existingIn] = await txOrDb
      .select({ id: warehouseRepairInbound.id })
      .from(warehouseRepairInbound)
      .where(eq(warehouseRepairInbound.transactionNo, inboundTxNo))
      .limit(1)

    if (existingIn) {
      await txOrDb
        .update(warehouseRepairInbound)
        .set({
          quantity: item.qty,
          itemId: destItemId,
          targetSLoc: options.toSLoc,
          targetSLocDesc: options.toSLocDesc,
          note: inNoteText,
        })
        .where(eq(warehouseRepairInbound.id, existingIn.id))
    } else {
      await txOrDb.insert(warehouseRepairInbound).values({
        transactionNo: inboundTxNo,
        transactionDate: dateValue,
        itemId: destItemId,
        quantity: item.qty,
        targetSLoc: options.toSLoc,
        targetSLocDesc: options.toSLocDesc,
        note: inNoteText,
        createdAt: now,
      })
    }

    // 5. Insert or update Transfer record
    const transferTxNo = `WR-TRF-${cleanRef}-${itemSeq}`
    const [existingTrf] = await txOrDb
      .select({ id: warehouseRepairTransfers.id })
      .from(warehouseRepairTransfers)
      .where(eq(warehouseRepairTransfers.transactionNo, transferTxNo))
      .limit(1)

    if (existingTrf) {
      await txOrDb
        .update(warehouseRepairTransfers)
        .set({
          quantity: item.qty,
          itemId: sourceItemId,
          fromSLoc: options.fromSLoc,
          fromSLocDesc: options.fromSLocDesc,
          toSLoc: options.toSLoc,
          toSLocDesc: options.toSLocDesc,
          note: `Stock Transfer via ${options.referenceNo}`,
        })
        .where(eq(warehouseRepairTransfers.id, existingTrf.id))
    } else {
      await txOrDb.insert(warehouseRepairTransfers).values({
        transactionNo: transferTxNo,
        transactionDate: dateValue,
        itemId: sourceItemId,
        fromSLoc: options.fromSLoc,
        fromSLocDesc: options.fromSLocDesc,
        toSLoc: options.toSLoc,
        toSLocDesc: options.toSLocDesc,
        quantity: item.qty,
        note: `Stock Transfer via ${options.referenceNo}`,
        createdAt: now,
      })
    }

    results.push({ sourceItemId, destItemId, qty: item.qty })
  }

  return results
}

// 27. Helper: Revert stock transfer for a reference number
export async function revertStockTransferForReference(txOrDb: any, referenceNo: string) {
  const cleanRef = referenceNo.replace(/[^a-zA-Z0-9-]/g, "_")

  // 1. Revert outbounds
  const outbounds = await txOrDb
    .select()
    .from(warehouseRepairOutbound)
    .where(sql`${warehouseRepairOutbound.transactionNo} LIKE ${`WR-OUT-${cleanRef}-%`}`)

  for (const out of outbounds) {
    const [sourceItem] = await txOrDb
      .select()
      .from(warehouseRepairItems)
      .where(eq(warehouseRepairItems.id, out.itemId))
      .limit(1)

    if (sourceItem) {
      await txOrDb
        .update(warehouseRepairItems)
        .set({
          stock: sourceItem.stock + out.quantity,
          updatedAt: new Date(),
        })
        .where(eq(warehouseRepairItems.id, sourceItem.id))
    }
  }

  // 2. Revert inbounds
  const inbounds = await txOrDb
    .select()
    .from(warehouseRepairInbound)
    .where(sql`${warehouseRepairInbound.transactionNo} LIKE ${`WR-IN-${cleanRef}-%`}`)

  for (const inb of inbounds) {
    const [destItem] = await txOrDb
      .select()
      .from(warehouseRepairItems)
      .where(eq(warehouseRepairItems.id, inb.itemId))
      .limit(1)

    if (destItem) {
      await txOrDb
        .update(warehouseRepairItems)
        .set({
          stock: Math.max(0, destItem.stock - inb.quantity),
          updatedAt: new Date(),
        })
        .where(eq(warehouseRepairItems.id, destItem.id))
    }
  }

  // 3. Delete transaction logs
  await txOrDb
    .delete(warehouseRepairOutbound)
    .where(sql`${warehouseRepairOutbound.transactionNo} LIKE ${`WR-OUT-${cleanRef}-%`}`)

  await txOrDb
    .delete(warehouseRepairInbound)
    .where(sql`${warehouseRepairInbound.transactionNo} LIKE ${`WR-IN-${cleanRef}-%`}`)

  await txOrDb
    .delete(warehouseRepairTransfers)
    .where(sql`${warehouseRepairTransfers.transactionNo} LIKE ${`WR-TRF-${cleanRef}-%`}`)
}

