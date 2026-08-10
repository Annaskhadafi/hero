"use server"

import { asc, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { repairFormWo, repairWipPo } from "@/db/schema/form-wo"
import type { WipRepairRecord } from "@/lib/types/wip-repair"

const FORM_WO_PATH = "/dashboard/repair-retread/form-wo"
const WIP_REPAIR_API_URL =
  process.env.WIP_REPAIR_API_URL ??
  "https://ics.chitraparatama.com/product/get_api.php?function=wo_repair"

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeValue(value: string | null | undefined) {
  return value?.trim() || "-"
}

function isWaitingWorkOrder(value: string | null | undefined) {
  return normalizeValue(value).toLowerCase() === "waiting wo"
}

// ponytail: singleton guard — avoids repeated DDL & concurrent race conditions
let _tableEnsured = false

async function ensureFormWoTable() {
  if (_tableEnsured) return
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "repair_form_wo" (
        "id" serial PRIMARY KEY NOT NULL,
        "id_wo" varchar(100),
        "tire_sn" varchar(100),
        "customer" varchar(255),
        "site" varchar(255),
        "store_loc" varchar(100),
        "brand" varchar(100),
        "pattern" varchar(100),
        "size" varchar(100),
        "injury" text,
        "job_type" varchar(100),
        "remark" text,
        "inspect_date" varchar(50),
        "inspector" varchar(255),
        "received_date" varchar(50),
        "receiver" varchar(255),
        "no_pengajuan" varchar(100) UNIQUE,
        "tanggal_pengajuan" timestamp DEFAULT now() NOT NULL,
        "pemohon" varchar(255),
        "catatan_pengajuan" text,
        "status_pengajuan" varchar(50) DEFAULT 'pending' NOT NULL,
        "no_wo_terbit" varchar(100),
        "tanggal_wo_terbit" timestamp,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_by" varchar(255),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "repair_wip_po" (
        "id_wo" varchar(100) PRIMARY KEY NOT NULL,
        "no_po" varchar(255) NOT NULL,
        "po_date" varchar(50),
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    _tableEnsured = true
    // Ensure new columns exist (idempotent ALTER)
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "jenis_pengajuan" varchar(50) DEFAULT 'repair' NOT NULL`)
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "deskripsi_pekerjaan" text`)
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "hari" varchar(50)`)
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "tanggal" varchar(50)`)
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "total_amount" varchar(100)`)
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "items" text`)
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "no_po" varchar(255)`)
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "tanggal_po" varchar(50)`)
    await db.execute(sql`ALTER TABLE "repair_wip_po" ADD COLUMN IF NOT EXISTS "po_date" varchar(50)`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("already exists") || msg.includes("duplicate key")) {
      _tableEnsured = true
      return
    }
    throw error
  }
}

async function generateNoPengajuan(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, "0")

  const result = await db
    .select({ id: repairFormWo.id })
    .from(repairFormWo)
    .orderBy(desc(repairFormWo.id))
    .limit(1)

  const lastId = result[0]?.id ?? 0
  const seq = String(lastId + 1).padStart(4, "0")

  return `FRMWO/${year}/${month}/${seq}`
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const formWoCreateSchema = z.object({
  jenisPengajuan: z.enum(["repair", "service", "non_repair"]).optional().default("repair"),
  idWo: z.string().optional(),
  tireSn: z.string().optional(),
  customer: z.string().optional(),
  site: z.string().optional(),
  storeLoc: z.string().optional(),
  brand: z.string().optional(),
  pattern: z.string().optional(),
  size: z.string().optional(),
  injury: z.string().optional(),
  jobType: z.string().optional(),
  remark: z.string().optional(),
  deskripsiPekerjaan: z.string().optional(),
  inspectDate: z.string().optional(),
  inspector: z.string().optional(),
  receivedDate: z.string().optional(),
  receiver: z.string().optional(),
  pemohon: z.string().optional(),
  catatanPengajuan: z.string().optional(),
  createdBy: z.string().optional(),
  hari: z.string().optional(),
  tanggal: z.string().optional(),
  totalAmount: z.string().optional(),
  items: z.string().optional(),
  noPo: z.string().optional(),
  tanggalPo: z.string().optional(),
})

const formWoUpdateSchema = z.object({
  jenisPengajuan: z.enum(["repair", "service", "non_repair"]).optional(),
  idWo: z.string().optional(),
  tireSn: z.string().optional(),
  customer: z.string().optional(),
  site: z.string().optional(),
  storeLoc: z.string().optional(),
  brand: z.string().optional(),
  pattern: z.string().optional(),
  size: z.string().optional(),
  injury: z.string().optional(),
  jobType: z.string().optional(),
  remark: z.string().optional(),
  deskripsiPekerjaan: z.string().optional(),
  inspectDate: z.string().optional(),
  inspector: z.string().optional(),
  receivedDate: z.string().optional(),
  receiver: z.string().optional(),
  pemohon: z.string().optional(),
  catatanPengajuan: z.string().optional(),
  statusPengajuan: z.enum(["pending", "approved", "rejected", "diproses"]).optional(),
  noWoTerbit: z.string().optional(),
  hari: z.string().optional(),
  tanggal: z.string().optional(),
  totalAmount: z.string().optional(),
  items: z.string().optional(),
  noPo: z.string().optional(),
  tanggalPo: z.string().optional(),
})

// ─── Actions ────────────────────────────────────────────────────────────────

export async function saveWipPo(idWo: string, noPo: string, poDate?: string) {
  try {
    await ensureFormWoTable()
    const cleanId = idWo.trim()
    const cleanPo = noPo.trim()
    const cleanPoDate = poDate !== undefined ? poDate.trim() : ""
    await db.execute(sql`
      INSERT INTO "repair_wip_po" ("id_wo", "no_po", "po_date", "updated_at")
      VALUES (${cleanId}, ${cleanPo}, ${cleanPoDate}, NOW())
      ON CONFLICT ("id_wo") DO UPDATE SET "no_po" = ${cleanPo}, "po_date" = ${cleanPoDate}, "updated_at" = NOW()
    `)
    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Failed to save WIP PO:", error)
    return { success: false, error: "Gagal menyimpan Nomor PO & Tanggal PO" }
  }
}

export async function getWaitingWoFromApi(): Promise<WipRepairRecord[]> {
  try {
    const response = await fetch(WIP_REPAIR_API_URL, {
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      console.error(`Failed to fetch WIP Repair API: ${response.status}`)
      return []
    }

    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      console.error("Non-JSON response from WIP Repair API")
      return []
    }

    const payload = (await response.json()) as { data: WipRepairRecord[] }

    if (!payload || !Array.isArray(payload.data)) {
      return []
    }

    // Filter hanya yang "waiting wo"
    let waitingList = payload.data.filter((item) => isWaitingWorkOrder(item.wo))

    // Merge saved PO numbers & PO dates from database repair_wip_po
    try {
      await ensureFormWoTable()
      const savedPoList = await db.select().from(repairWipPo)
      const poMap = new Map(savedPoList.map((r) => [r.idWo, { noPo: r.noPo, poDate: r.poDate }]))
      waitingList = waitingList.map((item) => {
        const saved = poMap.get(item.id_wo)
        if (saved) {
          return {
            ...item,
            po: saved.noPo ?? "",
            po_date: saved.poDate ?? "",
          }
        }
        return {
          ...item,
          po: item.po ?? "",
          po_date: item.po_date ?? item.inspect_date ?? "",
        }
      })
    } catch (e) {
      console.error("Failed to merge saved WIP PO:", e)
    }

    return waitingList
  } catch (error) {
    console.error("Failed to fetch Waiting WO data", error)
    return []
  }
}

export async function getFormWoList() {
  try {
    await ensureFormWoTable()
    const rows = await db
      .select()
      .from(repairFormWo)
      .orderBy(desc(repairFormWo.createdAt))
    return rows
  } catch (error) {
    console.error("Failed to load Form WO list", error)
    return []
  }
}

export async function getFormWoStats() {
  try {
    await ensureFormWoTable()
    const rows = await db.select({ statusPengajuan: repairFormWo.statusPengajuan }).from(repairFormWo)
    const total = rows.length
    const pending = rows.filter((r) => r.statusPengajuan === "pending").length
    const approved = rows.filter((r) => r.statusPengajuan === "approved").length
    const diproses = rows.filter((r) => r.statusPengajuan === "diproses").length
    const rejected = rows.filter((r) => r.statusPengajuan === "rejected").length
    return { total, pending, approved, diproses, rejected }
  } catch (error) {
    console.error("Failed to load Form WO stats", error)
    return { total: 0, pending: 0, approved: 0, diproses: 0, rejected: 0 }
  }
}

export async function createFormWo(data: z.infer<typeof formWoCreateSchema>) {
  try {
    await ensureFormWoTable()
    const parsed = formWoCreateSchema.parse(data)
    const noPengajuan = await generateNoPengajuan()

    await db.insert(repairFormWo).values({
      ...parsed,
      noPengajuan,
      statusPengajuan: "pending",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    revalidatePath(FORM_WO_PATH)
    return { success: true, noPengajuan }
  } catch (error) {
    console.error("Create Form WO Error:", error)
    return { success: false, error: "Gagal membuat pengajuan WO" }
  }
}

export async function updateFormWo(id: number, data: z.infer<typeof formWoUpdateSchema>) {
  try {
    await ensureFormWoTable()
    const parsed = formWoUpdateSchema.parse(data)

    await db
      .update(repairFormWo)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(repairFormWo.id, id))

    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Update Form WO Error:", error)
    return { success: false, error: "Gagal memperbarui pengajuan WO" }
  }
}

export async function updateFormWoStatus(id: number, status: "pending" | "approved" | "rejected" | "diproses", noWoTerbit?: string) {
  try {
    await ensureFormWoTable()
    const values: Partial<typeof repairFormWo.$inferInsert> = {
      statusPengajuan: status,
      updatedAt: new Date(),
    }
    if (noWoTerbit) {
      values.noWoTerbit = noWoTerbit
      values.tanggalWoTerbit = new Date()
    }
    await db.update(repairFormWo).set(values).where(eq(repairFormWo.id, id))
    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Update Form WO Status Error:", error)
    return { success: false, error: "Gagal memperbarui status pengajuan" }
  }
}

export async function deleteFormWo(id: number) {
  try {
    await ensureFormWoTable()
    await db.delete(repairFormWo).where(eq(repairFormWo.id, id))
    revalidatePath(FORM_WO_PATH)
    return { success: true }
  } catch (error) {
    console.error("Delete Form WO Error:", error)
    return { success: false, error: "Gagal menghapus pengajuan WO" }
  }
}
