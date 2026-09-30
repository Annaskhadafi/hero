"use server"

import { desc } from "drizzle-orm"
import { db } from "@/db"
import { tireRepairInspections, tireRepairJobcards } from "@/db/schema/tire-repair"
import type {
  WipRepairApiResponse,
  WipRepairRecord,
  WipRepairWorkOrderDetailApiResponse,
  WipRepairWorkOrderDetailRecord,
} from "@/lib/types/wip-repair"
import { isVisibleWipRepairRecord, isVisibleWipRepairWorkOrderDetail } from "@/lib/wip-repair-visibility"
const WIP_REPAIR_API_URL =
  process.env.WIP_REPAIR_API_URL ??
  "https://ics.chitraparatama.com/product/get_api.php?function=wo_repair"

const WIP_REPAIR_WORK_ORDER_DETAIL_API_URL =
  process.env.WIP_REPAIR_WORK_ORDER_DETAIL_API_URL ??
  "https://ics.chitraparatama.com/product/get_api.php?function=repair_work_order_detail_material"

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    console.error(`Failed to fetch ${url}: ${response.status}`)
    return null
  }

  const contentType = response.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    console.error(`Non-JSON response from ${url}: ${contentType}`)
    return null
  }

  return (await response.json()) as T
}

export async function getWipRepairData(): Promise<WipRepairRecord[]> {
  try {
    let apiList: WipRepairRecord[] = []
    try {
      const payload = await fetchJson<WipRepairApiResponse>(WIP_REPAIR_API_URL)
      if (payload && Array.isArray(payload.data)) {
        apiList = payload.data.filter(isVisibleWipRepairRecord)
      }
    } catch (err) {
      console.error("Failed to fetch external WIP Repair API:", err)
    }

    const apiSnSet = new Set(apiList.map((item) => (item.tire_sn || "").trim().toLowerCase()).filter(Boolean))

    const formatDateStr = (d: Date | null | undefined) => {
      if (!d) return null
      try {
        return d.toISOString().split("T")[0]
      } catch {
        return String(d)
      }
    }

    // 2. Fetch local HERO tire repair inspections
    let heroInspectionList: WipRepairRecord[] = []
    try {
      const inspections = await db
        .select()
        .from(tireRepairInspections)
        .orderBy(desc(tireRepairInspections.createdAt))

      heroInspectionList = inspections
        .filter((insp) => !apiSnSet.has(insp.serialNumber.trim().toLowerCase()))
        .map((insp) => ({
          id_wo: `HERO-${insp.id}`,
          wo: "Waiting WO",
          job_type: insp.status || "Repair",
          status: insp.status || "In Progress",
          size: insp.tireSize,
          brand: insp.brand || "-",
          pattern: insp.pattern || "-",
          type: insp.typeConstruction || "RADIAL",
          nocargo: insp.cargoManifestNo || null,
          tire_sn: insp.serialNumber,
          injury: insp.repairDuration || "R1",
          remark: insp.remarks || "",
          customer: insp.customer || "PT Kaltim Prima Coal",
          site: insp.customerSite || insp.inspectLocation || "Sangatta KPC",
          store_loc: insp.inspectLocation || "Workshop Sangatta",
          inspect_date: formatDateStr(insp.dateInspect),
          inspector: insp.reportBy,
          createby: insp.reportBy,
          wo_date: null,
          received_date: formatDateStr(insp.dateReceived),
          receiver: insp.reportBy,
          po: null,
          bast: null,
          po_date: null,
          bast_date: null,
          invoice: null,
          invoice_date: null,
          is_hero: true,
          source: "hero",
        }))
    } catch (err) {
      console.error("Failed to query local HERO tire repair inspections for WIP Repair:", err)
    }

    // 3. Fetch local HERO Jobcards to include issued jobcard items
    let heroJobcardList: WipRepairRecord[] = []
    try {
      const jobcards = await db
        .select()
        .from(tireRepairJobcards)
        .orderBy(desc(tireRepairJobcards.createdAt))

      const allExistingSnSet = new Set([
        ...apiSnSet,
        ...heroInspectionList.map((item) => item.tire_sn.trim().toLowerCase()),
      ])

      heroJobcardList = jobcards
        .filter((jc) => !allExistingSnSet.has(jc.serialNumber.trim().toLowerCase()))
        .map((jc) => ({
          id_wo: jc.jobcardNo,
          wo: jc.woNo || "Waiting WO",
          job_type: "Repair",
          status: jc.status || "In Progress",
          size: jc.tireSize,
          brand: jc.brand || "-",
          pattern: jc.pattern || "-",
          type: jc.tireConstruction || "RADIAL",
          nocargo: null,
          tire_sn: jc.serialNumber,
          injury: "R1",
          remark: `Jobcard ${jc.jobcardNo}`,
          customer: jc.customerName || "PT Kaltim Prima Coal",
          site: jc.plant || "Sangatta KPC",
          store_loc: jc.plant || "Workshop Sangatta",
          inspect_date: formatDateStr(jc.createdAt),
          inspector: jc.signQc || jc.byHeadSection || "QC Inspector",
          createby: jc.signQc || "HERO System",
          wo_date: formatDateStr(jc.woDate),
          received_date: formatDateStr(jc.receivedDate || jc.createdAt),
          receiver: jc.signQc || "-",
          po: null,
          bast: null,
          po_date: null,
          bast_date: null,
          invoice: null,
          invoice_date: null,
          is_hero: true,
          source: "hero",
        }))
    } catch (err) {
      console.error("Failed to query local HERO jobcards for WIP Repair:", err)
    }

    return [...heroJobcardList, ...heroInspectionList, ...apiList]
  } catch (error) {
    console.error("Failed to load WIP Repair data", error)
    return []
  }
}

export async function getWipRepairWorkOrderDetails(): Promise<WipRepairWorkOrderDetailRecord[]> {
  try {
    const payload = await fetchJson<WipRepairWorkOrderDetailApiResponse>(WIP_REPAIR_WORK_ORDER_DETAIL_API_URL)

    if (!payload || !Array.isArray(payload.data)) {
      return []
    }

    return payload.data.filter(isVisibleWipRepairWorkOrderDetail)
  } catch (error) {
    console.error("Failed to load WIP Repair WO detail data", error)
    return []
  }
}

export type WipRepairInvoiceMapping = {
  noInv: string | null
  tanggalInvoice: string | null
}

export type WipRepairPmoMapping = {
  actualTotalRevenue: number | null
  actualTotalCost: number | null
  systemStatus: string | null
  poNumber: string | null
  poDate: string | null
  poCustomer: string | null
}

export async function getWipRepairInvoiceMappings(woNumbers: string[]): Promise<Record<string, WipRepairInvoiceMapping>> {
  void woNumbers

  return {}
}

export async function getWipRepairPmoMappings(woNumbers: string[]): Promise<Record<string, WipRepairPmoMapping>> {
  void woNumbers

  return {}
}
