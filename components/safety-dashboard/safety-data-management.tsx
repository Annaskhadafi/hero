'use client'

import * as React from "react"
import { ChevronDown, ChevronRight, Clock, ImageIcon, Trash2 } from "lucide-react"

import { AdminStatusBadge } from "@/components/admin-status-badge"
import { AdminTableCard } from "@/components/admin-table-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CertificationRowActions,
  CreateCertificationButton,
  CreateIncidentReportButton,
  CreateManHoursButton,
  EditBatchManHoursButton,
  EditGlobalStartDataButton,
  CreateMonthlyManHoursButton,
  CreateMonthlySummaryButton,
  CreatePerformanceButton,
  CreateWeeklyActivityButton,
  CreateYearlySummaryButton,
  EvidencePreviewDialog,
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
import {
  CertificationsDashboard,
  CollapsibleTabDashboard,
  IncidentReportsDashboard,
  ManHoursDashboard,
  MonthlyManHoursDashboard,
  MonthlySummaryDashboard,
  PerformanceDashboard,
  WeeklyActivitiesDashboard,
  YearlySummaryDashboard,
} from "@/components/safety-dashboard/safety-tab-dashboards"
import type { getSafetyDashboardData } from "@/lib/safety-dashboard/queries"
import { cn } from "@/lib/utils"
import { deleteAllSiteManHoursAction } from "@/app/dashboard/safety/actions"
import { useRouter } from "next/navigation"

type SafetyData = Awaited<ReturnType<typeof getSafetyDashboardData>>

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID")
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return new Intl.NumberFormat("id-ID").format(Number.isFinite(parsed) ? parsed : 0)
}

function filterOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }))
}

function CollapsibleManHoursTable({ data }: { data: SafetyData }) {
  const [expandedSites, setExpandedSites] = React.useState<Record<string, boolean>>({})
  const [deletingLocation, setDeletingLocation] = React.useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null)
  const router = useRouter()

  const toggleExpand = (loc: string) => {
    setExpandedSites((prev) => ({ ...prev, [loc]: !prev[loc] }))
  }

  const handleDeleteSite = React.useCallback(async (workLocation: string) => {
    setDeletingLocation(workLocation)
    try {
      const fd = new FormData()
      fd.append("workLocation", workLocation)
      const result = await deleteAllSiteManHoursAction(fd)
      if (result.ok) {
        router.refresh()
      }
    } finally {
      setDeletingLocation(null)
      setConfirmDelete(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const siteSummary = data.siteManHoursSummary || []

  return (
    <div className="space-y-4">
      <Card className="surface-module-card overflow-hidden rounded-[1.2rem] border-0 p-0 shadow-sm">
        <div className="flex flex-col gap-3 bg-surface-container-low px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Clock className="size-4" aria-hidden="true" />
              </span>
              <h3 className="truncate font-display text-base font-semibold tracking-normal text-foreground">
                Safety Man Hours per Lokasi Site Master
              </h3>
            </div>
            <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
              Master Data Lokasi Site dari User Management (hero_sites). Klik tombol expand untuk melihat rincian man hours per bulan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CreateManHoursButton access={data.access} options={data.filterOptions} />
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-indigo-50/20 to-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-bold uppercase tracking-wider">
                    Saldo Awal System
                  </Badge>
                  <h4 className="font-display font-bold text-sm text-slate-900">
                    Start Data Safety Man Hours (Gabungan Semua Site s/d 2025)
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Akumulasi jam kerja aman seluruh lokasi site s/d akhir 2025 + total aktual bulanan 2026+.
                </p>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-blue-100">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total System Safe Hours</p>
                  <p className="font-display text-lg font-extrabold text-primary tabular-nums">
                    {formatNumber(data.globalStartData?.totalSystemSafeManHours)} <span className="text-xs font-normal text-muted-foreground">Jam</span>
                  </p>
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    Start Data: <span className="font-semibold text-slate-700">{formatNumber(data.globalStartData?.initialManHours)}</span> | Aktual 2026+: <span className="font-semibold text-emerald-700">{formatNumber(data.globalStartData?.totalActualMonthlyManHours)}</span>
                  </p>
                </div>
                <EditGlobalStartDataButton globalStartData={data.globalStartData} access={data.access} />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/70 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-center" />
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama Lokasi Site</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Karyawan</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Man Hours Aktual (2026+)</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Target Aman</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Last Update</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siteSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      Belum ada data man hours lokasi site.
                    </TableCell>
                  </TableRow>
                ) : (
                  siteSummary.map((siteRow) => {
                    const isExpanded = Boolean(expandedSites[siteRow.workLocation])
                    const detailCount = siteRow.monthlyDetails?.length || 0

                    return (
                      <React.Fragment key={siteRow.workLocation}>
                        <TableRow
                          className={cn(
                            "transition-colors hover:bg-muted/40 cursor-pointer",
                            isExpanded && "bg-blue-50/40"
                          )}
                          onClick={() => toggleExpand(siteRow.workLocation)}
                        >
                          <TableCell className="text-center py-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="denseIcon"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(siteRow.workLocation)
                              }}
                              className="size-7"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4 text-primary" />
                              ) : (
                                <ChevronRight className="size-4 text-muted-foreground" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-semibold text-sm py-3 text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{siteRow.workLocation}</span>
                              {detailCount > 0 ? (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                  {detailCount} bulan
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium text-sm py-3 tabular-nums">
                            {formatNumber(siteRow.employeeCount)}
                          </TableCell>
                          <TableCell className="text-right text-sm py-3 tabular-nums text-emerald-700 font-semibold">
                            {formatNumber(siteRow.actualMonthlyManHours)}
                          </TableCell>
                          <TableCell className="text-right text-sm py-3 tabular-nums text-muted-foreground">
                            {formatNumber(siteRow.safeTarget)}
                          </TableCell>
                          <TableCell className="text-center text-xs py-3 text-muted-foreground whitespace-nowrap">
                            {formatDateTime(siteRow.lastUpdate)}
                          </TableCell>
                          <TableCell className="text-right py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <EditBatchManHoursButton siteRow={siteRow} access={data.access} options={data.filterOptions} />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => toggleExpand(siteRow.workLocation)}
                                className="h-7 text-xs px-2.5 font-medium"
                              >
                                {isExpanded ? "Tutup" : "Rincian"}
                              </Button>
                              {data.access.canDelete && (
                                confirmDelete === siteRow.workLocation ? (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 text-xs px-2"
                                      disabled={deletingLocation === siteRow.workLocation}
                                      onClick={() => handleDeleteSite(siteRow.workLocation)}
                                    >
                                      {deletingLocation === siteRow.workLocation ? "..." : "Ya, Hapus"}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs px-2"
                                      onClick={() => setConfirmDelete(null)}
                                    >
                                      Batal
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setConfirmDelete(siteRow.workLocation)}
                                    title={`Hapus semua data man hours ${siteRow.workLocation}`}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded ? (
                          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80" data-table-detail-row="true">
                            <TableCell colSpan={7} className="p-3 sm:p-4">
                              <div className="rounded-xl border border-border/70 bg-white p-3 shadow-xs space-y-2">
                                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="size-3.5 text-primary" />
                                    Rincian Jam Kerja Bulanan - {siteRow.workLocation}
                                  </h4>
                                  <span className="text-xs text-muted-foreground">
                                    {detailCount} catatan bulanan
                                  </span>
                                </div>

                                {detailCount === 0 ? (
                                  <p className="py-4 text-center text-xs text-muted-foreground">
                                    Belum ada rincian man hours bulanan untuk lokasi site ini. Gunakan tombol + Tambah Data Man Hours di atas.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <Table className="text-xs">
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent border-b border-border/40">
                                          <TableHead className="h-8 text-[11px] font-semibold text-muted-foreground">Bulan</TableHead>
                                          <TableHead className="h-8 text-[11px] font-semibold text-muted-foreground text-center">Karyawan</TableHead>
                                          <TableHead className="h-8 text-[11px] font-semibold text-muted-foreground text-right">Safety Man Hours</TableHead>
                                          <TableHead className="h-8 text-[11px] font-semibold text-muted-foreground text-center">Tipe Input</TableHead>
                                          <TableHead className="h-8 text-[11px] font-semibold text-muted-foreground text-center">Last Update</TableHead>
                                          <TableHead className="h-8 text-[11px] font-semibold text-muted-foreground text-right">Aksi</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {siteRow.monthlyDetails.map((mRow) => {
                                          const isAttendance = mRow.sourceSheet === "attendance"
                                          return (
                                            <TableRow key={mRow.id} className="hover:bg-muted/30 border-b border-border/30">
                                              <TableCell className="py-2 font-medium text-foreground">
                                                {formatDate(mRow.month)}
                                              </TableCell>
                                              <TableCell className="py-2 text-center tabular-nums">
                                                {formatNumber(mRow.employeeCount)}
                                              </TableCell>
                                              <TableCell className="py-2 text-right font-semibold tabular-nums text-foreground">
                                                {formatNumber(mRow.safetyManHours)}
                                              </TableCell>
                                              <TableCell className="py-2 text-center">
                                                {isAttendance ? (
                                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 font-semibold">
                                                    <Clock className="size-3" />
                                                    Otomatis update by attendance
                                                  </Badge>
                                                ) : (
                                                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                                    Manual
                                                  </Badge>
                                                )}
                                              </TableCell>
                                              <TableCell className="py-2 text-center text-muted-foreground">
                                                {formatDateTime(mRow.updatedAt)}
                                              </TableCell>
                                              <TableCell className="py-2 text-right">
                                                <MonthlyManHoursRowActions row={mRow} access={data.access} options={data.filterOptions} />
                                              </TableCell>
                                            </TableRow>
                                          )
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  )
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
        <TabsTrigger value="man-hours">Safety Man Hours</TabsTrigger>
        <TabsTrigger value="weekly">Weekly Activities</TabsTrigger>
      </TabsList>

      <TabsContent value="incident-reports">
        <CollapsibleTabDashboard title="Incident Reports Overview">
          <IncidentReportsDashboard data={data} />
        </CollapsibleTabDashboard>
        <AdminTableCard
          title="Incident reports"
          description="Form, import, export, dan CRUD incident individual."
          columns={["Nama", "Departemen", "Incident", "Property Damage", "Lokasi", "Category", "Tanggal", "Status", "Action"]}
          dateFilter
          access={data.access}
          actions={<CreateIncidentReportButton access={data.access} options={data.filterOptions} />}
          presets={<TableFilterPresets presets={[{ label: "Open", filters: { status: "open" } }, { label: "Property Damage", filters: { category: "Property Damage" } }]} />}
          filters={
            <>
              <TableMultiFilter key="lokasi" label="lokasi" filterKey="location" options={locationOptions} />
              <TableMultiFilter key="category" label="category" filterKey="category" options={categoryOptions} />
              <TableMultiFilter key="status" label="status" filterKey="status" options={statusOptions} />
            </>
          }
          scorecards={[{ label: "Total", value: data.incidentReports.length, description: "Incident detail" }, { label: "Open", value: data.incidentReports.filter((row) => row.status === "open").length, description: "Belum ditutup", tone: "warning" }]}
          rows={data.incidentReports.map((row) => [row.workerName, row.department, row.incidentDescription, row.propertyDamage, row.location, row.category, formatDate(row.incidentDate), <AdminStatusBadge key={`${row.id}-status`} value={row.status} />, <IncidentReportRowActions key={`${row.id}-actions`} row={row} access={data.access} options={data.filterOptions} />])}
          rowAttributes={data.incidentReports.map((row) => ({ "data-date-value": row.incidentDate ? `${row.incidentDate}` : "", "data-filter-location": row.location, "data-filter-category": row.category, "data-filter-status": row.status }))}
        />
      </TabsContent>

      <TabsContent value="yearly-summary">
        <CollapsibleTabDashboard title="Yearly Summary Overview">
          <YearlySummaryDashboard data={data} />
        </CollapsibleTabDashboard>
        <AdminTableCard
          title="Incident yearly summary"
          description="Form, import, export, dan CRUD rekap incident tahunan."
          columns={["Year", "FTL", "LDI", "RWDI", "MTC", "FA", "PD", "NR", "ENV", "FTG", "Total", "Action"]}
          dateFilter={false}
          access={data.access}
          actions={<CreateYearlySummaryButton access={data.access} options={data.filterOptions} />}
          filters={<TableMultiFilter key="tahun" label="tahun" filterKey="year" options={yearOptions} />}
          rows={data.yearlySummaries.map((row) => [row.year, row.fatality, row.lostDayInjury, row.restrictedWorkDayInjury, row.medicalTreatmentCase, row.firstAid, row.propertyDamage, row.nearMissReport, row.environmental, row.fatigue, row.totalEvents, <YearlySummaryRowActions key={`${row.id}-actions`} row={row} access={data.access} options={data.filterOptions} />])}
          rowAttributes={data.yearlySummaries.map((row) => ({ "data-filter-year": `${row.year}` }))}
        />
      </TabsContent>

      <TabsContent value="monthly-summary">
        <CollapsibleTabDashboard title="Monthly Summary Overview">
          <MonthlySummaryDashboard data={data} />
        </CollapsibleTabDashboard>
        <AdminTableCard
          title="Incident monthly summary"
          description="Form, import, export, dan CRUD rekap incident bulanan."
          columns={["Month", "Fatality", "LDI", "RWDI", "MTC", "FA", "PD", "NR", "ENV", "Total", "Action"]}
          dateFilter
          access={data.access}
          actions={<CreateMonthlySummaryButton access={data.access} options={data.filterOptions} />}
          rows={data.monthlySummaries.map((row) => [formatDate(row.month), row.fatality, row.lostDayInjury, row.restrictedWorkDayInjury, row.medicalTreatmentCase, row.firstAid, row.propertyDamage, row.nearMissReport, row.environmental, row.totalEvents, <MonthlySummaryRowActions key={`${row.id}-actions`} row={row} access={data.access} options={data.filterOptions} />])}
          rowAttributes={data.monthlySummaries.map((row) => ({ "data-date-value": `${row.month}` }))}
        />
      </TabsContent>

      <TabsContent value="certifications">
        <CollapsibleTabDashboard title="Certifications Overview">
          <CertificationsDashboard data={data} />
        </CollapsibleTabDashboard>
        <AdminTableCard
          title="Safety certifications"
          description="Form, import, export, dan CRUD sertifikasi alat."
          columns={["Nama Alat", "PIC Dept", "Area Kerja", "Klasifikasi", "Sertifikator", "Sertifikasi", "Next Sert.", "Status", "Regulasi", "Lokasi", "Action"]}
          dateFilter
          access={data.access}
          actions={<CreateCertificationButton access={data.access} options={data.filterOptions} />}
          presets={<TableFilterPresets presets={[{ label: "Expired", filters: { status: "EXPIRED" } }, { label: "Aktif", filters: { status: "AKTIF" } }]} />}
          filters={
            <>
              <TableMultiFilter key="lokasi" label="lokasi" filterKey="location" options={locationOptions} />
              <TableMultiFilter key="status" label="status" filterKey="status" options={statusOptions} />
            </>
          }
          scorecards={[{ label: "Total alat", value: data.certifications.length, description: "Sertifikasi tercatat" }, { label: "Expired", value: data.kpis.certificationExpired, description: "Perlu follow up", tone: "danger" }]}
          rows={data.certifications.map((row) => [row.equipmentName, row.picDepartment, row.workArea, row.equipmentClassification, row.certifier, formatDate(row.certificationDate), formatDate(row.nextCertificationDate), <AdminStatusBadge key={`${row.id}-status`} value={row.status} />, row.regulation, row.workLocation, <CertificationRowActions key={`${row.id}-actions`} row={row} access={data.access} options={data.filterOptions} />])}
          rowAttributes={data.certifications.map((row) => ({ "data-date-value": row.nextCertificationDate ? `${row.nextCertificationDate}` : "", "data-filter-location": row.workLocation, "data-filter-status": row.status }))}
        />
      </TabsContent>

      <TabsContent value="performance">
        <CollapsibleTabDashboard title="Performance Overview">
          <PerformanceDashboard data={data} />
        </CollapsibleTabDashboard>
        <AdminTableCard
          title="Safety performance"
          description="Form, import, export, dan CRUD safety performance."
          columns={["Year", "Periode", "Karyawan", "Safe Man Hours", "Fatality T/A", "LTI T/A", "PD T/A", "Action"]}
          dateFilter={false}
          access={data.access}
          actions={<CreatePerformanceButton access={data.access} options={data.filterOptions} />}
          filters={<TableMultiFilter key="tahun" label="tahun" filterKey="year" options={yearOptions} />}
          rows={data.performanceMetrics.map((row) => [row.year, row.periodLabel, row.employeeCount, formatNumber(row.safeManHoursUpToYear), `${row.fatalityThreshold} / ${row.fatalityActual}`, `${row.ltiThreshold} / ${row.ltiActual}`, `${row.propertyDamageThreshold} / ${row.propertyDamageActual}`, <PerformanceRowActions key={`${row.id}-actions`} row={row} access={data.access} options={data.filterOptions} />])}
          rowAttributes={data.performanceMetrics.map((row) => ({ "data-filter-year": `${row.year}` }))}
        />
      </TabsContent>

      <TabsContent value="man-hours">
        <CollapsibleTabDashboard title="Man Hours Overview">
          <ManHoursDashboard data={data} />
        </CollapsibleTabDashboard>
        <CollapsibleManHoursTable data={data} />
      </TabsContent>



      <TabsContent value="weekly">
        <CollapsibleTabDashboard title="Weekly Activities Overview">
          <WeeklyActivitiesDashboard data={data} />
        </CollapsibleTabDashboard>
        <AdminTableCard
          title="Weekly safety activities"
          description="Form, import, export, dan CRUD aktivitas K3 mingguan."
          columns={["Kegiatan", "Tanggal", "PIC", "Kategori", "Evidence", "Action"]}
          dateFilter
          access={data.access}
          actions={<CreateWeeklyActivityButton access={data.access} options={data.filterOptions} />}
          filters={<TableMultiFilter key="category" label="category" filterKey="category" options={categoryOptions} />}
          rows={data.weeklyActivities.map((row) => [row.activity, formatDate(row.activityDate), row.pic, row.category, <EvidencePreviewDialog key={`${row.id}-evidence`} imageUrl={row.imageUrl} evidenceUrl={row.evidenceUrl} trigger={<div className="flex items-center gap-1.5 text-primary underline cursor-pointer hover:text-primary/80">{row.imageUrl || row.evidenceUrl ? <ImageIcon className="size-4" /> : null}{row.imageUrl || row.evidenceUrl ? "Lihat" : "-"}</div>} />, <WeeklyActivityRowActions key={`${row.id}-actions`} row={row} access={data.access} options={data.filterOptions} />])}
          rowAttributes={data.weeklyActivities.map((row) => ({ "data-date-value": row.activityDate ? `${row.activityDate}` : "", "data-filter-category": row.category }))}
        />
      </TabsContent>
    </Tabs>
  )
}
