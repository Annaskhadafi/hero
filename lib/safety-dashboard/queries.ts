import { desc, eq } from "drizzle-orm"
import Fuse from "fuse.js"
import { db } from "@/db"
import {
  employees as heroEmployees,
  sites,
  safetyCertifications,
  safetyIncidentReports,
  safetyIncidentSummaryMonthly,
  safetyIncidentSummaryYearly,
  safetyInspections,
  safetyManHours,
  safetyMonthlyManHours,
  safetyPerformanceMetrics,
  safetyWeeklyActivities,
} from "@/db/schema/hero"
import { heroSafetyInductions } from "@/db/schema/safety-induction"
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission } from "@/lib/hero-access"
import { buildSafetyCharts, buildSafetyKpis } from "@/lib/safety-dashboard/aggregations"
import type { SafetyDashboardAccess } from "@/lib/safety-dashboard/types"

async function getSafetyAccess(): Promise<SafetyDashboardAccess> {
  const roleName = await getCurrentEmployeeAccessRole()
  if (roleName === "HSE" || roleName === "Super Admin") {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canSelectAll: true,
    }
  }

  const [permDataMgmt, permDashboard, permSafety] = await Promise.all([
    getCurrentMenuPermission("safety_data_management"),
    getCurrentMenuPermission("safety_dashboard"),
    getCurrentMenuPermission("safety"),
  ])

  return {
    canView: permDataMgmt.canView || permDashboard.canView || permSafety.canView,
    canEdit: permDataMgmt.canEdit || permDashboard.canEdit || permSafety.canEdit,
    canDelete: permDataMgmt.canDelete || permDashboard.canDelete || permSafety.canDelete,
    canSelectAll: permDataMgmt.canSelectAll || permDashboard.canSelectAll || permSafety.canSelectAll,
  }
}

function buildMasterSiteLocations(
  masterSitesList: Array<{ name: string; location: string | null }>,
  otherRawLocations: string[]
) {
  const mapping: Record<string, string> = {}

  // Canonical list contains ONLY clean site names from masterSitesList (sites.name)
  const canonical = Array.from(
    new Set(masterSitesList.map((s) => s.name?.trim()).filter((n): n is string => Boolean(n)))
  ).sort()

  // 1. Direct self-mapping for canonical site names
  for (const name of canonical) {
    mapping[name] = name
  }

  // 2. Map detailed site addresses (sites.location) to the corresponding site.name
  for (const s of masterSitesList) {
    if (s.name && s.location && s.location.trim()) {
      mapping[s.location.trim()] = s.name.trim()
    }
  }

  // 3. Fuzzy match any other raw location strings against canonical site names
  const fuse = new Fuse(canonical, {
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
  })

  const uniqueOthers = Array.from(new Set(otherRawLocations.filter(Boolean)))

  for (const raw of uniqueOthers) {
    if (mapping[raw]) continue

    const normalizedRaw = raw.toUpperCase().replace(/[-_]/g, " ").trim()

    // Substring or exact check
    const substringMatch = canonical.find((c) => {
      const normalizedC = c.toUpperCase().replace(/[-_]/g, " ").trim()
      return (
        normalizedC.length >= 3 &&
        (normalizedRaw === normalizedC || normalizedRaw.includes(normalizedC) || normalizedC.includes(normalizedRaw))
      )
    })

    if (substringMatch) {
      mapping[raw] = substringMatch
      continue
    }

    fuse.setCollection(canonical)
    const results = fuse.search(raw)

    if (results.length > 0 && results[0].score !== undefined && results[0].score <= 0.35) {
      mapping[raw] = results[0].item
    } else {
      mapping[raw] = raw
    }
  }

  return { mapping, canonical }
}

export async function getSafetyDashboardData(filters?: { year?: string; month?: string; location?: string }) {
  const [
    yearlySummaries,
    monthlySummaries,
    incidentReports,
    certifications,
    performanceMetrics,
    rawManHours,
    rawMonthlyManHours,
    weeklyActivities,
    inspections,
    inductions,
    access,
    activeEmployees,
    masterSitesList,
  ] = await Promise.all([
    db.select().from(safetyIncidentSummaryYearly).orderBy(desc(safetyIncidentSummaryYearly.year)),
    db.select().from(safetyIncidentSummaryMonthly).orderBy(desc(safetyIncidentSummaryMonthly.month)),
    db.select().from(safetyIncidentReports).orderBy(desc(safetyIncidentReports.incidentDate)),
    db.select().from(safetyCertifications).orderBy(desc(safetyCertifications.nextCertificationDate)),
    db.select().from(safetyPerformanceMetrics).orderBy(desc(safetyPerformanceMetrics.year)),
    db.select().from(safetyManHours).orderBy(desc(safetyManHours.safetyManHours)),
    db.select().from(safetyMonthlyManHours).orderBy(desc(safetyMonthlyManHours.month)),
    db.select().from(safetyWeeklyActivities).orderBy(desc(safetyWeeklyActivities.activityDate)),
    db.select().from(safetyInspections).orderBy(desc(safetyInspections.date)),
    db.select().from(heroSafetyInductions).orderBy(desc(heroSafetyInductions.createdAt)),
    getSafetyAccess(),
    db
      .select({
        id: heroEmployees.id,
        workLocation: heroEmployees.workLocation,
        siteName: sites.name,
        siteLocation: sites.location,
      })
      .from(heroEmployees)
      .leftJoin(sites, eq(sites.id, heroEmployees.siteId))
      .where(eq(heroEmployees.isActive, true)),
    db.select().from(sites).where(eq(sites.isActive, true)),
  ])

  // Other raw locations to map into master sites
  const otherRawLocations = [
    ...incidentReports.map((row) => row.location),
    ...certifications.map((row) => row.workLocation),
    ...rawManHours.map((row) => row.workLocation),
    ...rawMonthlyManHours.map((row) => row.workLocation),
    ...performanceMetrics.map((row) => row.periodLabel),
    ...activeEmployees.map((e) => e.workLocation),
  ].filter((loc): loc is string => Boolean(loc))

  const { mapping: locationMapping, canonical: locationOptions } = buildMasterSiteLocations(
    masterSitesList,
    otherRawLocations
  )

  // Count active employees per canonical location from User Management (hero_employees)
  const employeeCountsByLocation: Record<string, number> = {}
  for (const emp of activeEmployees) {
    const rawLoc = emp.workLocation || emp.siteName || emp.siteLocation || ""
    if (!rawLoc) continue
    const canonLoc = locationMapping[rawLoc] || rawLoc
    employeeCountsByLocation[canonLoc] = (employeeCountsByLocation[canonLoc] || 0) + 1
    if (emp.workLocation) employeeCountsByLocation[emp.workLocation] = (employeeCountsByLocation[emp.workLocation] || 0) + 1
    if (emp.siteName) employeeCountsByLocation[emp.siteName] = (employeeCountsByLocation[emp.siteName] || 0) + 1
  }

  // Sync employee counts in monthlyManHours and manHours with User Management data
  const monthlyManHours = rawMonthlyManHours.map((row) => {
    const canonLoc = locationMapping[row.workLocation] || row.workLocation
    const countFromEmployees = employeeCountsByLocation[canonLoc] ?? employeeCountsByLocation[row.workLocation]
    return {
      ...row,
      employeeCount: typeof countFromEmployees === "number" && countFromEmployees > 0 ? countFromEmployees : (row.employeeCount || 0),
    }
  })

  const manHours = rawManHours.map((row) => {
    const canonLoc = locationMapping[row.workLocation] || row.workLocation
    const countFromEmployees = employeeCountsByLocation[canonLoc] ?? employeeCountsByLocation[row.workLocation]
    return {
      ...row,
      employeeCount: typeof countFromEmployees === "number" && countFromEmployees > 0 ? countFromEmployees : (row.employeeCount || 0),
    }
  })

  // Build Master Data Lokasi Site Man Hours Summary with collapsible monthly details & last update
  const siteManHoursMap = new Map<string, {
    siteId: number | null
    workLocation: string
    employeeCount: number
    initialManHours: number
    actualMonthlyManHours: number
    safetyManHours: number
    safeTarget: string
    lastUpdate: Date | string | null
    monthlyDetails: typeof monthlyManHours
  }>()

  // Pre-fill from masterSitesList
  for (const siteItem of masterSitesList) {
    const canonName = locationMapping[siteItem.name] || siteItem.name
    const empCount = employeeCountsByLocation[canonName] ?? employeeCountsByLocation[siteItem.name] ?? 0
    siteManHoursMap.set(canonName, {
      siteId: siteItem.id,
      workLocation: siteItem.name,
      employeeCount: empCount,
      initialManHours: 0,
      actualMonthlyManHours: 0,
      safetyManHours: 0,
      safeTarget: "0",
      lastUpdate: siteItem.createdAt ? new Date(siteItem.createdAt) : null,
      monthlyDetails: [],
    })
  }

  // Populate monthly details & sum actualMonthlyManHours (ONLY for valid master sites from hero_sites)
  for (const mRow of monthlyManHours) {
    const canonName = locationMapping[mRow.workLocation] || mRow.workLocation
    let entry = siteManHoursMap.get(canonName) || siteManHoursMap.get(mRow.workLocation)
    if (!entry) {
      const matchingSiteKey = Array.from(siteManHoursMap.keys()).find(
        (key) => key.toUpperCase() === canonName.toUpperCase() || key.toUpperCase() === mRow.workLocation.toUpperCase()
      )
      if (matchingSiteKey) {
        entry = siteManHoursMap.get(matchingSiteKey)
      }
    }
    if (!entry) continue // Ignore non-master site records

    entry.monthlyDetails.push(mRow)
    const hoursNum = parseFloat(`${mRow.safetyManHours || "0"}`.replace(/,/g, ""))
    if (Number.isFinite(hoursNum)) {
      entry.actualMonthlyManHours += hoursNum
    }
    if (mRow.updatedAt) {
      const mDate = new Date(mRow.updatedAt)
      if (!entry.lastUpdate || new Date(entry.lastUpdate).getTime() < mDate.getTime()) {
        entry.lastUpdate = mDate
      }
    }
  }

  // Detect if global start data mode is active (new system)
  const hasGlobalStartData = rawManHours.some((r) => r.workLocation === "__GLOBAL_START_DATA__")

  // Populate safeTarget (always) and initialManHours (only in legacy per-site mode) from safetyManHours table
  for (const mhRow of manHours) {
    // Skip the global key row — it is handled separately as globalStartData
    if (mhRow.workLocation === "__GLOBAL_START_DATA__") continue

    const canonName = locationMapping[mhRow.workLocation] || mhRow.workLocation
    let entry = siteManHoursMap.get(canonName) || siteManHoursMap.get(mhRow.workLocation)
    if (!entry) {
      const matchingSiteKey = Array.from(siteManHoursMap.keys()).find(
        (key) => key.toUpperCase() === canonName.toUpperCase() || key.toUpperCase() === mhRow.workLocation.toUpperCase()
      )
      if (matchingSiteKey) {
        entry = siteManHoursMap.get(matchingSiteKey)
      }
    }
    if (entry) {
      if (mhRow.safeTarget) entry.safeTarget = mhRow.safeTarget
      // Only carry over per-site initial man hours in legacy mode (no global start data set)
      if (!hasGlobalStartData && mhRow.safetyManHours) {
        entry.initialManHours = parseFloat(`${mhRow.safetyManHours || "0"}`.replace(/,/g, "")) || 0
      }
      if (mhRow.updatedAt) {
        const mhDate = new Date(mhRow.updatedAt)
        if (!entry.lastUpdate || new Date(entry.lastUpdate).getTime() < mhDate.getTime()) {
          entry.lastUpdate = mhDate
        }
      }
    }
  }

  const siteManHoursSummary = Array.from(siteManHoursMap.values()).map((item) => ({
    ...item,
    // In global-start-data mode: per-site bar = actual monthly only (initial is in global bar)
    // In legacy mode: per-site bar = initialManHours + actualMonthlyManHours
    safetyManHours: hasGlobalStartData ? item.actualMonthlyManHours : item.initialManHours + item.actualMonthlyManHours,
    monthlyDetails: item.monthlyDetails.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()),
  }))

  let filteredMonthlySummaries = monthlySummaries
  let filteredIncidentReports = incidentReports
  let filteredCertifications = certifications
  let filteredPerformanceMetrics = performanceMetrics
  let filteredManHours = manHours
  let filteredMonthlyManHours = monthlyManHours
  let filteredWeeklyActivities = weeklyActivities

  if (filters?.year) {
    const yearNum = parseInt(filters.year)
    filteredPerformanceMetrics = filteredPerformanceMetrics.filter(row => row.year === yearNum)
    filteredMonthlySummaries = filteredMonthlySummaries.filter(row => {
      const d = new Date(row.month)
      return d.getFullYear() === yearNum
    })
    filteredIncidentReports = filteredIncidentReports.filter(row => {
      if (!row.incidentDate) return false
      const d = new Date(row.incidentDate)
      return d.getFullYear() === yearNum
    })
    filteredCertifications = filteredCertifications.filter(row => {
      if (!row.certificationDate) return true
      const d = new Date(row.certificationDate)
      return d.getFullYear() === yearNum
    })
    filteredMonthlyManHours = filteredMonthlyManHours.filter(row => {
      const d = new Date(row.month)
      return d.getFullYear() === yearNum
    })
    filteredWeeklyActivities = filteredWeeklyActivities.filter(row => {
      if (!row.activityDate) return true
      const d = new Date(row.activityDate)
      return d.getFullYear() === yearNum
    })
  }

  if (filters?.month) {
    const monthNum = parseInt(filters.month)
    filteredMonthlySummaries = filteredMonthlySummaries.filter(row => {
      const d = new Date(row.month)
      return d.getMonth() === monthNum
    })
    filteredIncidentReports = filteredIncidentReports.filter(row => {
      if (!row.incidentDate) return false
      const d = new Date(row.incidentDate)
      return d.getMonth() === monthNum
    })
    filteredCertifications = filteredCertifications.filter(row => {
      if (!row.certificationDate) return true
      const d = new Date(row.certificationDate)
      return d.getMonth() === monthNum
    })
    filteredMonthlyManHours = filteredMonthlyManHours.filter(row => {
      const d = new Date(row.month)
      return d.getMonth() === monthNum
    })
    filteredWeeklyActivities = filteredWeeklyActivities.filter(row => {
      if (!row.activityDate) return true
      const d = new Date(row.activityDate)
      return d.getMonth() === monthNum
    })
  }

  if (filters?.location) {
    const selectedLocs = filters.location.split(",").map((s) => s.trim()).filter(Boolean)
    if (selectedLocs.length > 0) {
      filteredIncidentReports = filteredIncidentReports.filter(row => selectedLocs.includes(locationMapping[row.location]))
      filteredCertifications = filteredCertifications.filter(row => selectedLocs.includes(locationMapping[row.workLocation]))
      filteredManHours = filteredManHours.filter(row => selectedLocs.includes(locationMapping[row.workLocation]))
      filteredMonthlyManHours = filteredMonthlyManHours.filter(row => selectedLocs.includes(locationMapping[row.workLocation]))
      filteredPerformanceMetrics = filteredPerformanceMetrics.filter(row => selectedLocs.includes(locationMapping[row.periodLabel]))
    }
  }

  let filteredSiteManHoursSummary = siteManHoursSummary
  if (filters?.location) {
    const selectedLocs = filters.location.split(",").map((s) => s.trim()).filter(Boolean)
    if (selectedLocs.length > 0) {
      filteredSiteManHoursSummary = filteredSiteManHoursSummary.filter(row => selectedLocs.includes(row.workLocation))
    }
  }

  const globalMhRow = rawManHours.find((r) => r.workLocation === "__GLOBAL_START_DATA__")
  const globalInitialManHours = parseFloat(`${globalMhRow?.safetyManHours || "0"}`.replace(/,/g, "")) || 0
  const globalSafeTarget = parseFloat(`${globalMhRow?.safeTarget || "0"}`.replace(/,/g, "")) || 0

  const totalActualMonthlyManHours = siteManHoursSummary.reduce((sum, item) => sum + (item.actualMonthlyManHours || 0), 0)
  const totalSystemSafeManHours = globalInitialManHours + totalActualMonthlyManHours

  const globalStartData = {
    initialManHours: globalInitialManHours,
    safeTarget: globalSafeTarget,
    totalActualMonthlyManHours,
    totalSystemSafeManHours,
    lastUpdate: globalMhRow?.updatedAt ? new Date(globalMhRow.updatedAt) : null,
  }

  const kpis = buildSafetyKpis({ 
    monthlySummaries: filteredMonthlySummaries, 
    certifications: filteredCertifications, 
    weeklyActivities: filteredWeeklyActivities, 
    manHours: filteredManHours,
    siteManHoursSummary: filteredSiteManHoursSummary,
    globalStartData,
  })
  
  const charts = buildSafetyCharts({ 
    monthlySummaries: filteredMonthlySummaries, 
    certifications: filteredCertifications, 
    weeklyActivities: filteredWeeklyActivities, 
    manHours: filteredManHours, 
    monthlyManHours: filteredMonthlyManHours, 
    siteManHoursSummary: filteredSiteManHoursSummary,
    performanceMetrics: filteredPerformanceMetrics 
  })

  // Extract all available years from the full dataset (not just filtered)
  const allYears = new Set([
    ...yearlySummaries.map(r => r.year ? `${r.year}` : ''),
    ...performanceMetrics.map(r => r.year ? `${r.year}` : ''),
    ...monthlySummaries.map(r => r.month ? new Date(r.month).getFullYear().toString() : ''),
    ...incidentReports.map(r => r.incidentDate ? new Date(r.incidentDate).getFullYear().toString() : ''),
    ...certifications.map(r => r.certificationDate ? new Date(r.certificationDate).getFullYear().toString() : ''),
    ...monthlyManHours.map(r => r.month ? new Date(r.month).getFullYear().toString() : ''),
    ...weeklyActivities.map(r => r.activityDate ? new Date(r.activityDate).getFullYear().toString() : ''),
  ].filter(y => y && y !== 'NaN'))

  return {
    yearlySummaries,
    monthlySummaries,
    incidentReports,
    certifications,
    performanceMetrics,
    manHours,
    monthlyManHours,
    siteManHoursSummary,
    globalStartData,
    masterSites: masterSitesList,
    weeklyActivities,
    inspections,
    inductions,
    kpis,
    charts,
    filterOptions: {
      locations: locationOptions,
      categories: Array.from(new Set([
        ...incidentReports.map((row) => row.category),
        ...weeklyActivities.map((row) => row.category),
        ...inspections.map((row) => row.category),
      ].filter(Boolean))).sort(),
      statuses: Array.from(new Set([
        ...incidentReports.map((row) => row.status),
        ...certifications.map((row) => row.status),
        ...inspections.map((row) => row.status),
      ].filter(Boolean))).sort(),
      departments: Array.from(new Set([
        ...incidentReports.map((row) => row.department),
        ...certifications.map((row) => row.picDepartment),
      ].filter(Boolean))).sort(),
      workAreas: Array.from(new Set([
        ...certifications.map((row) => row.workArea),
      ].filter(Boolean))).sort(),
      equipmentClassifications: Array.from(new Set([
        ...certifications.map((row) => row.equipmentClassification),
      ].filter(Boolean))).sort(),
      regulations: Array.from(new Set([
        ...certifications.map((row) => row.regulation),
      ].filter(Boolean))).sort(),
      pics: Array.from(new Set([
        ...weeklyActivities.map((row) => row.pic),
        ...inspections.map((row) => row.picName),
      ].filter(Boolean))).sort(),
      years: Array.from(allYears).sort().reverse(),
      months: [
        { value: "0", label: "Januari" },
        { value: "1", label: "Februari" },
        { value: "2", label: "Maret" },
        { value: "3", label: "April" },
        { value: "4", label: "Mei" },
        { value: "5", label: "Juni" },
        { value: "6", label: "Juli" },
        { value: "7", label: "Agustus" },
        { value: "8", label: "September" },
        { value: "9", label: "Oktober" },
        { value: "10", label: "November" },
        { value: "11", label: "Desember" },
      ],
    },
    access,
  }
}
