import type { WipRepairRecord, WipRepairWorkOrderDetailRecord } from "@/lib/types/wip-repair"
import { normalizeWipRepairBrand } from "@/lib/wip-repair-brand"

export type WipRepairRankingItem = {
  name: string
  value: number
  percentage: number
}

export type WipRepairMaterialUsageItem = WipRepairRankingItem & {
  category: string
  unit: string
  quantity: number
  rows: number
}

export type WipRepairJobTimeItem = WipRepairRankingItem & {
  rows: number
  averageMinutes: number
}

export type WipRepairWorkOrderInsight = {
  idWo: string
  insightKey: string
  wo: string
  status: string
  customer: string
  site: string
  tireSn: string
  injury: string
  size: string
  brand: string
  pattern: string
  receivedDate: string
  woDate: string
  totalMinutes: number
  detailRows: number
  materialRows: number
  agingDays: number | null
}

export type WipRepairDashboardData = {
  generatedAt: string
  summary: {
    totalWorkOrders: number
    progressWorkOrders: number
    completeWorkOrders: number
    rejectWorkOrders: number
    totalDetailRows: number
    totalMaterialRows: number
    totalMinutes: number
    averageMinutesPerWorkOrder: number
    activeCustomers: number
    activeSites: number
  }
  statusBreakdown: WipRepairRankingItem[]
  injuryBreakdown: WipRepairRankingItem[]
  topCustomers: WipRepairRankingItem[]
  topSites: WipRepairRankingItem[]
  topSizes: WipRepairRankingItem[]
  topBrands: WipRepairRankingItem[]
  materialUsage: WipRepairMaterialUsageItem[]
  materialCategories: WipRepairRankingItem[]
  jobFrequency: WipRepairRankingItem[]
  jobTimeBreakdown: WipRepairJobTimeItem[]
  agingBuckets: WipRepairRankingItem[]
  workOrderInsights: WipRepairWorkOrderInsight[]
}

export type WipRepairProductionData = {
  year: number
  month: number
  ytdTotal: number
  mtdTotal: number
  monthlyAllSites: Array<{ name: string; total: number }>
  ytdBySite: Array<{ name: string; total: number; average: number }>
  mtdBySize: Array<{ name: string; total: number }>
  siteTrends: Array<{ site: string; total: number; months: Array<{ name: string; total: number; average: number }> }>
}

const UNKNOWN_VALUE = "-"
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function normalizeValue(value: string | null | undefined) {
  return value?.trim() || UNKNOWN_VALUE
}

function normalizeTireSn(value: string | null | undefined) {
  return normalizeValue(value).toUpperCase()
}

export function normalizeWipRepairSite(value: string | null | undefined) {
  const normalized = normalizeValue(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const words = new Set(normalized.split(" "))

  if (words.has("BIB") && words.has("KGB")) return "BIB KGB"
  if (words.has("BIB") && words.has("GH")) return "BIB GH"
  if (words.has("BIB")) return "BIB"
  if (words.has("BMB")) return "BMB"
  if (words.has("KIM")) return "KIM"
  if (words.has("MHU")) return "MHU"
  if (["SANGATA", "SANGATTA", "SANGTTA"].some((name) => words.has(name))) return "SANGATTA"
  if (normalized === "BC" || normalized === "SITE BC" || normalized === "MTN BERAU") return "BERAU"
  if (words.has("DBK")) return "PTP DBK"
  if (words.has("SDA")) return "PETROSEA SDA"
  if (words.has("KAJANG") && (words.has("BATU") || words.has("BARU"))) return "BATU KAJANG"
  if (words.has("LUBUK") && words.has("LINGGAU")) return "TRIARYANI LUBUK LINGGAU"

  return normalized || UNKNOWN_VALUE
}

function isWaitingWorkOrder(value: string | null | undefined) {
  return normalizeValue(value).toLowerCase() === "waiting wo"
}

function isWaitingDetailWorkOrder(value: string | null | undefined) {
  const normalized = normalizeValue(value).toLowerCase()

  return normalized === "waiting wo" || normalized === "waiting"
}

function getHeaderDetailLookupKey(item: WipRepairRecord) {
  if (isWaitingWorkOrder(item.wo)) {
    const tireSn = normalizeTireSn(item.tire_sn)
    return tireSn === UNKNOWN_VALUE ? `WAITING_ID:${normalizeValue(item.id_wo)}` : `WAITING_SN:${tireSn}`
  }

  return normalizeValue(item.wo)
}

function getDetailLookupKeys(detail: WipRepairWorkOrderDetailRecord) {
  if (!isWaitingDetailWorkOrder(detail.wo)) {
    return [normalizeValue(detail.wo)]
  }

  const keys = new Set<string>()
  const tireSn = normalizeTireSn(detail.tire_sn)
  const idWo = normalizeValue(detail.id_wo)

  if (tireSn !== UNKNOWN_VALUE) {
    keys.add(`WAITING_SN:${tireSn}`)
  }

  if (idWo !== UNKNOWN_VALUE) {
    keys.add(`WAITING_ID:${idWo}`)
  }

  return Array.from(keys)
}

function parseNumber(value: string | null | undefined) {
  const normalized = normalizeValue(value)

  if (normalized === UNKNOWN_VALUE) {
    return 0
  }

  const parsed = Number(normalized.replace(",", "."))

  return Number.isFinite(parsed) ? parsed : 0
}

function round(value: number, fractionDigits = 2) {
  return Number(value.toFixed(fractionDigits))
}

function percentage(value: number, total: number) {
  return total > 0 ? round((value / total) * 100) : 0
}

function getTopCountItems(values: string[], total: number, limit = 8): WipRepairRankingItem[] {
  const counts = values.reduce<Record<string, number>>((accumulator, rawValue) => {
    const value = normalizeValue(rawValue)
    accumulator[value] = (accumulator[value] ?? 0) + 1
    return accumulator
  }, {})

  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: percentage(value, total),
    }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name))
    .slice(0, limit)
}

function uniqueKnownCount(values: string[]) {
  return new Set(values.map(normalizeValue).filter((value) => value !== UNKNOWN_VALUE)).size
}

function getAgingDays(item: WipRepairRecord, now: Date) {
  const candidate = item.received_date || item.wo_date || item.inspect_date

  if (!candidate) {
    return null
  }

  const timestamp = Date.parse(candidate)

  if (Number.isNaN(timestamp)) {
    return null
  }

  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000))
}

function getAgingBucketName(agingDays: number | null) {
  if (agingDays === null) {
    return "Tanpa tanggal"
  }

  if (agingDays <= 7) {
    return "0-7 hari"
  }

  if (agingDays <= 14) {
    return "8-14 hari"
  }

  if (agingDays <= 30) {
    return "15-30 hari"
  }

  return ">30 hari"
}

function getStatusCounts(data: WipRepairRecord[]) {
  return data.reduce(
    (accumulator, item) => {
      const status = normalizeValue(item.status).toLowerCase()

      if (status.includes("progress")) {
        accumulator.progress += 1
      }

      if (status.includes("complete") || status.includes("finish")) {
        accumulator.complete += 1
      }

      if (status.includes("reject")) {
        accumulator.reject += 1
      }

      return accumulator
    },
    { progress: 0, complete: 0, reject: 0 }
  )
}

export function buildWipRepairProductionData(
  data: WipRepairRecord[],
  workOrderDetails: WipRepairWorkOrderDetailRecord[],
  year: number,
  month: number
): WipRepairProductionData {
  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("Production period must contain a valid year and month")
  }

  const finalStageDateByWorkOrder = new Map<string, string>()

  for (const detail of workOrderDetails) {
    const workOrder = normalizeValue(detail.wo).toUpperCase()
    const stage = normalizeValue(detail.job).toLowerCase()
    const dateKey = detail.date?.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0]

    // ponytail: final-stage activity is the completion signal until the source API exposes completed_at.
    if (workOrder === UNKNOWN_VALUE || isWaitingDetailWorkOrder(workOrder) || !["finishing", "painting"].includes(stage) || !dateKey) {
      continue
    }

    if (!finalStageDateByWorkOrder.has(workOrder) || dateKey > finalStageDateByWorkOrder.get(workOrder)!) {
      finalStageDateByWorkOrder.set(workOrder, dateKey)
    }
  }

  const outputs = new Map<string, { year: number; month: number; site: string; size: string }>()

  for (const item of data) {
    const workOrder = normalizeValue(item.wo).toUpperCase()
    const dateKey = finalStageDateByWorkOrder.get(workOrder)

    if (!dateKey) {
      continue
    }

    const outputKey = `${workOrder}:${normalizeTireSn(item.tire_sn)}`
    outputs.set(outputKey, {
      year: Number(dateKey.slice(0, 4)),
      month: Number(dateKey.slice(5, 7)),
      site: normalizeWipRepairSite(item.site),
      size: normalizeValue(item.size).toUpperCase(),
    })
  }

  const yearOutputs = Array.from(outputs.values()).filter((item) => item.year === year)
  const ytdOutputs = yearOutputs.filter((item) => item.month <= month)
  const monthlyAllSites = MONTH_LABELS.map((name, index) => ({
    name,
    total: index < month ? ytdOutputs.filter((item) => item.month === index + 1).length : 0,
  }))
  const countBy = (items: typeof yearOutputs, field: "site" | "size") =>
    Object.entries(
      items.reduce<Record<string, number>>((counts, item) => {
        counts[item[field]] = (counts[item[field]] ?? 0) + 1
        return counts
      }, {})
    )
      .map(([name, total]) => ({ name, total }))
      .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name))

  const ytdBySite = countBy(ytdOutputs, "site").map((item) => ({
    ...item,
    average: Math.round(item.total / month),
  }))
  const mtdOutputs = yearOutputs.filter((item) => item.month === month)

  return {
    year,
    month,
    ytdTotal: ytdOutputs.length,
    mtdTotal: mtdOutputs.length,
    monthlyAllSites,
    ytdBySite,
    mtdBySize: countBy(mtdOutputs, "size"),
    siteTrends: ytdBySite.map(({ name: site, total }) => ({
      site,
      total,
      months: MONTH_LABELS.map((name, index) => {
        const currentMonth = index + 1
        const monthlyTotal = currentMonth <= month
          ? ytdOutputs.filter((item) => item.site === site && item.month === currentMonth).length
          : 0
        const cumulativeTotal = currentMonth <= month
          ? ytdOutputs.filter((item) => item.site === site && item.month <= currentMonth).length
          : 0

        return {
          name,
          total: monthlyTotal,
          average: currentMonth <= month ? Math.round(cumulativeTotal / currentMonth) : 0,
        }
      }),
    })),
  }
}

export function buildWipRepairDashboardData(
  data: WipRepairRecord[],
  workOrderDetails: WipRepairWorkOrderDetailRecord[],
  now = new Date()
): WipRepairDashboardData {
  const visibleWorkOrderKeys = new Set(data.map(getHeaderDetailLookupKey).filter((value) => value !== UNKNOWN_VALUE))
  const visibleWorkOrderDetails = workOrderDetails.filter((detail) =>
    getDetailLookupKeys(detail).some((key) => visibleWorkOrderKeys.has(key))
  )

  const detailsByWorkOrder = visibleWorkOrderDetails.reduce<Record<string, WipRepairWorkOrderDetailRecord[]>>((accumulator, detail) => {
    const keys = getDetailLookupKeys(detail)

    if (keys.length === 0) {
      return accumulator
    }

    for (const key of keys) {
      accumulator[key] ??= []
      accumulator[key].push(detail)
    }

    return accumulator
  }, {})

  const statusCounts = getStatusCounts(data)
  const workOrderInsights = data
    .map<WipRepairWorkOrderInsight>((item) => {
      const wo = normalizeValue(item.wo)
      const idWo = normalizeValue(item.id_wo)
      const detailLookupKey = getHeaderDetailLookupKey(item)
      const details = detailsByWorkOrder[detailLookupKey] ?? []
      const totalMinutes = details.reduce((sum, detail) => sum + parseNumber(detail.time), 0)
      const materialRows = details.filter((detail) => normalizeValue(detail.material_name) !== UNKNOWN_VALUE).length

      return {
        idWo,
        insightKey: `${idWo}:${detailLookupKey}:${normalizeTireSn(item.tire_sn)}`,
        wo,
        status: normalizeValue(item.status),
        customer: normalizeValue(item.customer),
        site: normalizeValue(item.site),
        tireSn: normalizeTireSn(item.tire_sn),
        injury: normalizeValue(item.injury),
        size: normalizeValue(item.size),
        brand: normalizeWipRepairBrand(item.brand),
        pattern: normalizeValue(item.pattern),
        receivedDate: normalizeValue(item.received_date),
        woDate: normalizeValue(item.wo_date),
        totalMinutes,
        detailRows: details.length,
        materialRows,
        agingDays: getAgingDays(item, now),
      }
    })
    .sort((left, right) => right.totalMinutes - left.totalMinutes || (right.agingDays ?? 0) - (left.agingDays ?? 0))

  const totalMinutes = workOrderInsights.reduce((sum, item) => sum + item.totalMinutes, 0)
  const materialRows = visibleWorkOrderDetails.filter((detail) => normalizeValue(detail.material_name) !== UNKNOWN_VALUE)
  const materialUsage = Object.values(
    materialRows.reduce<Record<string, WipRepairMaterialUsageItem>>((accumulator, detail) => {
      const name = normalizeValue(detail.material_name)
      const unit = normalizeValue(detail.smu)
      const key = `${name}__${unit}`

      accumulator[key] ??= {
        name,
        value: 0,
        percentage: 0,
        category: normalizeValue(detail.category),
        unit,
        quantity: 0,
        rows: 0,
      }

      accumulator[key].quantity += parseNumber(detail.qty)
      accumulator[key].rows += 1
      accumulator[key].value = accumulator[key].rows

      return accumulator
    }, {})
  )

  const totalMaterialRows = materialUsage.reduce((sum, item) => sum + item.rows, 0)
  const preparedMaterialUsage = materialUsage
    .map((item) => ({
      ...item,
      quantity: round(item.quantity),
      value: item.rows,
      percentage: percentage(item.rows, totalMaterialRows),
    }))
    .sort((left, right) => right.rows - left.rows || right.quantity - left.quantity)
    .slice(0, 12)

  const jobTimeBreakdown = Object.values(
    visibleWorkOrderDetails.reduce<Record<string, WipRepairJobTimeItem>>((accumulator, detail) => {
      const name = normalizeValue(detail.job)

      accumulator[name] ??= {
        name,
        value: 0,
        percentage: 0,
        rows: 0,
        averageMinutes: 0,
      }

      accumulator[name].value += parseNumber(detail.time)
      accumulator[name].rows += 1

      return accumulator
    }, {})
  )
    .map((item) => ({
      ...item,
      value: round(item.value),
      percentage: percentage(item.value, totalMinutes),
      averageMinutes: item.rows > 0 ? round(item.value / item.rows) : 0,
    }))
    .sort((left, right) => right.value - left.value || right.rows - left.rows)
    .slice(0, 10)

  const agingBucketOrder = ["0-7 hari", "8-14 hari", "15-30 hari", ">30 hari", "Tanpa tanggal"]
  const agingCounts = workOrderInsights.reduce<Record<string, number>>((accumulator, item) => {
    const bucket = getAgingBucketName(item.agingDays)
    accumulator[bucket] = (accumulator[bucket] ?? 0) + 1
    return accumulator
  }, {})

  return {
    generatedAt: now.toISOString(),
    summary: {
      totalWorkOrders: data.length,
      progressWorkOrders: statusCounts.progress,
      completeWorkOrders: statusCounts.complete,
      rejectWorkOrders: statusCounts.reject,
      totalDetailRows: visibleWorkOrderDetails.length,
      totalMaterialRows: materialRows.length,
      totalMinutes: round(totalMinutes),
      averageMinutesPerWorkOrder: data.length > 0 ? round(totalMinutes / data.length) : 0,
      activeCustomers: uniqueKnownCount(data.map((item) => item.customer ?? "")),
      activeSites: uniqueKnownCount(data.map((item) => item.site ?? "")),
    },
    statusBreakdown: getTopCountItems(data.map((item) => item.status), data.length, 8),
    injuryBreakdown: getTopCountItems(data.map((item) => item.injury ?? ""), data.length, 8),
    topCustomers: getTopCountItems(data.map((item) => item.customer ?? ""), data.length, 8),
    topSites: getTopCountItems(data.map((item) => item.site ?? ""), data.length, 8),
    topSizes: getTopCountItems(data.map((item) => item.size ?? ""), data.length, 8),
    topBrands: getTopCountItems(data.map((item) => normalizeWipRepairBrand(item.brand)), data.length, 8),
    materialUsage: preparedMaterialUsage,
    materialCategories: getTopCountItems(materialRows.map((item) => item.category ?? ""), materialRows.length, 8),
    jobFrequency: getTopCountItems(visibleWorkOrderDetails.map((item) => item.job ?? ""), visibleWorkOrderDetails.length, 10),
    jobTimeBreakdown,
    agingBuckets: agingBucketOrder.map((name) => {
      const value = agingCounts[name] ?? 0

      return {
        name,
        value,
        percentage: percentage(value, data.length),
      }
    }),
    workOrderInsights,
  }
}
