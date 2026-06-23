"use client"

import { useState, useActionState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminTableCard } from "@/components/admin-table-card"
import { Button } from "@/components/ui/button"
import { TableMultiFilter } from "@/components/ui/table-multi-filter"
import { approveAttendancePermissionRequest, rejectAttendancePermissionRequest } from "@/app/actions/attendance"
import { IzinKpiGrid } from "@/components/izin-dashboard/izin-kpi-grid"
import { IzinFilterBar } from "@/components/izin-dashboard/izin-filter-bar"
import { IzinBulkDeleteBar, BulkCheckbox } from "@/components/izin-dashboard/izin-bulk-actions"
import { EvidenceCell } from "@/components/izin-dashboard/izin-evidence-dialog"
import { toast } from "sonner"

import {
  SickByCategoryPie,
  LateByReasonBar,
  SickByDayBar,
  FrequentLateEmployees,
  FrequentSickEmployees,
  DepartmentBar,
  MonthlyTrendArea,
  SiteDistributionPie,
  LocationBar,
} from "@/components/izin-dashboard/izin-dashboard-charts"
import {
  BarChart3,
  ClipboardList,
  Stethoscope,
  TrendingUp,
  FileText,
  SlidersHorizontal,
} from "lucide-react"
import type { AttendancePermissionRow, IzinDashboardKpis, IzinDashboardCharts } from "@/lib/attendance-permission-dashboard"

type ActionResult = { success: boolean; error?: string; message?: string } | null

async function approveAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return approveAttendancePermissionRequest(formData)
}

async function rejectAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return rejectAttendancePermissionRequest(formData)
}

type Site = { id: number; name: string }

type DashboardData = {
  rows: AttendancePermissionRow[]
  kpis: IzinDashboardKpis
  charts: IzinDashboardCharts
  sites: Site[]
}

function SectionHeader({
  icon,
  iconColor,
  title,
  description,
}: {
  icon: React.ReactNode
  iconColor: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid size-8 place-items-center rounded-xl ${iconColor}`}>
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function IzinDashboardTabs({ data }: { data: DashboardData }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [approveState, approveFormAction, approvePending] = useActionState(approveAction, null)
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rejectAction, null)

  useEffect(() => {
    if (approveState) {
      if (approveState.success) toast.success(approveState.message || 'Izin disetujui')
      else toast.error(approveState.error || 'Gagal approve')
    }
  }, [approveState])

  useEffect(() => {
    if (rejectState) {
      if (rejectState.success) toast.success(rejectState.message || 'Izin ditolak')
      else toast.error(rejectState.error || 'Gagal reject')
    }
  }, [rejectState])

  const typeOptions = ["Sakit", "Terlambat"]
  const departmentOptions = Array.from(new Set(data.rows.map((row) => row.department))).filter(Boolean).sort()
  const siteOptions = Array.from(new Set(data.rows.map((row) => row.siteName))).filter(Boolean).sort()
  const statusOptions = Array.from(new Set(data.rows.map((row) => row.status))).filter(Boolean).sort()

  const kpiValues = {
    total_izin: data.kpis.total,
    total_sakit: data.kpis.sick,
    total_terlambat: data.kpis.late,
    departemen_terdampak: data.kpis.departments,
    pending_approval: data.kpis.pending,
    approved: data.kpis.approved,
    rejected: data.kpis.rejected,
    bulan_ini: data.kpis.thisMonth,
  }

  const allIds = data.rows.map((r) => r.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? allIds : [])
  }

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((i) => i !== id)
    )
  }

  return (
    <Tabs defaultValue="dashboard" className="w-full">
      {/* Filter + Tabs row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <ClipboardList className="size-3.5" />
            List Data Izin
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.06)]">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <IzinFilterBar sites={data.sites} />
        </div>
      </div>

      {/* === TAB: DASHBOARD === */}
      <TabsContent value="dashboard" className="mt-5">
        <div className="space-y-8">
          <IzinKpiGrid data={kpiValues} />

          <section className="space-y-4">
            <SectionHeader
              icon={<Stethoscope className="size-4" />}
              iconColor="bg-red-500/10 text-red-600"
              title="Analisis Sakit"
              description="Distribusi kategori penyakit, karyawan sering sakit, dan hari"
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <SickByCategoryPie data={data.charts.sickByCategory} />
              <SickByDayBar data={data.charts.sickByDay} />
              <FrequentSickEmployees data={data.charts.frequentSickEmployees} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              icon={<BarChart3 className="size-4" />}
              iconColor="bg-amber-500/10 text-amber-600"
              title="Analisis Terlambat"
              description="Alasan keterlambatan dan karyawan yang sering terlambat"
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <LateByReasonBar data={data.charts.lateByReason} />
              <FrequentLateEmployees data={data.charts.frequentLateEmployees} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              icon={<TrendingUp className="size-4" />}
              iconColor="bg-primary/10 text-primary"
              title="Tren & Distribusi"
              description="Tren bulanan, distribusi site, lokasi kerja, dan departemen"
            />
            <MonthlyTrendArea data={data.charts.monthlyTrend} />
            <LocationBar data={data.charts.byLocation} />
            <div className="grid gap-4 xl:grid-cols-2">
              <SiteDistributionPie data={data.charts.siteDistribution} />
              <DepartmentBar data={data.charts.byDepartment} />
            </div>
          </section>

          <div className="rounded-2xl border border-border/50 bg-surface-container-low px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Setting email reminder</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Template reminder approval tersedia di Settings Email. Rule operasional: kirim reminder ke HR saat izin terlambat/sakit masih pending melewati SLA approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* === TAB: LIST TABLE === */}
      <TabsContent value="list" className="mt-5">
        <AdminTableCard
          title="List Izin Sakit & Terlambat"
          description="Data terhubung dari form mobile dan desktop. Record approved tersimpan sebagai attendance override."
          columns={[
            <div key="select-all" className="flex items-center justify-center">
              <BulkCheckbox checked={allSelected} onChange={toggleAll} />
            </div>,
            'Tanggal', 'Tipe', 'Employee', 'SN', 'Departemen', 'Site', 'Kategori / Alasan', 'Jam Masuk', 'Catatan', 'Status', 'Bukti', 'Action',
          ]}
          dateFilter
          showImport={false}
          filters={
            <>
              <TableMultiFilter label="tipe" filterKey="type" options={typeOptions.map((option) => ({ value: option, label: option }))} />
              <TableMultiFilter label="departemen" filterKey="department" options={departmentOptions.map((option) => ({ value: option, label: option }))} />
              <TableMultiFilter label="site" filterKey="site" options={siteOptions.map((option) => ({ value: option, label: option }))} />
              <TableMultiFilter label="status" filterKey="status" options={statusOptions.map((option) => ({ value: option, label: option }))} />
            </>
          }
          rows={data.rows.map((row) => [
            <div key={`check-${row.id}`} className="flex items-center justify-center">
              <BulkCheckbox
                checked={selectedIds.includes(row.id)}
                onChange={(checked) => toggleOne(row.id, checked)}
              />
            </div>,
            row.date,
            <span
              key={`type-${row.id}`}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                row.type === 'Sakit'
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200/60 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800/40'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-800/40'
              }`}
            >
              {row.type === 'Sakit' ? 'Sakit' : 'Terlambat'}
            </span>,
            <span key={`emp-${row.id}`} className="font-medium text-foreground">{row.employeeName}</span>,
            <span key={`sn-${row.id}`} className="font-mono text-xs text-muted-foreground">{row.employeeSn}</span>,
            row.department,
            row.siteName,
            <span key={`cat-${row.id}`} className="max-w-[180px] truncate text-sm">{row.category}</span>,
            row.returnTime || '-',
            <span key={`note-${row.id}`} className="max-w-[200px] truncate text-sm text-muted-foreground">
              {row.attachment ? `${row.note || '-'} | Lampiran tersedia` : row.note || '-'}
            </span>,
            <span
              key={`status-${row.id}`}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                row.status === 'pending'
                  ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/60 dark:bg-orange-950/50 dark:text-orange-400'
                  : row.status === 'rejected'
                    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-950/50 dark:text-rose-400'
                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400'
              }`}
            >
              {row.status}
            </span>,
            <EvidenceCell key={`ev-${row.id}`} attachment={row.attachment} />,
            row.status === 'pending' && row.requestId ? (
              <div className="flex flex-wrap gap-2" key={`${row.requestId}-actions`}>
                <form action={approveFormAction} className="flex gap-2">
                  <input type="hidden" name="id" value={row.requestId} />
                  <input type="hidden" name="approverNote" value="Approved by HC" />
                  <Button size="sm" className="h-7 text-xs" disabled={approvePending}>Approve</Button>
                </form>
                <form action={rejectFormAction}>
                  <input type="hidden" name="id" value={row.requestId} />
                  <input type="hidden" name="approverNote" value="Rejected by HC" />
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={rejectPending}>Reject</Button>
                </form>
              </div>
            ) : '-',
          ])}
          rowAttributes={data.rows.map((row) => ({
            'data-date-value': row.date,
            'data-filter-type': row.type,
            'data-filter-department': row.department,
            'data-filter-site': row.siteName,
            'data-filter-status': row.status,
          }))}
        />
      </TabsContent>

      {/* Floating bulk delete bar */}
      <IzinBulkDeleteBar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
      />
    </Tabs>
  )
}
