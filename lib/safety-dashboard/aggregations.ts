function asNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function monthLabel(value: Date | string | null) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("id-ID", { month: "short", year: "numeric" })
}

type MonthlyIncidentLike = {
  month: Date | string
  fatality: number
  lostDayInjury: number
  restrictedWorkDayInjury: number
  medicalTreatmentCase: number
  firstAid: number
  propertyDamage: number
  nearMissReport: number
  environmental: number
  totalEvents: number
}

type CertificationLike = { status: string }
type WeeklyActivityLike = { activityDate: Date | string | null }
type ManHoursLike = { safetyManHours: unknown; workLocation: string; safeTarget?: unknown }
type PerformanceLike = {
  periodLabel: string
  fatalityThreshold: unknown
  fatalityActual: unknown
  ltiThreshold: unknown
  ltiActual: unknown
  propertyDamageThreshold: unknown
  propertyDamageActual: unknown
}

export function buildSafetyKpis(input: {
  monthlySummaries: MonthlyIncidentLike[]
  certifications: CertificationLike[]
  weeklyActivities: WeeklyActivityLike[]
  manHours: ManHoursLike[]
}) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const ytdRows = input.monthlySummaries.filter((row) => {
    const date = row.month instanceof Date ? row.month : new Date(row.month)
    return !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear
  })
  const sum = (selector: (row: MonthlyIncidentLike) => number) => ytdRows.reduce((total, row) => total + selector(row), 0)
  const weeklyThisMonth = input.weeklyActivities.filter((row) => {
    if (!row.activityDate) return false
    const date = row.activityDate instanceof Date ? row.activityDate : new Date(row.activityDate)
    return !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear && date.getMonth() === currentMonth
  }).length

  return {
    totalIncidentYtd: sum((row) => row.totalEvents),
    fatality: sum((row) => row.fatality),
    lti: sum((row) => row.lostDayInjury),
    medicalTreatmentCase: sum((row) => row.medicalTreatmentCase),
    firstAid: sum((row) => row.firstAid),
    propertyDamage: sum((row) => row.propertyDamage),
    nearMiss: sum((row) => row.nearMissReport),
    safeManHours: input.manHours.reduce((total, row) => total + asNumber(row.safetyManHours), 0),
    certificationExpired: input.certifications.filter((row) => row.status.toUpperCase() === "EXPIRED").length,
    weeklyActivitiesThisMonth: weeklyThisMonth,
  }
}

export function buildSafetyCharts(input: {
  monthlySummaries: MonthlyIncidentLike[]
  certifications: CertificationLike[]
  weeklyActivities: Array<WeeklyActivityLike & { category: string }>
  manHours: ManHoursLike[]
  monthlyManHours: Array<ManHoursLike & { month: Date | string }>
  performanceMetrics: PerformanceLike[]
}) {
  const certificationStatus = input.certifications.reduce<Record<string, number>>((acc, row) => {
    const key = row.status || "UNKNOWN"
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const weeklyCategory = input.weeklyActivities.reduce<Record<string, number>>((acc, row) => {
    const key = row.category || "Uncategorized"
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return {
    incidentTrend: input.monthlySummaries.map((row) => ({
      month: monthLabel(row.month),
      Fatality: row.fatality,
      LTI: row.lostDayInjury,
      MTC: row.medicalTreatmentCase,
      FA: row.firstAid,
      PD: row.propertyDamage,
      NearMiss: row.nearMissReport,
      Total: row.totalEvents,
    })),
    certificationStatus: Object.entries(certificationStatus).map(([name, value]) => ({ name, value })),
    weeklyActivitiesByCategory: Object.entries(weeklyCategory).map(([category, count]) => ({ category, count })),
    manHoursByLocation: input.manHours.map((row) => ({
      location: row.workLocation,
      manHours: asNumber(row.safetyManHours),
      target: asNumber(row.safeTarget),
    })),
    monthlyManHoursTrend: Object.entries(
      input.monthlyManHours.reduce<Record<string, number>>((acc, row) => {
        const m = monthLabel(row.month)
        acc[m] = (acc[m] || 0) + asNumber(row.safetyManHours)
        return acc
      }, {})
    ).map(([month, manHours]) => ({ month, manHours })).reverse(),
    performanceComparison: input.performanceMetrics.map((row) => ({
      site: row.periodLabel,
      fatalityThreshold: asNumber(row.fatalityThreshold),
      fatalityActual: asNumber(row.fatalityActual),
      ltiThreshold: asNumber(row.ltiThreshold),
      ltiActual: asNumber(row.ltiActual),
      propertyDamageThreshold: asNumber(row.propertyDamageThreshold),
      propertyDamageActual: asNumber(row.propertyDamageActual),
    })),
  }
}
