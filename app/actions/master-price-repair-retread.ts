"use server"

import { asc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { repairMasterPrice, type RepairMasterPriceRecord } from "@/db/schema/repair-master-price"

const FORM_WO_PATH = "/dashboard/repair-retread/form-wo"

let _tableEnsured = false

export async function ensureRepairMasterPriceTable() {
  if (_tableEnsured) return
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "repair_master_price" (
        "id" serial PRIMARY KEY NOT NULL,
        "category" varchar(50) DEFAULT 'Repair' NOT NULL,
        "customer" varchar(255) DEFAULT 'OTHER CUSTOMER' NOT NULL,
        "site" varchar(255),
        "size" varchar(100) NOT NULL,
        "damage_type" varchar(50) DEFAULT 'R1' NOT NULL,
        "price" numeric(15, 2) DEFAULT '0' NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    _tableEnsured = true
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("already exists") || msg.includes("duplicate key")) {
      _tableEnsured = true
      return
    }
    throw error
  }
}

const priceMasterSchema = z.object({
  category: z.string().optional().default("Repair"),
  customer: z.string().optional().default("OTHER CUSTOMER"),
  site: z.string().optional().default(""),
  size: z.string().min(1, "Size Tire wajib diisi"),
  damageType: z.string().optional().default("R1"),
  price: z.string().optional().default("0"),
})

export async function getRepairMasterPriceList(): Promise<RepairMasterPriceRecord[]> {
  try {
    await ensureRepairMasterPriceTable()
    const rows = await db.select().from(repairMasterPrice).orderBy(asc(repairMasterPrice.id))
    return rows
  } catch (error) {
    console.error("Failed to load Repair Master Price list:", error)
    return []
  }
}

export async function createRepairMasterPrice(data: z.infer<typeof priceMasterSchema>) {
  try {
    await ensureRepairMasterPriceTable()
    const parsed = priceMasterSchema.parse(data)
    
    // Clean price string to number string
    const rawPrice = parsed.price.replace(/[^0-9.-]+/g, "")
    const numPrice = isNaN(parseFloat(rawPrice)) ? "0" : rawPrice

    await db.insert(repairMasterPrice).values({
      category: parsed.category?.trim() || "Repair",
      customer: parsed.customer?.trim() || "OTHER CUSTOMER",
      site: parsed.site?.trim() || "",
      size: parsed.size.trim(),
      damageType: parsed.damageType?.trim() || "R1",
      price: numPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Create Repair Master Price Error:", error)
    return { success: false, error: "Gagal menambahkan Master Price" }
  }
}

export async function updateRepairMasterPrice(id: number, data: z.infer<typeof priceMasterSchema>) {
  try {
    await ensureRepairMasterPriceTable()
    const parsed = priceMasterSchema.parse(data)
    
    const rawPrice = parsed.price.replace(/[^0-9.-]+/g, "")
    const numPrice = isNaN(parseFloat(rawPrice)) ? "0" : rawPrice

    await db
      .update(repairMasterPrice)
      .set({
        category: parsed.category?.trim() || "Repair",
        customer: parsed.customer?.trim() || "OTHER CUSTOMER",
        site: parsed.site?.trim() || "",
        size: parsed.size.trim(),
        damageType: parsed.damageType?.trim() || "R1",
        price: numPrice,
        updatedAt: new Date(),
      })
      .where(eq(repairMasterPrice.id, id))

    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Update Repair Master Price Error:", error)
    return { success: false, error: "Gagal memperbarui Master Price" }
  }
}

export async function deleteRepairMasterPrice(id: number) {
  try {
    await ensureRepairMasterPriceTable()
    await db.delete(repairMasterPrice).where(eq(repairMasterPrice.id, id))
    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Delete Repair Master Price Error:", error)
    return { success: false, error: "Gagal menghapus Master Price" }
  }
}

export async function bulkImportRepairMasterPrice(items: Array<{
  category?: string
  customer?: string
  site?: string
  size: string
  damageType?: string
  price?: string
}>) {
  try {
    await ensureRepairMasterPriceTable()
    if (!items.length) return { success: true, count: 0 }

    const valuesToInsert = items.map((item) => {
      const rawPrice = (item.price || "0").replace(/[^0-9.-]+/g, "")
      const numPrice = isNaN(parseFloat(rawPrice)) ? "0" : rawPrice
      return {
        category: item.category?.trim() || "Repair",
        customer: item.customer?.trim() || "OTHER CUSTOMER",
        site: item.site?.trim() || "",
        size: item.size.trim(),
        damageType: item.damageType?.trim() || "R1",
        price: numPrice,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })

    await db.insert(repairMasterPrice).values(valuesToInsert)
    revalidatePath(FORM_WO_PATH)
    return { success: true, count: valuesToInsert.length }
  } catch (error) {
    console.error("Bulk Import Repair Master Price Error:", error)
    return { success: false, error: "Gagal mengimpor Master Price" }
  }
}
