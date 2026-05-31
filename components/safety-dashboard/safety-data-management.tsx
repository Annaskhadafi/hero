import Link from "next/link"

import { AdminStatusBadge } from "@/components/admin-status-badge"
import { AdminTableCard } from "@/components/admin-table-card"
import {
  CertificationRowActions,
  CreateCertificationButton,
  CreateIncidentReportButton,
  CreateManHoursButton,
  CreateMonthlyManHoursButton,
  CreateMonthlySummaryButton,
  CreatePerformanceButton,
  CreateWeeklyActivityButton,
  CreateYearlySummaryButton,
  IncidentReportRowActions,
  ManHoursRowActions,
  MonthlyManHoursRowActions,
  MonthlySummaryRowActions,
  PerformanceRowActions,
  WeeklyActivityRowActions,
  YearlySummaryRowActions,
} from "@/components/safety-dashboard/safety-record-dialogs"
import { TableFilterPresets } from "@/components/table-filter-presets"
import { TableMultiFilter } from "@/components/ui/table-multi-filter"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { getSafetyDashboardData } from "@/lib/safety-dashboard/queries"

type SafetyData = Awaited<ReturnType<typeof getSafetyDashboardData>>

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID")
}

function formatNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return new Intl.NumberFormat("id-ID").format(Number.isFinite(parsed) ? parsed : 0)
}

function filterOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }))
}

export function SafetyDataManagement({ data }: { data: SafetyData }) {
  const locationOptions = filterOptions(data.filterOptions.locations)
  const categoryOptions = filterOptions(data.filterOptions.categories)
  const statusOptions = filterOptions(data.filterOptions.statuses)
  const yearOptions = filterOptions(data.filterOptions.years)

  return (
    <Tabs defaultValue="incident-reports" className="space-y-4">
      <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
        <TabsTrigger value="incident-reports">Incident Reports</TabsTrigger>
        <TabsTrigger value="yearly-summary">Yearly Summary</TabsTrigger>
        <TabsTrigger value="monthly-summary">Monthly Summary</TabsTrigger>
        <TabsTrigger value="certifications">Certifications</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="man-hours">Man Hours</TabsTrigger>
        <TabsTrigger value="monthly-man-hours">Monthly Man Hours</TabsTrigger>
        <TabsTrigger value="weekly">Weekly Activities</TabsTrigger>
      </TabsList>

      <TabsContent value="incident-reports">
        <AdminTableCard
          title="Incident reports"
          description="Form, import, export, dan CRUD incident individual."
          columns={["Nama", "Departemen", "Incident", "Property Damage", "Lokasi", "Category", "Tanggal", "Status", "Action"]}
          dateFilter
          access={data.access}
          actions={<CreateIncidentReportButton access={data.access} />}
          presets={<TableFilterPresets presets={[{ label: "Open", filters: { status: "open" } }, { label: "Property Damage", filters: { category: "Property Damage" } }]} />}
          filters={
            <>
              <TableMultiFilter label="lokasi" filterKey="location" options={locationOptions} />
              <TableMultiFilter label="category" filterKey="category" options={categoryOptions} />
              <TableMultiFilter label="status" filterKey="status" options={statusOptions} />
            </>
          }
          scorecards={[{ label: "Total", value: data.incidentReports.length, description: "Incident detail" }, { label: "Open", value: data.incidentReports.filter((row) => row.status === "open").length, description: "Belum ditutup", tone: "warning" }]}
          rows={data.incidentReports.map((row) => [row.workerName, row.department, row.incidentDescription, row.propertyDamage, row.location, row.category, formatDate(row.incidentDate), <AdminStatusBadge key={`${row.id}-status`} value={row.status} />, <IncidentReportRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
          rowAttributes={data.incidentReports.map((row) => ({ "data-date-value": row.incidentDate ? `${row.incidentDate}` : "", "data-filter-location": row.location, "data-filter-category": row.category, "data-filter-status": row.status }))}
        />
      </TabsContent>

      <TabsContent value="yearly-summary">
        <AdminTableCard
          title="Incident yearly summary"
          description="Form, import, export, dan CRUD rekap incident tahunan."
          columns={["Year", "FTL", "LDI", "RWDI", "MTC", "FA", "PD", "NR", "ENV", "FTG", "Total", "Action"]}
          dateFilter={false}
          access={data.access}
          actions={<CreateYearlySummaryButton access={data.access} />}
          filters={<TableMultiFilter label="tahun" filterKey="year" options={yearOptions} />}
          rows={data.yearlySummaries.map((row) => [row.year, row.fatality, row.lostDayInjury, row.restrictedWorkDayInjury, row.medicalTreatmentCase, row.firstAid, row.propertyDamage, row.nearMissReport, row.environmental, row.fatigue, row.totalEvents, <YearlySummaryRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
          rowAttributes={data.yearlySummaries.map((row) => ({ "data-filter-year": `${row.year}` }))}
        />
      </TabsContent>

      <TabsContent value="monthly-summary">
        <AdminTableCard
          title="Incident monthly summary"
          description="Form, import, export, dan CRUD rekap incident bulanan."
          columns={["Month", "Fatality", "LDI", "RWDI", "MTC", "FA", "PD", "NR", "ENV", "Total", "Action"]}
          dateFilter
          access={data.access}
          actions={<CreateMonthlySummaryButton access={data.access} />}
          rows={data.monthlySummaries.map((row) => [formatDate(row.month), row.fatality, row.lostDayInjury, row.restrictedWorkDayInjury, row.medicalTreatmentCase, row.firstAid, row.propertyDamage, row.nearMissReport, row.environmental, row.totalEvents, <MonthlySummaryRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
          rowAttributes={data.monthlySummaries.map((row) => ({ "data-date-value": `${row.month}` }))}
        />
      </TabsContent>

      <TabsContent value="certifications">
        <AdminTableCard
          title="Safety certifications"
          description="Form, import, export, dan CRUD sertifikasi alat."
          columns={["Nama Alat", "PIC Dept", "Area Kerja", "Klasifikasi", "Sertifikator", "Sertifikasi", "Next Sert.", "Status", "Regulasi", "Lokasi", "Action"]}
          dateFilter
          access={data.access}
          actions={<CreateCertificationButton access={data.access} />}
          presets={<TableFilterPresets presets={[{ label: "Expired", filters: { status: "EXPIRED" } }, { label: "Aktif", filters: { status: "AKTIF" } }]} />}
          filters={
            <>
              <TableMultiFilter label="lokasi" filterKey="location" options={locationOptions} />
              <TableMultiFilter label="status" filterKey="status" options={statusOptions} />
            </>
          }
          scorecards={[{ label: "Total alat", value: data.certifications.length, description: "Sertifikasi tercatat" }, { label: "Expired", value: data.kpis.certificationExpired, description: "Perlu follow up", tone: "danger" }]}
          rows={data.certifications.map((row) => [row.equipmentName, row.picDepartment, row.workArea, row.equipmentClassification, row.certifier, formatDate(row.certificationDate), formatDate(row.nextCertificationDate), <AdminStatusBadge key={`${row.id}-status`} value={row.status} />, row.regulation, row.workLocation, <CertificationRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
          rowAttributes={data.certifications.map((row) => ({ "data-date-value": row.nextCertificationDate ? `${row.nextCertificationDate}` : "", "data-filter-location": row.workLocation, "data-filter-status": row.status }))}
        />
      </TabsContent>

      <TabsContent value="performance">
        <AdminTableCard
          title="Safety performance"
          description="Form, import, export, dan CRUD safety performance."
          columns={["Year", "Periode", "Karyawan", "Safe Man Hours", "Fatality T/A", "LTI T/A", "PD T/A", "Action"]}
          dateFilter={false}
          access={data.access}
          actions={<CreatePerformanceButton access={data.access} />}
          filters={<TableMultiFilter label="tahun" filterKey="year" options={yearOptions} />}
          rows={data.performanceMetrics.map((row) => [row.year, row.periodLabel, row.employeeCount, formatNumber(row.safeManHoursUpToYear), `${row.fatalityThreshold} / ${row.fatalityActual}`, `${row.ltiThreshold} / ${row.ltiActual}`, `${row.propertyDamageThreshold} / ${row.propertyDamageActual}`, <PerformanceRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
          rowAttributes={data.performanceMetrics.map((row) => ({ "data-filter-year": `${row.year}` }))}
        />
      </TabsContent>

      <TabsContent value="man-hours">
        <AdminTableCard
          title="Safety man hours"
          description="Form, import, export, dan CRUD safe manhours kumulatif."
          columns={["Lokasi", "Karyawan", "Safety Man Hours", "Target Aman", "Pendapatan/Minggu", "Action"]}
          dateFilter={false}
          access={data.access}
          actions={<CreateManHoursButton access={data.access} />}
          filters={<TableMultiFilter label="lokasi" filterKey="location" options={locationOptions} />}
          rows={data.manHours.map((row) => [row.workLocation, row.employeeCount, formatNumber(row.safetyManHours), formatNumber(row.safeTarget), row.averageWeeklyRevenue ? formatNumber(row.averageWeeklyRevenue) : "-", <ManHoursRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
          rowAttributes={data.manHours.map((row) => ({ "data-filter-location": row.workLocation }))}
        />
      </TabsContent>

      <TabsContent value="monthly-man-hours">
        <AdminTableCard
          title="Monthly safety man hours"
          description="Form, import, export, dan CRUD safe manhours bulanan."
          columns={["Lokasi", "Karyawan", "Bulan", "Safety Man Hours", "Action"]}
          dateFilter
          access={data.access}
          actions={<CreateMonthlyManHoursButton access={data.access} />}
          filters={<TableMultiFilter label="lokasi" filterKey="location" options={locationOptions} />}
          rows={data.monthlyManHours.map((row) => [row.workLocation, row.employeeCount, formatDate(row.month), formatNumber(row.safetyManHours), <MonthlyManHoursRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
          rowAttributes={data.monthlyManHours.map((row) => ({ "data-date-value": `${row.month}`, "data-filter-location": row.workLocation }))}
        />
      </TabsContent>

      <TabsContent value="weekly">
        <AdminTableCard
          title="Weekly safety activities"
          description="Form, import, export, dan CRUD aktivitas K3 mingguan."
          columns={["Kegiatan", "Tanggal", "PIC", "Kategori", "Evidence", "Action"]}
          dateFilter
          access={data.access}
          actions={<CreateWeeklyActivityButton access={data.access} />}
          filters={<TableMultiFilter label="category" filterKey="category" options={categoryOptions} />}
          rows={data.weeklyActivities.map((row) => [row.activity, formatDate(row.activityDate), row.pic, row.category, row.evidenceUrl ? <Link key={`${row.id}-link`} href={row.evidenceUrl} className="text-primary underline" target="_blank">Buka bukti</Link> : "-", <WeeklyActivityRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
          rowAttributes={data.weeklyActivities.map((row) => ({ "data-date-value": row.activityDate ? `${row.activityDate}` : "", "data-filter-category": row.category }))}
        />
      </TabsContent>
    </Tabs>
  )
}
