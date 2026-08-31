import { render } from "@testing-library/react"

import { SafetyDataManagement } from "@/components/safety-dashboard/safety-data-management"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

jest.mock("@/app/actions/upload", () => ({
  uploadFileAction: jest.fn(),
}))

jest.mock("@/lib/auth-session", () => ({
  getServerSession: jest.fn(),
  getCurrentSessionUser: jest.fn(),
}))

jest.mock("@/app/dashboard/safety/actions", () => ({
  manageSafetyCertificationAction: jest.fn(),
  manageSafetyIncidentReportAction: jest.fn(),
  manageSafetyIncidentSummaryMonthlyAction: jest.fn(),
  manageSafetyIncidentSummaryYearlyAction: jest.fn(),
  manageSafetyManHoursAction: jest.fn(),
  manageSafetyMonthlyManHoursAction: jest.fn(),
  manageSafetyPerformanceAction: jest.fn(),
  manageSafetyWeeklyActivityAction: jest.fn(),
}))

const emptyData = {
  access: { canView: true, canEdit: true, canDelete: true },
  filterOptions: {
    locations: ["Site A"],
    categories: ["Property Damage"],
    statuses: ["open", "closed", "AKTIF", "EXPIRED"],
    departments: ["HSE"],
    workAreas: ["Workshop"],
    equipmentClassifications: ["Crane"],
    regulations: ["Regulation A"],
    pics: ["PIC A"],
    years: ["2026"],
  },
  kpis: { certificationExpired: 0 },
  charts: {},
  incidentReports: [
    {
      id: 1,
      workerName: "Worker",
      department: "HSE",
      incidentDescription: "Incident",
      propertyDamage: "None",
      location: "Site A",
      category: "Property Damage",
      incidentDate: "2026-05-31",
      notes: "",
      status: "open",
    },
  ],
  yearlySummaries: [],
  monthlySummaries: [],
  certifications: [],
  performanceMetrics: [],
  manHours: [],
  monthlyManHours: [],
  weeklyActivities: [],
}

describe("SafetyDataManagement", () => {
  it("does not emit React unique key warnings", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})

    render(<SafetyDataManagement data={emptyData as unknown as Parameters<typeof SafetyDataManagement>[0]["data"]} />)

    const keyWarnings = consoleError.mock.calls.filter(([message]) =>
      String(message).includes('Each child in a list should have a unique "key" prop'),
    )

    consoleError.mockRestore()
    expect(keyWarnings).toHaveLength(0)
  })
})
