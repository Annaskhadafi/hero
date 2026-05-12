'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coffee,
  FileSpreadsheet,
  Lock,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type EmployeeOption = {
  id: number
  name: string
  email: string
  employeeSn?: string | null
  role: string
  section?: string | null
  siteId: number | null
  locationName?: string | null
}

type SiteOption = {
  id: number
  name: string
  customerName: string
}

type SchedulingConfigRow = {
  siteId: number
  scheduleType?: string
  rosterType?: string
  msaType?: string
  mealsType?: string
  overtimeType?: string
}

type SchedulingStatusRow = {
  siteId: number
  period: string
  scheduleStatus: string
  attendanceStatus: string
  importStatus: string
  conflictCount: number
  lastSavedAt?: string | null
  lastImportedAt?: string | null
  finalizedAt?: string | null
}

function currentMonthPeriod() {
  return new Date().toISOString().slice(0, 7)
}

function formatPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long' }).format(
    new Date(year, month - 1, 1)
  )
}

function formatRelative(value?: string | null) {
  if (!value) return 'Belum ada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Belum ada'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function statusTone(status: string): 'muted' | 'ok' | 'warn' | 'lock' {
  if (!status || status === 'none' || status === 'draft' || status === 'pending') return 'muted'
  if (status === 'finalized' || status === 'locked') return 'lock'
  if (status === 'saved' || status === 'applied' || status === 'ready') return 'ok'
  return 'warn'
}

function statusLabel(status: string) {
  if (!status || status === 'none') return 'Belum ada'
  const map: Record<string, string> = {
    draft: 'Draft',
    saved: 'Tersimpan',
    applied: 'Applied',
    ready: 'Siap',
    finalized: 'Finalized',
    locked: 'Locked',
    pending: 'Pending',
    review: 'Review',
  }
  return map[status] ?? status
}

function toneBadge(tone: 'muted' | 'ok' | 'warn' | 'lock') {
  if (tone === 'ok') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (tone === 'warn') return 'bg-amber-50 text-amber-800 ring-amber-200'
  if (tone === 'lock') return 'bg-slate-900 text-white ring-slate-900'
  return 'bg-slate-50 text-slate-500 ring-slate-200'
}

export function SchedulingOverviewDashboard({
  employees,
  sites,
  schedulingConfigs,
  schedulingStatuses,
}: {
  employees: EmployeeOption[]
  sites: SiteOption[]
  schedulingConfigs: SchedulingConfigRow[]
  schedulingStatuses: SchedulingStatusRow[]
}) {
  const [period, setPeriod] = useState(currentMonthPeriod)
  const [search, setSearch] = useState('')

  const statusBySite = useMemo(() => {
    const map = new Map<number, SchedulingStatusRow>()
    for (const status of schedulingStatuses) {
      if (status.period !== period) continue
      map.set(status.siteId, status)
    }
    return map
  }, [schedulingStatuses, period])

  const configBySite = useMemo(() => {
    const map = new Map<number, SchedulingConfigRow>()
    for (const config of schedulingConfigs) map.set(config.siteId, config)
    return map
  }, [schedulingConfigs])

  const employeeCountBySite = useMemo(() => {
    const map = new Map<number, number>()
    for (const emp of employees) {
      if (!emp.siteId) continue
      map.set(emp.siteId, (map.get(emp.siteId) ?? 0) + 1)
    }
    return map
  }, [employees])

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sites
    return sites.filter(
      (site) => site.name.toLowerCase().includes(q) || site.customerName.toLowerCase().includes(q)
    )
  }, [sites, search])

  const kpi = useMemo(() => {
    let scheduleReady = 0
    let attendanceReady = 0
    let finalizedCount = 0
    let conflicts = 0
    for (const site of sites) {
      const s = statusBySite.get(site.id)
      if (!s) continue
      if (['saved', 'applied', 'ready', 'finalized'].includes(s.scheduleStatus)) scheduleReady++
      if (['saved', 'applied', 'ready', 'finalized'].includes(s.attendanceStatus)) attendanceReady++
      if (s.finalizedAt) finalizedCount++
      conflicts += s.conflictCount ?? 0
    }
    return { scheduleReady, attendanceReady, finalizedCount, conflicts, totalSites: sites.length }
  }, [sites, statusBySite])

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <Card className="surface-module-card rounded-[1.1rem] border-0 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-surface-container-low text-primary grid size-10 place-items-center rounded-xl">
              <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                Periode Aktif
              </p>
              <p className="font-display text-foreground text-lg font-semibold">
                {formatPeriod(period)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-10 w-[180px]"
            />
          </div>
        </div>
      </Card>

      {/* KPI strip */}
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Site terdaftar"
          value={kpi.totalSites}
          hint={`${employees.length} karyawan aktif`}
          icon={<Users className="size-4" />}
        />
        <MetricCard
          label="Schedule siap"
          value={`${kpi.scheduleReady}/${kpi.totalSites}`}
          hint="Tersimpan di Schedule Tetap"
          tone="ok"
          icon={<CheckCircle2 className="size-4" />}
        />
        <MetricCard
          label="Attendance siap"
          value={`${kpi.attendanceReady}/${kpi.totalSites}`}
          hint="Sudah di-save periode ini"
          tone={kpi.attendanceReady === kpi.totalSites ? 'ok' : 'warn'}
          icon={<ClipboardList className="size-4" />}
        />
        <MetricCard
          label="Conflicts"
          value={kpi.conflicts}
          hint={kpi.finalizedCount > 0 ? `${kpi.finalizedCount} site finalized` : 'Perlu review'}
          tone={kpi.conflicts > 0 ? 'warn' : 'muted'}
          icon={<AlertCircle className="size-4" />}
        />
      </div>

      {/* Quick actions */}
      <Card className="surface-module-card rounded-[1.1rem] border-0 p-4">
        <div className="mb-3">
          <p className="font-display text-foreground text-base font-semibold">Alur kerja</p>
          <p className="text-muted-foreground text-sm">
            Ikuti urutan kiri ke kanan setiap periode.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <QuickAction
            step="1"
            label="Setup"
            description="Konfigurasi site & profil"
            href="/dashboard/scheduling-timesheet/setup"
            icon={<Users className="size-4" />}
          />
          <QuickAction
            step="2"
            label="Schedule"
            description="Generate & save roster"
            href="/dashboard/scheduling-timesheet/schedule"
            icon={<CalendarDays className="size-4" />}
          />
          <QuickAction
            step="3"
            label="Attendance"
            description="Import / input kehadiran"
            href="/dashboard/scheduling-timesheet/attendance"
            icon={<ClipboardList className="size-4" />}
          />
          <QuickAction
            step="4"
            label="Field Break"
            description="Rotasi on-site & FB"
            href="/dashboard/scheduling-timesheet/field-break"
            icon={<Coffee className="size-4" />}
          />
          <QuickAction
            step="5"
            label="MSA + OT"
            description="Rekap payroll"
            href="/dashboard/scheduling-timesheet/payroll"
            icon={<FileSpreadsheet className="size-4" />}
          />
        </div>
      </Card>

      {/* Site status table */}
      <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
        <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <p className="font-display text-foreground text-base font-semibold">Status per Site</p>
            <p className="text-muted-foreground text-xs">
              Pantau progress schedule dan attendance untuk periode {formatPeriod(period)}.
            </p>
          </div>
          <Input
            placeholder="Cari site..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-[220px]"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.14em] uppercase">
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Karyawan</th>
                <th className="px-4 py-3 font-medium">Tipe</th>
                <th className="px-4 py-3 font-medium">Schedule</th>
                <th className="px-4 py-3 font-medium">Attendance</th>
                <th className="px-4 py-3 font-medium">Last activity</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map((site) => {
                const status = statusBySite.get(site.id)
                const config = configBySite.get(site.id)
                const empCount = employeeCountBySite.get(site.id) ?? 0
                const scheduleTone = statusTone(status?.scheduleStatus ?? 'none')
                const attendanceTone = statusTone(status?.attendanceStatus ?? 'none')
                const lastActivity =
                  status?.lastImportedAt || status?.lastSavedAt || status?.finalizedAt
                return (
                  <tr
                    key={site.id}
                    className="border-border/30 hover:bg-surface-container-low/50 border-t transition"
                  >
                    <td className="px-4 py-3">
                      <p className="text-foreground font-semibold">{site.name}</p>
                      {site.customerName !== site.name ? (
                        <p className="text-muted-foreground text-xs">{site.customerName}</p>
                      ) : null}
                    </td>
                    <td className="text-foreground px-4 py-3">{empCount}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {config?.scheduleType === 'shift' ? 'Shift DS/NS' : 'Office'}
                      <span className="mx-1.5">·</span>
                      {config?.rosterType ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        tone={scheduleTone}
                        label={statusLabel(status?.scheduleStatus ?? 'none')}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusPill
                          tone={attendanceTone}
                          label={statusLabel(status?.attendanceStatus ?? 'none')}
                        />
                        {status?.conflictCount ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                            <AlertCircle className="size-3" /> {status.conflictCount}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {formatRelative(lastActivity)}
                      {status?.finalizedAt ? (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                          <Lock className="size-3" /> Locked
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/scheduling-timesheet/schedule`}
                        className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                      >
                        Buka <ArrowRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center text-sm">
                    Tidak ada site yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
  tone = 'muted',
  icon,
}: {
  label: string
  value: number | string
  hint: string
  tone?: 'muted' | 'ok' | 'warn'
  icon: React.ReactNode
}) {
  const toneStyles =
    tone === 'ok'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-slate-50 text-slate-500 ring-slate-200'
  return (
    <Card className="surface-module-card rounded-[1rem] border-0 p-4">
      <div className="flex items-start justify-between">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
          {label}
        </p>
        <span className={`grid size-7 place-items-center rounded-full ring-1 ${toneStyles}`}>
          {icon}
        </span>
      </div>
      <p className="font-display text-foreground mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </Card>
  )
}

function QuickAction({
  step,
  label,
  description,
  href,
  icon,
}: {
  step: string
  label: string
  description: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group bg-surface-container-low hover:bg-surface-container-lowest hover:ring-border flex flex-col gap-2 rounded-[0.9rem] p-3 ring-1 ring-transparent transition"
    >
      <div className="flex items-center justify-between">
        <span className="bg-surface-container-lowest text-primary grid size-8 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
          {icon}
        </span>
        <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
          Step {step}
        </span>
      </div>
      <div>
        <p className="text-foreground font-semibold">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <span className="text-primary inline-flex items-center gap-1 text-xs font-medium opacity-0 transition group-hover:opacity-100">
        Buka <ArrowRight className="size-3" />
      </span>
    </Link>
  )
}

function StatusPill({ tone, label }: { tone: 'muted' | 'ok' | 'warn' | 'lock'; label: string }) {
  const styles =
    tone === 'ok'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : tone === 'lock'
          ? 'bg-slate-900 text-white ring-slate-900'
          : 'bg-slate-50 text-slate-500 ring-slate-200'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${styles}`}
    >
      {label}
    </span>
  )
}
