import Link from 'next/link'
import { AlertTriangle, BadgeCheck, Clock, Database, FileWarning, ShieldCheck } from 'lucide-react'

import { AdminPageShell } from '@/components/admin-page-shell'
import { Button } from '@/components/ui/button'
import { SafetyDashboardCharts } from '@/components/safety-dashboard/safety-dashboard-charts'
import { SafetyDashboardFilter } from './safety-filter'
import { getSafetyDashboardData } from '@/lib/safety-dashboard/queries'

function formatNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(
    Number.isFinite(parsed) ? parsed : 0
  )
}

function SafetyDashboardBanner() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 bg-[#1e40af] px-5 py-4 text-white sm:flex-row sm:justify-center">
      <div className="text-center">
        <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-white/80 uppercase">
          K3 & Safety Management
        </p>
        <h1 className="font-display text-xl font-semibold tracking-wide">SAFETY DASHBOARD</h1>
      </div>
    </div>
  )
}

function SafetyMetricCards({
  kpis,
}: {
  kpis: {
    totalIncidentYtd: number
    fatality: number
    safeManHours: number
    certificationExpired: number
    nearMiss: number
  }
}) {
  const items = [
    {
      label: 'Incident YTD',
      value: formatNumber(kpis.totalIncidentYtd),
      meta: 'Total event tahun berjalan',
      Icon: FileWarning,
      accent: 'bg-primary/12 text-primary ring-primary/15',
    },
    {
      label: 'Fatality',
      value: formatNumber(kpis.fatality),
      meta: 'Fatality tahun berjalan',
      Icon: AlertTriangle,
      accent: 'bg-rose-100 text-rose-700 ring-rose-200',
    },
    {
      label: 'Safe Man Hours',
      value: formatNumber(kpis.safeManHours),
      meta: 'Saldo awal + aktual 2026+',
      Icon: Clock,
      accent: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    },
    {
      label: 'Expired Cert.',
      value: formatNumber(kpis.certificationExpired),
      meta: 'Sertifikasi perlu follow up',
      Icon: BadgeCheck,
      accent: 'bg-tertiary-container text-on-tertiary-container ring-tertiary/15',
    },
    {
      label: 'Near Miss',
      value: formatNumber(kpis.nearMiss),
      meta: 'Near miss YTD',
      Icon: ShieldCheck,
      accent: 'bg-violet-100 text-violet-700 ring-violet-200',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="surface-module-card flex items-start justify-between rounded-[1.05rem] px-4 py-4"
        >
          <div className="min-w-0">
            <p className="text-muted-foreground text-[0.65rem] font-bold tracking-[0.12em] uppercase">
              {item.label}
            </p>
            <p className="font-display text-foreground mt-1 text-[1.8rem] leading-none font-bold">
              {item.value}
            </p>
            <p className="text-muted-foreground mt-1 truncate text-xs">{item.meta}</p>
          </div>
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ${item.accent}`}
          >
            <item.Icon className="size-5" aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function SafetyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; location?: string }>
}) {
  const params = await searchParams
  const data = await getSafetyDashboardData(params)

  return (
    <AdminPageShell eyebrow="" title="" description="" header={<SafetyDashboardBanner />}>
      <div className="surface-module-card flex flex-col gap-3 rounded-[1.05rem] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <SafetyDashboardFilter filterOptions={data.filterOptions} />
        <Button asChild>
          <Link href="/dashboard/safety/data">
            <Database className="size-4" />
            Kelola Data Safety
          </Link>
        </Button>
      </div>

      <SafetyMetricCards kpis={data.kpis} />
      <SafetyDashboardCharts charts={data.charts} />
    </AdminPageShell>
  )
}
