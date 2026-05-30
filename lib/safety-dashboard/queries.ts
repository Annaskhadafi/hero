import { desc } from "drizzle-orm"
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

export async function getSafetyDashboardData() {
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

  const kpis = buildSafetyKpis({ monthlySummaries, certifications, weeklyActivities, manHours })
  const charts = buildSafetyCharts({ monthlySummaries, certifications, weeklyActivities, manHours, monthlyManHours, performanceMetrics })

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
      locations: Array.from(new Set([
        ...incidentReports.map((row) => row.location),
        ...certifications.map((row) => row.workLocation),
        ...manHours.map((row) => row.workLocation),
        ...monthlyManHours.map((row) => row.workLocation),
      ].filter(Boolean))).sort(),
      categories: Array.from(new Set([
        ...incidentReports.map((row) => row.category),
        ...weeklyActivities.map((row) => row.category),
      ].filter(Boolean))).sort(),
      statuses: Array.from(new Set([
        ...incidentReports.map((row) => row.status),
        ...certifications.map((row) => row.status),
      ].filter(Boolean))).sort(),
      years: Array.from(new Set([
        ...yearlySummaries.map((row) => `${row.year}`),
        ...performanceMetrics.map((row) => `${row.year}`),
      ])).sort().reverse(),
    },
    access,
  }
}
