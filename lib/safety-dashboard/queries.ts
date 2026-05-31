import { desc } from "drizzle-orm"
import Fuse from "fuse.js"
import { db } from "@/db"
import {
  safetyCertifications,
  safetyIncidentReports,
  safetyIncidentSummaryMonthly,
  safetyIncidentSummaryYearly,
  safetyManHours,
  safetyMonthlyManHours,
  safetyPerformanceMetrics,
  safetyWeeklyActivities,
} from "@/db/schema/hero"
import { getCurrentEmployeeAccessRole } from "@/lib/hero-access"
import { buildSafetyCharts, buildSafetyKpis } from "@/lib/safety-dashboard/aggregations"
import type { SafetyDashboardAccess } from "@/lib/safety-dashboard/types"

async function getSafetyAccess(): Promise<SafetyDashboardAccess> {
  const role = (await getCurrentEmployeeAccessRole())?.toLowerCase() ?? ""
  const canEdit = ["super admin", "safety officer", "site admin", "admin"].some((allowed) => role.includes(allowed))

  return {
    canView: true,
    canEdit,
    canDelete: canEdit,
    canSelectAll: canEdit,
  }
}

function getCanonicalLocations(rawLocations: string[]) {
  const mapping: Record<string, string> = {}
  const canonical: string[] = []

  // Sort by length ascending so base names like "CK MHU" come before variations like "CK MHU (HO)"
  const uniqueLocations = Array.from(new Set(rawLocations.filter(Boolean))).sort((a, b) => a.length - b.length)

  const fuse = new Fuse(canonical, {
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
  })

  for (const raw of uniqueLocations) {
    if (canonical.length === 0) {
      canonical.push(raw)
      mapping[raw] = raw
      continue
    }

    const normalizedRaw = raw.toUpperCase().replace(/[-_]/g, " ").trim()
    
    // Exact or substring match (e.g. "CK MHU" inside "CK MHU SITE")
    const substringMatch = canonical.find(c => {
      const normalizedC = c.toUpperCase().replace(/[-_]/g, " ").trim()
      // Use length > 3 to avoid matching random short acronyms to everything
      return normalizedC.length >= 3 && (normalizedRaw === normalizedC || normalizedRaw.includes(normalizedC))
    })

    if (substringMatch) {
      mapping[raw] = substringMatch
      continue
    }

    fuse.setCollection(canonical)
    const results = fuse.search(raw)
    
    if (results.length > 0 && results[0].score !== undefined && results[0].score <= 0.3) {
      mapping[raw] = results[0].item
    } else {
      canonical.push(raw)
      mapping[raw] = raw
    }
  }

  return { mapping, canonical: canonical.sort() }
}

export async function getSafetyDashboardData(filters?: { year?: string; location?: string }) {
  const [
    yearlySummaries,
    monthlySummaries,
    incidentReports,
    certifications,
    performanceMetrics,
    manHours,
    monthlyManHours,
    weeklyActivities,
    access,
  ] = await Promise.all([
    db.select().from(safetyIncidentSummaryYearly).orderBy(desc(safetyIncidentSummaryYearly.year)),
    db.select().from(safetyIncidentSummaryMonthly).orderBy(desc(safetyIncidentSummaryMonthly.month)),
    db.select().from(safetyIncidentReports).orderBy(desc(safetyIncidentReports.incidentDate)),
    db.select().from(safetyCertifications).orderBy(desc(safetyCertifications.nextCertificationDate)),
    db.select().from(safetyPerformanceMetrics).orderBy(desc(safetyPerformanceMetrics.year)),
    db.select().from(safetyManHours).orderBy(desc(safetyManHours.safetyManHours)),
    db.select().from(safetyMonthlyManHours).orderBy(desc(safetyMonthlyManHours.month)),
    db.select().from(safetyWeeklyActivities).orderBy(desc(safetyWeeklyActivities.activityDate)),
    getSafetyAccess(),
  ])

  // Group locations using Fuse.js and substring matching
  const allRawLocations = [
    ...incidentReports.map((row) => row.location),
    ...certifications.map((row) => row.workLocation),
    ...manHours.map((row) => row.workLocation),
    ...monthlyManHours.map((row) => row.workLocation),
    ...performanceMetrics.map((row) => row.periodLabel), // site/location
  ]
  const { mapping: locationMapping, canonical: locationOptions } = getCanonicalLocations(allRawLocations)

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

  if (filters?.location) {
    const loc = filters.location
    filteredIncidentReports = filteredIncidentReports.filter(row => locationMapping[row.location] === loc)
    filteredCertifications = filteredCertifications.filter(row => locationMapping[row.workLocation] === loc)
    filteredManHours = filteredManHours.filter(row => locationMapping[row.workLocation] === loc)
    filteredMonthlyManHours = filteredMonthlyManHours.filter(row => locationMapping[row.workLocation] === loc)
    filteredPerformanceMetrics = filteredPerformanceMetrics.filter(row => locationMapping[row.periodLabel] === loc)
  }

  const kpis = buildSafetyKpis({ 
    monthlySummaries: filteredMonthlySummaries, 
    certifications: filteredCertifications, 
    weeklyActivities: filteredWeeklyActivities, 
    manHours: filteredManHours 
  })
  
  const charts = buildSafetyCharts({ 
    monthlySummaries: filteredMonthlySummaries, 
    certifications: filteredCertifications, 
    weeklyActivities: filteredWeeklyActivities, 
    manHours: filteredManHours, 
    monthlyManHours: filteredMonthlyManHours, 
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
    weeklyActivities,
    kpis,
    charts,
    filterOptions: {
      locations: locationOptions,
      categories: Array.from(new Set([
        ...incidentReports.map((row) => row.category),
        ...weeklyActivities.map((row) => row.category),
      ].filter(Boolean))).sort(),
      statuses: Array.from(new Set([
        ...incidentReports.map((row) => row.status),
        ...certifications.map((row) => row.status),
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
      ].filter(Boolean))).sort(),
      years: Array.from(allYears).sort().reverse(),
    },
    access,
  }
}
