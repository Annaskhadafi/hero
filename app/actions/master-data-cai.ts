"use server"

import { asc, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { repairMasterCai } from "@/db/schema/form-wo"
import { INITIAL_KPC_CAI, INITIAL_OTHER_CAI } from "@/lib/constants/master-cai-initial"

const FORM_WO_PATH = "/dashboard/repair-retread/form-wo"

let _tableEnsured = false

async function ensureMasterCaiTable() {
  if (_tableEnsured) return
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "repair_master_cai" (
        "id" serial PRIMARY KEY NOT NULL,
        "customer" varchar(255) DEFAULT 'OTHER CUSTOMER' NOT NULL,
        "size" varchar(100) NOT NULL,
        "brand" varchar(100),
        "cai" varchar(100) NOT NULL,
        "type" varchar(50) DEFAULT 'Tire Repair' NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    _tableEnsured = true

    // Check if table is empty, seed initial data
    const countRes = await db.select({ count: sql<number>`count(*)` }).from(repairMasterCai)
    const count = Number(countRes[0]?.count ?? 0)
    if (count === 0) {
      const allSeeds = [...INITIAL_KPC_CAI, ...INITIAL_OTHER_CAI].map((row, idx) => ({
        customer: row.customer,
        size: row.size,
        brand: row.brand,
        cai: row.cai,
        type: "Tire Repair",
        sortOrder: idx,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      await db.insert(repairMasterCai).values(allSeeds)
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("already exists") || msg.includes("duplicate key")) {
      _tableEnsured = true
      return
    }
    throw error
  }
}

const caiSchema = z.object({
  customer: z.string().optional().default("OTHER CUSTOMER"),
  size: z.string().optional().default("-"),
  brand: z.string().optional(),
  cai: z.string().optional().default("-"),
  type: z.string().optional().default("Tire Repair"),
})

export async function getMasterDataCaiList() {
  try {
    await ensureMasterCaiTable()
    const rows = await db.select().from(repairMasterCai).orderBy(asc(repairMasterCai.id))
    return rows
  } catch (error) {
    console.error("Failed to load Master Data CAI list:", error)
    return []
  }
}

export async function createMasterDataCai(data: z.infer<typeof caiSchema>) {
  try {
    await ensureMasterCaiTable()
    const parsed = caiSchema.parse(data)
    await db.insert(repairMasterCai).values({
      customer: parsed.customer?.trim() || "OTHER CUSTOMER",
      size: parsed.size?.trim() || "-",
      brand: parsed.brand?.trim() || null,
      cai: parsed.cai?.trim() || "-",
      type: parsed.type?.trim() || "Tire Repair",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Create Master Data CAI Error:", error)
    return { success: false, error: "Gagal menambahkan Master Data CAI" }
  }
}

export async function updateMasterDataCai(id: number, data: z.infer<typeof caiSchema>) {
  try {
    await ensureMasterCaiTable()
    const parsed = caiSchema.parse(data)
    await db
      .update(repairMasterCai)
      .set({
        customer: parsed.customer?.trim() || "OTHER CUSTOMER",
        size: parsed.size?.trim() || "-",
        brand: parsed.brand?.trim() || null,
        cai: parsed.cai?.trim() || "-",
        type: parsed.type?.trim() || "Tire Repair",
        updatedAt: new Date(),
      })
      .where(eq(repairMasterCai.id, id))

    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Update Master Data CAI Error:", error)
    return { success: false, error: "Gagal memperbarui Master Data CAI" }
  }
}

export async function deleteMasterDataCai(id: number) {
  try {
    await ensureMasterCaiTable()
    await db.delete(repairMasterCai).where(eq(repairMasterCai.id, id))
    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Delete Master Data CAI Error:", error)
    return { success: false, error: "Gagal menghapus Master Data CAI" }
  }
}
