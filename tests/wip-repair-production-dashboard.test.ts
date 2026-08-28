import {
  buildWipRepairDashboardData,
  buildWipRepairProductionData,
  getWipRepairAgingUnder30Rows,
  normalizeWipRepairSite,
} from "@/lib/wip-repair-dashboard"
import type { WipRepairRecord, WipRepairWorkOrderDetailRecord } from "@/lib/types/wip-repair"

const record = (wo: string, tireSn: string, site: string, size: string): WipRepairRecord => ({
  id_wo: `${wo}-${tireSn}`,
  wo,
  job_type: "REPAIR",
  status: "Complete",
  size,
  brand: "Brand",
  pattern: "Pattern",
  type: "RADIAL",
  nocargo: null,
  tire_sn: tireSn,
  injury: null,
  remark: null,
  customer: "Customer",
  site,
  store_loc: site,
  inspect_date: null,
  inspector: null,
  createby: null,
  wo_date: null,
  received_date: null,
  receiver: null,
  po: null,
  bast: null,
  po_date: null,
  bast_date: null,
  invoice: null,
  invoice_date: null,
})

const detail = (id: string, wo: string, job: string, date: string): WipRepairWorkOrderDetailRecord => ({
  id_job: id,
  wo,
  job,
  material_id: null,
  material_name: null,
  category: null,
  smu: null,
  qty: null,
  time: null,
  date,
  person: null,
})

test("builds YTD, MTD, site, and size production from unique final-stage outputs", () => {
  const data = [
    record("WO-1", "SN-1", "Site A", "27.00R49"),
    record("WO-1", "SN-1", "Site A", "27.00R49"),
    record("WO-2", "SN-2", "Site A", "24.00R35"),
    record("WO-3", "SN-3", "Site B", "27.00R49"),
    record("WO-4", "SN-4", "Site B", "18.00R33"),
    record("WO-5", "SN-5", "Site C", "18.00R33"),
  ]
  const details = [
    detail("1", "WO-1", "Finishing", "2026-01-10 08:00:00"),
    detail("2", "WO-1", "Painting", "2026-01-11 08:00:00"),
    detail("3", "WO-2", "Painting", "2026-06-02 08:00:00"),
    detail("4", "WO-3", "Finishing", "2026-06-03 08:00:00"),
    detail("5", "WO-4", "Curing", "2026-06-04 08:00:00"),
    detail("6", "WO-5", "Painting", "2026-07-04 08:00:00"),
  ]

  const result = buildWipRepairProductionData(data, details, 2026, 6)

  expect(result.ytdTotal).toBe(3)
  expect(result.mtdTotal).toBe(2)
  expect(result.monthlyAllSites[0]).toEqual({ name: "Jan", total: 1 })
  expect(result.monthlyAllSites[5]).toEqual({ name: "Jun", total: 2 })
  expect(result.monthlyAllSites[6]).toEqual({ name: "Jul", total: 0 })
  expect(result.ytdBySite).toEqual([
    { name: "SITE A", total: 2, average: 0 },
    { name: "SITE B", total: 1, average: 0 },
  ])
  expect(result.ytdBySite.some((item) => item.name === "SITE C")).toBe(false)
  expect(result.mtdBySize).toEqual([
    { name: "24.00R35", total: 1 },
    { name: "27.00R49", total: 1 },
  ])
})

test("groups common site aliases while keeping BIB KGB and BIB GH separate", () => {
  expect(["BIB", "CK BIB", "ck site bib"].map(normalizeWipRepairSite)).toEqual(["BIB", "BIB", "BIB"])
  expect(["CK-BIB(KGB)", "CK BIB PIT KGB"].map(normalizeWipRepairSite)).toEqual(["BIB KGB", "BIB KGB"])
  expect(["BIB PIT GH", "CK BIB (GH)"].map(normalizeWipRepairSite)).toEqual(["BIB GH", "BIB GH"])
  expect(normalizeWipRepairSite("CK KIM")).toBe("KIM")
  expect(normalizeWipRepairSite("CK-BMB")).toBe("BMB")
  expect(normalizeWipRepairSite("ck mhu")).toBe("MHU")
  expect(normalizeWipRepairSite("Sangata ")).toBe("SANGATTA")
})


test("returns only WIP repair rows with aging strictly below 30 days", () => {
  const now = new Date("2026-08-28T00:00:00.000Z")
  const records = [
    { ...record("WO-29", "SN-29", "Site A", "27.00R49"), received_date: "2026-07-30" },
    { ...record("WO-30", "SN-30", "Site A", "27.00R49"), received_date: "2026-07-29" },
    record("WO-NO-DATE", "SN-NO-DATE", "Site A", "27.00R49"),
  ]

  const dashboard = buildWipRepairDashboardData(records, [], now)
  const result = getWipRepairAgingUnder30Rows(dashboard.workOrderInsights)

  expect(result.map((item) => item.wo)).toEqual(["WO-29"])
  expect(result[0]?.agingDays).toBe(29)
})
