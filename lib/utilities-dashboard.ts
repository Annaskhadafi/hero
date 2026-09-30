import { db } from '@/db'
import {
  activities,
  dailyActivitySessions,
  dailyActivitySessionItems,
  employees,
  masterDepartments,
  masterSections,
  sites,
} from '@/db/schema/hero'
import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'

export interface UtilitiesSiteItem {
  id: number
  name: string
  customerName: string
  pjoName?: string | null
  pjoJobTitle?: string | null
}

export interface UtilitiesKpis {
  totalOutput: number
  totalDurationHours: number
  averageOutputPerDay: number
  unitsHandled: number
  techniciansCount: number
  activitiesRecorded: number
}

export interface UtilitiesActivityBar {
  activityLabel: string
  totalQuantity: number
  totalDurationHours: number
  percentage: number
}

export interface UtilitiesDailyTrend {
  date: string
  dateLabel: string
  totalOutput: number
  totalDurationHours: number
  techniciansCount: number
}

export interface UtilitiesTechnicianItem {
  employeeId: number
  employeeName: string
  employeeSn: string
  jobTitle: string
  totalOutput: number
  totalDurationHours: number
  activitiesCount: number
  topActivity: string
}

export interface UtilitiesUnitItem {
  unitNumber: string
  totalOutput: number
  totalDurationHours: number
  jobsCount: number
}

export interface UtilitiesDateMatrixRow {
  date: string
  dateLabel: string
  dayName: string
  counts: Record<string, number>
  totalRowOutput: number
  totalRowDurationHours: number
}

export interface UtilitiesTechnicianMatrixRow {
  employeeId: number
  employeeName: string
  employeeSn: string
  jobTitle: string
  counts: Record<string, number>
  totalRowOutput: number
  totalRowDurationHours: number
}

export interface UtilitiesUnitMatrixRow {
  unitNumber: string
  counts: Record<string, number>
  totalRowOutput: number
  totalRowDurationHours: number
}

export interface UtilitiesDashboardData {
  sitesList: UtilitiesSiteItem[]
  currentSite: UtilitiesSiteItem
  currentPeriod: string
  startDate: string
  endDate: string
  kpis: UtilitiesKpis
  activityBars: UtilitiesActivityBar[]
  dailyTrends: UtilitiesDailyTrend[]
  topTechnicians: UtilitiesTechnicianItem[]
  topUnits: UtilitiesUnitItem[]
  activityColumns: string[]
  dateMatrix: {
    rows: UtilitiesDateMatrixRow[]
    summaryRow: {
      counts: Record<string, number>
      totalOutput: number
      totalDurationHours: number
    }
  }
  technicianMatrix: {
    rows: UtilitiesTechnicianMatrixRow[]
    summaryRow: {
      counts: Record<string, number>
      totalOutput: number
      totalDurationHours: number
    }
  }
  unitMatrix: {
    rows: UtilitiesUnitMatrixRow[]
    summaryRow: {
      counts: Record<string, number>
      totalOutput: number
      totalDurationHours: number
    }
  }
  lastUpdatedTime: string
}

export interface UtilitiesFilterParams {
  siteId?: string
  period?: 'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom'
  startDate?: string
  endDate?: string
  search?: string
  employeeName?: string
}

/**
 * Standardize activity label into clean operational category names
 */
function cleanActivityLabel(raw?: string | null): string {
  if (!raw) return 'Lain-lain / General'
  const trimmed = raw.trim()
  if (!trimmed) return 'Lain-lain / General'

  // If label contains code prefix like "SVC.STB-003 - Disassembly TB", keep clean label
  const dashMatch = trimmed.match(/^[A-Za-z0-9._\-\s]+[-–]\s*(.+)$/)
  if (dashMatch && dashMatch[1]) {
    return dashMatch[1].trim()
  }

  return trimmed
}

function parseItemQuantity(item: {
  tireCount?: number | null
  snapshotPayload?: string | null
}): number {
  if (item.tireCount && typeof item.tireCount === 'number' && item.tireCount > 0) {
    return item.tireCount
  }

  if (item.snapshotPayload) {
    try {
      const p = JSON.parse(item.snapshotPayload)
      const qtyCandidate =
        p.tireCount ??
        p.quantity ??
        p.qty ??
        p.jumlah ??
        p.volume ??
        p.tiresCount ??
        p.count
      if (typeof qtyCandidate === 'number' && Number.isFinite(qtyCandidate) && qtyCandidate > 0) {
        return Math.round(qtyCandidate)
      }
      if (typeof qtyCandidate === 'string') {
        const parsed = parseInt(qtyCandidate, 10)
        if (!isNaN(parsed) && parsed > 0) return parsed
      }
    } catch {}
  }

  // Default to 1 per activity occurrence / per person
  return 1
}

function calculateItemDurationHours(start?: Date | string | null, end?: Date | string | null): number {
  if (start && end) {
    try {
      const s = new Date(start).getTime()
      const e = new Date(end).getTime()
      const diffMs = e - s
      if (!Number.isNaN(diffMs) && diffMs > 0 && diffMs <= 24 * 3600 * 1000) {
        return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10
      }
    } catch {}
  }
  return 0
}

function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`
  } catch {
    return dateStr
  }
}

function getDayNameIndonesian(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    return days[d.getUTCDay()] || ''
  } catch {
    return ''
  }
}

export async function getUtilitiesDashboardData(
  params: UtilitiesFilterParams = {}
): Promise<UtilitiesDashboardData> {
  const now = new Date()

  // 1. Fetch available sites
  const allSitesRows = await db
    .select({
      id: sites.id,
      name: sites.name,
      customerName: sites.customerName,
      pjoName: employees.name,
      pjoJobTitle: employees.jobTitle,
    })
    .from(sites)
    .leftJoin(employees, eq(sites.headEmployeeId, employees.id))
    .where(eq(sites.isActive, true))
    .orderBy(sites.name)

  const sitesList: UtilitiesSiteItem[] = [
    {
      id: 0,
      name: 'Semua Site (Konsolidasi)',
      customerName: 'Semua Customer',
      pjoName: 'Seluruh PJO & Head Site',
      pjoJobTitle: 'Operations Supervisory',
    },
    ...allSitesRows.map((s) => ({
      id: s.id,
      name: s.name,
      customerName: s.customerName || 'PT Chitra Paratama',
      pjoName: s.pjoName || undefined,
      pjoJobTitle: s.pjoJobTitle || undefined,
    })),
  ]

  let currentSite = sitesList[0]
  if (params.siteId && params.siteId !== 'all' && params.siteId !== '0') {
    const found = sitesList.find((s) => String(s.id) === params.siteId)
    if (found) currentSite = found
  }

  // 2. Resolve Date Range
  const todayStr = now.toISOString().split('T')[0]
  let effectiveStartDate = todayStr
  let effectiveEndDate = todayStr
  let periodLabel = 'today'

  if (params.period === 'yesterday') {
    periodLabel = 'yesterday'
    const y = new Date(now)
    y.setUTCDate(y.getUTCDate() - 1)
    const yStr = y.toISOString().split('T')[0]
    effectiveStartDate = yStr
    effectiveEndDate = yStr
  } else if (params.period === 'weekly') {
    periodLabel = 'weekly'
    const w = new Date(now)
    w.setUTCDate(w.getUTCDate() - 6)
    effectiveStartDate = w.toISOString().split('T')[0]
    effectiveEndDate = todayStr
  } else if (params.period === 'monthly') {
    periodLabel = 'monthly'
    const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    effectiveStartDate = firstDay.toISOString().split('T')[0]
    effectiveEndDate = todayStr
  } else if (params.startDate || params.endDate) {
    periodLabel = 'custom'
    effectiveStartDate = params.startDate?.trim() || params.endDate?.trim() || todayStr
    effectiveEndDate = params.endDate?.trim() || params.startDate?.trim() || todayStr
    if (effectiveStartDate > effectiveEndDate) {
      const temp = effectiveStartDate
      effectiveStartDate = effectiveEndDate
      effectiveEndDate = temp
    }
  } else if (params.period === 'today') {
    periodLabel = 'today'
    effectiveStartDate = todayStr
    effectiveEndDate = todayStr
  } else {
    // Default: Minggu Berjalan (7 Hari Terakhir) agar langsung menampilkan grafik informatif
    periodLabel = 'weekly'
    const w = new Date(now)
    w.setUTCDate(w.getUTCDate() - 6)
    effectiveStartDate = w.toISOString().split('T')[0]
    effectiveEndDate = todayStr
  }

  // 3. Query Sessions in the target Site & Date Range
  const sessionConds = [
    isNull(dailyActivitySessions.deletedAt),
    sql`date(${dailyActivitySessions.workDate}) >= ${effectiveStartDate}`,
    sql`date(${dailyActivitySessions.workDate}) <= ${effectiveEndDate}`,
  ]

  if (currentSite.id !== 0) {
    sessionConds.push(eq(dailyActivitySessions.siteId, currentSite.id))
  }

  const searchKeyword = (params.employeeName || params.search || '').trim()
  if (searchKeyword) {
    const searchFilter = or(
      ilike(employees.name, `%${searchKeyword}%`),
      ilike(employees.employeeSn, `%${searchKeyword}%`),
      ilike(dailyActivitySessions.sessionCode, `%${searchKeyword}%`)
    )
    if (searchFilter) {
      sessionConds.push(searchFilter)
    }
  }

  const sessionRows = await db
    .select({
      sessionId: dailyActivitySessions.id,
      sessionCode: dailyActivitySessions.sessionCode,
      workDate: dailyActivitySessions.workDate,
      shiftCode: dailyActivitySessions.shiftCode,
      employeeId: employees.id,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      siteId: dailyActivitySessions.siteId,
    })
    .from(dailyActivitySessions)
    .innerJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
    .where(and(...sessionConds))
    .orderBy(desc(dailyActivitySessions.workDate))
    .limit(1000)

  const sessionIds = sessionRows.map((s) => s.sessionId)

  // 4. Query Items belonging to these sessions
  let itemRows: Array<{
    id: number
    sessionId: number
    snapshotLabel: string
    unitNumber: string | null
    tireCount: number | null
    snapshotPayload: string | null
    startedAt: Date | null
    endedAt: Date | null
  }> = []

  if (sessionIds.length > 0) {
    itemRows = await db
      .select({
        id: dailyActivitySessionItems.id,
        sessionId: dailyActivitySessionItems.sessionId,
        snapshotLabel: dailyActivitySessionItems.snapshotLabel,
        unitNumber: dailyActivitySessionItems.unitNumber,
        tireCount: dailyActivitySessionItems.tireCount,
        snapshotPayload: dailyActivitySessionItems.snapshotPayload,
        startedAt: dailyActivitySessionItems.startedAt,
        endedAt: dailyActivitySessionItems.endedAt,
      })
      .from(dailyActivitySessionItems)
      .where(inArray(dailyActivitySessionItems.sessionId, sessionIds))
  }

  // Map session metadata to items
  const sessionMap = new Map<number, (typeof sessionRows)[0]>()
  for (const s of sessionRows) {
    sessionMap.set(s.sessionId, s)
  }

  // 5. Aggregate Utilities Data
  let totalOutput = 0
  let totalDurationMinutes = 0
  const uniqueUnits = new Set<string>()
  const uniqueTechnicians = new Set<number>()
  const activeDates = new Set<string>()

  const activityTotalsMap = new Map<string, { qty: number; durationHours: number }>()
  const dailyTotalsMap = new Map<string, { qty: number; durationHours: number; techs: Set<number> }>()
  const techTotalsMap = new Map<number, {
    info: { employeeId: number; name: string; sn: string; jobTitle: string }
    qty: number
    durationHours: number
    activities: Map<string, number>
  }>()
  const unitTotalsMap = new Map<string, {
    qty: number
    durationHours: number
    jobsCount: number
    activities: Map<string, number>
  }>()

  // Date Matrix Map: date -> (activityLabel -> qty, duration)
  const dateMatrixMap = new Map<string, {
    counts: Map<string, number>
    totalOutput: number
    totalDurationHours: number
  }>()

  // Loop through all items and compute quantities
  for (const item of itemRows) {
    const s = sessionMap.get(item.sessionId)
    if (!s) continue

    const dateStr = s.workDate ? new Date(s.workDate).toISOString().split('T')[0] : todayStr
    activeDates.add(dateStr)

    const label = cleanActivityLabel(item.snapshotLabel)
    const qty = parseItemQuantity(item)
    const durHours = calculateItemDurationHours(item.startedAt, item.endedAt)

    totalOutput += qty
    totalDurationMinutes += durHours * 60
    uniqueTechnicians.add(s.employeeId)

    const cleanUnit = (item.unitNumber || '').trim().toUpperCase()
    if (cleanUnit && cleanUnit !== '-' && cleanUnit !== 'NONE') {
      uniqueUnits.add(cleanUnit)
    }

    // 1. Activity Bar Chart Accumulation
    const currAct = activityTotalsMap.get(label) || { qty: 0, durationHours: 0 }
    currAct.qty += qty
    currAct.durationHours = Math.round((currAct.durationHours + durHours) * 10) / 10
    activityTotalsMap.set(label, currAct)

    // 2. Daily Trend Accumulation
    const currDay = dailyTotalsMap.get(dateStr) || { qty: 0, durationHours: 0, techs: new Set<number>() }
    currDay.qty += qty
    currDay.durationHours = Math.round((currDay.durationHours + durHours) * 10) / 10
    currDay.techs.add(s.employeeId)
    dailyTotalsMap.set(dateStr, currDay)

    // 3. Technician Accumulation
    const currTech = techTotalsMap.get(s.employeeId) || {
      info: {
        employeeId: s.employeeId,
        name: s.employeeName,
        sn: s.employeeSn || '-',
        jobTitle: s.jobTitle || 'Technician',
      },
      qty: 0,
      durationHours: 0,
      activities: new Map<string, number>(),
    }
    currTech.qty += qty
    currTech.durationHours = Math.round((currTech.durationHours + durHours) * 10) / 10
    currTech.activities.set(label, (currTech.activities.get(label) || 0) + qty)
    techTotalsMap.set(s.employeeId, currTech)

    // 4. Unit Accumulation
    if (cleanUnit && cleanUnit !== '-' && cleanUnit !== 'NONE') {
      const currUnit = unitTotalsMap.get(cleanUnit) || {
        qty: 0,
        durationHours: 0,
        jobsCount: 0,
        activities: new Map<string, number>(),
      }
      currUnit.qty += qty
      currUnit.durationHours = Math.round((currUnit.durationHours + durHours) * 10) / 10
      currUnit.jobsCount += 1
      currUnit.activities.set(label, (currUnit.activities.get(label) || 0) + qty)
      unitTotalsMap.set(cleanUnit, currUnit)
    }

    // 5. Date Matrix Row Accumulation
    const currDateMat = dateMatrixMap.get(dateStr) || {
      counts: new Map<string, number>(),
      totalOutput: 0,
      totalDurationHours: 0,
    }
    currDateMat.counts.set(label, (currDateMat.counts.get(label) || 0) + qty)
    currDateMat.totalOutput += qty
    currDateMat.totalDurationHours = Math.round((currDateMat.totalDurationHours + durHours) * 10) / 10
    dateMatrixMap.set(dateStr, currDateMat)
  }

  // 6. Build Activity Columns (sorted by highest output)
  const sortedActivities = Array.from(activityTotalsMap.entries()).sort((a, b) => b[1].qty - a[1].qty)
  const activityColumns = sortedActivities.map(([label]) => label)

  // 7. Format Activity Bars for Chart
  const activityBars: UtilitiesActivityBar[] = sortedActivities.map(([label, val]) => ({
    activityLabel: label,
    totalQuantity: val.qty,
    totalDurationHours: val.durationHours,
    percentage: totalOutput > 0 ? Math.round((val.qty / totalOutput) * 100) : 0,
  }))

  // 8. Format Daily Trends (in chronological order)
  // Ensure every day in date range is included for a smooth chart
  const dailyTrends: UtilitiesDailyTrend[] = []
  const startD = new Date(effectiveStartDate)
  const endD = new Date(effectiveEndDate)
  const currD = new Date(startD)
  const maxDays = 90
  let dayCount = 0

  while (currD <= endD && dayCount < maxDays) {
    const dStr = currD.toISOString().split('T')[0]
    const data = dailyTotalsMap.get(dStr)
    dailyTrends.push({
      date: dStr,
      dateLabel: formatDisplayDate(dStr),
      totalOutput: data?.qty || 0,
      totalDurationHours: data?.durationHours || 0,
      techniciansCount: data?.techs.size || 0,
    })
    currD.setUTCDate(currD.getUTCDate() + 1)
    dayCount++
  }

  // 9. Format Top Technicians
  const topTechnicians: UtilitiesTechnicianItem[] = Array.from(techTotalsMap.values())
    .map((t) => {
      let topAct = '-'
      let maxActQty = 0
      for (const [aName, aQty] of Array.from(t.activities.entries())) {
        if (aQty > maxActQty) {
          maxActQty = aQty
          topAct = aName
        }
      }
      return {
        employeeId: t.info.employeeId,
        employeeName: t.info.name,
        employeeSn: t.info.sn,
        jobTitle: t.info.jobTitle,
        totalOutput: t.qty,
        totalDurationHours: t.durationHours,
        activitiesCount: t.activities.size,
        topActivity: topAct,
      }
    })
    .sort((a, b) => b.totalOutput - a.totalOutput)

  // 10. Format Top Units
  const topUnits: UtilitiesUnitItem[] = Array.from(unitTotalsMap.entries())
    .map(([uNum, val]) => ({
      unitNumber: uNum,
      totalOutput: val.qty,
      totalDurationHours: val.durationHours,
      jobsCount: val.jobsCount,
    }))
    .sort((a, b) => b.totalOutput - a.totalOutput)

  // 11. Build Date Matrix (Excel Table style)
  const dateMatrixRows: UtilitiesDateMatrixRow[] = []
  const summaryCounts: Record<string, number> = {}
  for (const col of activityColumns) {
    summaryCounts[col] = activityTotalsMap.get(col)?.qty || 0
  }

  for (const day of dailyTrends) {
    const raw = dateMatrixMap.get(day.date)
    const countsObj: Record<string, number> = {}
    for (const col of activityColumns) {
      countsObj[col] = raw?.counts.get(col) || 0
    }
    dateMatrixRows.push({
      date: day.date,
      dateLabel: day.dateLabel,
      dayName: getDayNameIndonesian(day.date),
      counts: countsObj,
      totalRowOutput: raw?.totalOutput || 0,
      totalRowDurationHours: raw?.totalDurationHours || 0,
    })
  }

  // 12. Build Technician Matrix
  const technicianMatrixRows: UtilitiesTechnicianMatrixRow[] = topTechnicians.map((t) => {
    const rawTech = techTotalsMap.get(t.employeeId)
    const countsObj: Record<string, number> = {}
    for (const col of activityColumns) {
      countsObj[col] = rawTech?.activities.get(col) || 0
    }
    return {
      employeeId: t.employeeId,
      employeeName: t.employeeName,
      employeeSn: t.employeeSn,
      jobTitle: t.jobTitle,
      counts: countsObj,
      totalRowOutput: t.totalOutput,
      totalRowDurationHours: t.totalDurationHours,
    }
  })

  // 13. Build Unit Matrix
  const unitMatrixRows: UtilitiesUnitMatrixRow[] = topUnits.map((u) => {
    const rawUnit = unitTotalsMap.get(u.unitNumber)
    const countsObj: Record<string, number> = {}
    for (const col of activityColumns) {
      countsObj[col] = rawUnit?.activities.get(col) || 0
    }
    return {
      unitNumber: u.unitNumber,
      counts: countsObj,
      totalRowOutput: u.totalOutput,
      totalRowDurationHours: u.totalDurationHours,
    }
  })

  const totalDurationHours = Math.round((totalDurationMinutes / 60) * 10) / 10
  const activeDaysCount = Math.max(1, activeDates.size)
  const averageOutputPerDay = Math.round((totalOutput / activeDaysCount) * 10) / 10

  const kpis: UtilitiesKpis = {
    totalOutput,
    totalDurationHours,
    averageOutputPerDay,
    unitsHandled: uniqueUnits.size,
    techniciansCount: uniqueTechnicians.size,
    activitiesRecorded: itemRows.length,
  }

  return {
    sitesList,
    currentSite,
    currentPeriod: periodLabel,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    kpis,
    activityBars,
    dailyTrends,
    topTechnicians,
    topUnits,
    activityColumns,
    dateMatrix: {
      rows: dateMatrixRows,
      summaryRow: {
        counts: summaryCounts,
        totalOutput,
        totalDurationHours,
      },
    },
    technicianMatrix: {
      rows: technicianMatrixRows,
      summaryRow: {
        counts: summaryCounts,
        totalOutput,
        totalDurationHours,
      },
    },
    unitMatrix: {
      rows: unitMatrixRows,
      summaryRow: {
        counts: summaryCounts,
        totalOutput,
        totalDurationHours,
      },
    },
    lastUpdatedTime: new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(now),
  }
}
