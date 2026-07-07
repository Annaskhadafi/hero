"use server"

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
    const payload = await fetchJson<WipRepairApiResponse>(WIP_REPAIR_API_URL)

    if (!payload || !Array.isArray(payload.data)) {
      return []
    }

    return payload.data.filter(isVisibleWipRepairRecord)
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
