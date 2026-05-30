import Link from "next/link"
import { Activity, AlertTriangle, BadgeCheck, Clock, FileWarning, ShieldCheck } from "lucide-react"

import { AdminPageShell } from "@/components/admin-page-shell"
import { AdminStatusBadge } from "@/components/admin-status-badge"
import { AdminTableCard } from "@/components/admin-table-card"
import {
  CertificationRowActions,
  IncidentReportRowActions,
  ManHoursRowActions,
  MonthlyManHoursRowActions,
  PerformanceRowActions,
  WeeklyActivityRowActions,
} from "@/components/safety-dashboard/safety-record-dialogs"
import { SafetyDashboardCharts } from "@/components/safety-dashboard/safety-dashboard-charts"
import { TableFilterPresets } from "@/components/table-filter-presets"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TableMultiFilter } from "@/components/ui/table-multi-filter"
import { EnterpriseScorecards } from "@/components/ui/enterprise-table-kit"
import { getSafetyDashboardData } from "@/lib/safety-dashboard/queries"

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

export default async function SafetyDashboardPage() {
  const data = await getSafetyDashboardData()
  const locationOptions = filterOptions(data.filterOptions.locations)
  const categoryOptions = filterOptions(data.filterOptions.categories)
  const statusOptions = filterOptions(data.filterOptions.statuses)
  const yearOptions = filterOptions(data.filterOptions.years)

  return (
    <AdminPageShell
      eyebrow="Safety Dashboard"
      title="Safety Dashboard"
      description="Monitoring KPI K3, incident, certification, manhours, performance, dan aktivitas safety mingguan."
    >
      <EnterpriseScorecards
        items={[
          { label: "Incident YTD", value: formatNumber(data.kpis.totalIncidentYtd), description: "Total event tahun berjalan", icon: <FileWarning className="size-5" />, tone: "warning" },
          { label: "Fatality", value: formatNumber(data.kpis.fatality), description: "Fatality tahun berjalan", icon: <AlertTriangle className="size-5" />, tone: data.kpis.fatality > 0 ? "danger" : "success" },
          { label: "Safe Man Hours", value: formatNumber(data.kpis.safeManHours), description: "Akumulasi dari workbook", icon: <Clock className="size-5" />, tone: "info" },
          { label: "Expired Cert.", value: formatNumber(data.kpis.certificationExpired), description: "Sertifikasi perlu follow up", icon: <BadgeCheck className="size-5" />, tone: data.kpis.certificationExpired > 0 ? "danger" : "success" },
          { label: "Near Miss", value: formatNumber(data.kpis.nearMiss), description: "Near miss YTD", icon: <ShieldCheck className="size-5" />, tone: "success" },
          { label: "Property Damage", value: formatNumber(data.kpis.propertyDamage), description: "Property damage YTD", icon: <AlertTriangle className="size-5" />, tone: "warning" },
          { label: "First Aid", value: formatNumber(data.kpis.firstAid), description: "First aid YTD", icon: <Activity className="size-5" />, tone: "info" },
          { label: "Weekly Activity", value: formatNumber(data.kpis.weeklyActivitiesThisMonth), description: "Aktivitas bulan ini", icon: <Activity className="size-5" />, tone: "default" },
        ]}
      />

      <SafetyDashboardCharts charts={data.charts} />

      <Tabs defaultValue="incident-reports" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="incident-reports">Incident Reports</TabsTrigger>
          <TabsTrigger value="incident-summary">Incident Summary</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="performance">Safety Performance</TabsTrigger>
          <TabsTrigger value="man-hours">Man Hours</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="incident-reports">
          <AdminTableCard
            title="Incident reports"
            description="Detail incident individual hasil migrasi workbook dan input manual aplikasi."
            columns={["Nama", "Departemen", "Incident", "Property Damage", "Lokasi", "Category", "Tanggal", "Status", "Action"]}
            dateFilter
            access={data.access}
            presets={<TableFilterPresets presets={[{ label: "Open", filters: { status: "open" } }, { label: "Property Damage", filters: { category: "Property Damage" } }]} />}
            filters={(
              <>
                <TableMultiFilter label="lokasi" filterKey="location" options={locationOptions} />
                <TableMultiFilter label="category" filterKey="category" options={categoryOptions} />
                <TableMultiFilter label="status" filterKey="status" options={statusOptions} />
              </>
            )}
            scorecards={[
              { label: "Total", value: data.incidentReports.length, description: "Incident detail" },
              { label: "Open", value: data.incidentReports.filter((row) => row.status === "open").length, description: "Belum ditutup", tone: "warning" },
            ]}
            rows={data.incidentReports.map((row) => [
              row.workerName,
              row.department,
              row.incidentDescription,
              row.propertyDamage,
              row.location,
              row.category,
              formatDate(row.incidentDate),
              <AdminStatusBadge key={`${row.id}-status`} value={row.status} />,
              <IncidentReportRowActions key={`${row.id}-actions`} row={row} access={data.access} />,
            ])}
            rowAttributes={data.incidentReports.map((row) => ({
              "data-date-value": row.incidentDate ? `${row.incidentDate}` : "",
              "data-filter-location": row.location,
              "data-filter-category": row.category,
              "data-filter-status": row.status,
            }))}
          />
        </TabsContent>

        <TabsContent value="incident-summary" className="grid gap-4 xl:grid-cols-2">
          <AdminTableCard
            title="Incident yearly summary"
            description="Rekap incident tahunan dari sheet INCIDENT RECORD."
            columns={["Year", "FTL", "LDI", "RWDI", "MTC", "FA", "PD", "NR", "ENV", "FTG", "Total"]}
            dateFilter={false}
            access={data.access}
            showImport={false}
            filters={<TableMultiFilter label="tahun" filterKey="year" options={yearOptions} />}
            rows={data.yearlySummaries.map((row) => [row.year, row.fatality, row.lostDayInjury, row.restrictedWorkDayInjury, row.medicalTreatmentCase, row.firstAid, row.propertyDamage, row.nearMissReport, row.environmental, row.fatigue, row.totalEvents])}
            rowAttributes={data.yearlySummaries.map((row) => ({ "data-filter-year": `${row.year}` }))}
          />
          <AdminTableCard
            title="Incident monthly summary"
            description="Rekap incident bulanan dari sheet Incedent Record."
            columns={["Month", "Fatality", "LDI", "RWDI", "MTC", "FA", "PD", "NR", "ENV", "Total"]}
            dateFilter
            access={data.access}
            showImport={false}
            rows={data.monthlySummaries.map((row) => [formatDate(row.month), row.fatality, row.lostDayInjury, row.restrictedWorkDayInjury, row.medicalTreatmentCase, row.firstAid, row.propertyDamage, row.nearMissReport, row.environmental, row.totalEvents])}
            rowAttributes={data.monthlySummaries.map((row) => ({ "data-date-value": `${row.month}` }))}
          />
        </TabsContent>

        <TabsContent value="certifications">
          <AdminTableCard
            title="Safety certifications"
            description="Monitoring sertifikasi alat, masa berlaku, status aktif/expired, dan regulasi terkait."
            columns={["Nama Alat", "PIC Dept", "Area Kerja", "Klasifikasi", "Sertifikator", "Sertifikasi", "Next Sert.", "Status", "Regulasi", "Lokasi", "Action"]}
            dateFilter
            access={data.access}
            presets={<TableFilterPresets presets={[{ label: "Expired", filters: { status: "EXPIRED" } }, { label: "Aktif", filters: { status: "AKTIF" } }]} />}
            filters={(
              <>
                <TableMultiFilter label="lokasi" filterKey="location" options={locationOptions} />
                <TableMultiFilter label="status" filterKey="status" options={statusOptions} />
              </>
            )}
            scorecards={[
              { label: "Total alat", value: data.certifications.length, description: "Sertifikasi tercatat" },
              { label: "Expired", value: data.kpis.certificationExpired, description: "Perlu follow up", tone: "danger" },
            ]}
            rows={data.certifications.map((row) => [
              row.equipmentName,
              row.picDepartment,
              row.workArea,
              row.equipmentClassification,
              row.certifier,
              formatDate(row.certificationDate),
              formatDate(row.nextCertificationDate),
              <AdminStatusBadge key={`${row.id}-status`} value={row.status} />,
              row.regulation,
              row.workLocation,
              <CertificationRowActions key={`${row.id}-actions`} row={row} access={data.access} />,
            ])}
            rowAttributes={data.certifications.map((row) => ({
              "data-date-value": row.nextCertificationDate ? `${row.nextCertificationDate}` : "",
              "data-filter-location": row.workLocation,
              "data-filter-status": row.status,
            }))}
          />
        </TabsContent>

        <TabsContent value="performance">
          <AdminTableCard
            title="Safety performance"
            description="Threshold vs actual safety performance per site/periode."
            columns={["Year", "Periode", "Karyawan", "Safe Man Hours", "Fatality T/A", "LTI T/A", "PD T/A", "Action"]}
            dateFilter={false}
            access={data.access}
            filters={<TableMultiFilter label="tahun" filterKey="year" options={yearOptions} />}
            rows={data.performanceMetrics.map((row) => [
              row.year,
              row.periodLabel,
              row.employeeCount,
              formatNumber(row.safeManHoursUpToYear),
              `${row.fatalityThreshold} / ${row.fatalityActual}`,
              `${row.ltiThreshold} / ${row.ltiActual}`,
              `${row.propertyDamageThreshold} / ${row.propertyDamageActual}`,
              <PerformanceRowActions key={`${row.id}-actions`} row={row} access={data.access} />,
            ])}
            rowAttributes={data.performanceMetrics.map((row) => ({ "data-filter-year": `${row.year}` }))}
          />
        </TabsContent>

        <TabsContent value="man-hours" className="grid gap-4 xl:grid-cols-2">
          <AdminTableCard
            title="Safety man hours"
            description="Safe manhours kumulatif per lokasi kerja."
            columns={["Lokasi", "Karyawan", "Safety Man Hours", "Target Aman", "Pendapatan/Minggu", "Action"]}
            dateFilter={false}
            access={data.access}
            filters={<TableMultiFilter label="lokasi" filterKey="location" options={locationOptions} />}
            rows={data.manHours.map((row) => [row.workLocation, row.employeeCount, formatNumber(row.safetyManHours), formatNumber(row.safeTarget), row.averageWeeklyRevenue ? formatNumber(row.averageWeeklyRevenue) : "-", <ManHoursRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
            rowAttributes={data.manHours.map((row) => ({ "data-filter-location": row.workLocation }))}
          />
          <AdminTableCard
            title="Monthly safety man hours"
            description="Trend safe manhours bulanan per lokasi kerja."
            columns={["Lokasi", "Karyawan", "Bulan", "Safety Man Hours", "Action"]}
            dateFilter
            access={data.access}
            filters={<TableMultiFilter label="lokasi" filterKey="location" options={locationOptions} />}
            rows={data.monthlyManHours.map((row) => [row.workLocation, row.employeeCount, formatDate(row.month), formatNumber(row.safetyManHours), <MonthlyManHoursRowActions key={`${row.id}-actions`} row={row} access={data.access} />])}
            rowAttributes={data.monthlyManHours.map((row) => ({ "data-date-value": `${row.month}`, "data-filter-location": row.workLocation }))}
          />
        </TabsContent>

        <TabsContent value="weekly">
          <AdminTableCard
            title="Weekly safety activities"
            description="Aktivitas K3 mingguan, PIC, kategori, dan link bukti."
            columns={["Kegiatan", "Tanggal", "PIC", "Kategori", "Evidence", "Action"]}
            dateFilter
            access={data.access}
            filters={<TableMultiFilter label="category" filterKey="category" options={categoryOptions} />}
            rows={data.weeklyActivities.map((row) => [
              row.activity,
              formatDate(row.activityDate),
              row.pic,
              row.category,
              row.evidenceUrl ? <Link key={`${row.id}-link`} href={row.evidenceUrl} className="text-primary underline" target="_blank">Buka bukti</Link> : "-",
              <WeeklyActivityRowActions key={`${row.id}-actions`} row={row} access={data.access} />,
            ])}
            rowAttributes={data.weeklyActivities.map((row) => ({
              "data-date-value": row.activityDate ? `${row.activityDate}` : "",
              "data-filter-category": row.category,
            }))}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  )
}
