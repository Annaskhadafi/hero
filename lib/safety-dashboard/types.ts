export const SAFETY_WORKBOOK_SHEETS = {
  yearlyIncident: "INCIDENT RECORD",
  certifications: "Sertifikasi Safety",
  performance: "Safety Performance 2025",
  manHours: "Safety Man Hours",
  monthlyManHours: "Fix Month Safety man",
  monthlyIncident: "Incedent Record",
  incidentReports: "Detail Incident Report",
  weeklyActivities: " Weekly Report",
} as const

export const SAFETY_WORKBOOK_SHEET_NAMES = Object.values(SAFETY_WORKBOOK_SHEETS || {})

export type SafetyImportSheetSummary = {
  sheet: string
  read: number
  inserted: number
  skipped: number
  errors: string[]
}

export type SafetyDashboardAccess = {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll: boolean
}

export const SAFETY_INCIDENT_CATEGORIES = [
  "Fatality",
  "Lost Day Injury",
  "Restricted Work Day Injury",
  "Medical Treatment Case",
  "First Aid",
  "Property Damage",
  "Near Miss Report",
  "Environmental",
] as const
