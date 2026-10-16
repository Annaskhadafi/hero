import Link from 'next/link'
import { AlertTriangle, BadgeCheck, Clock, Database, FileWarning, ShieldCheck } from 'lucide-react'

import { AdminPageShell } from '@/components/admin-page-shell'
import { Button } from '@/components/ui/button'
import { HeroKpiCard } from '@/components/templates'
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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      <HeroKpiCard
        title="Incident YTD"
        value={formatNumber(kpis.totalIncidentYtd)}
        unit="event"
        icon={<FileWarning className="size-5" />}
        watermarkIcon={<FileWarning className="size-16" />}
        tone="amber"
        variant="colorful"
        description="Total event tahun berjalan"
      />

      <HeroKpiCard
        title="Fatality"
        value={formatNumber(kpis.fatality)}
        unit="kasus"
        icon={<AlertTriangle className="size-5" />}
        watermarkIcon={<AlertTriangle className="size-16" />}
        tone={kpis.fatality > 0 ? 'rose' : 'emerald'}
        variant="colorful"
        badge={kpis.fatality === 0 ? 'Zero Fatality' : 'Critical'}
        description={kpis.fatality === 0 ? 'Target Zero Fatality tercapai' : 'Fatality tahun berjalan'}
      />

      <HeroKpiCard
        title="Safe Man Hours"
        value={formatNumber(kpis.safeManHours)}
        unit="jam"
        icon={<Clock className="size-5" />}
        watermarkIcon={<Clock className="size-16" />}
        tone="emerald"
        variant="colorful"
        description="Saldo awal + aktual berjalan"
      />

      <HeroKpiCard
        title="Expired Cert."
        value={formatNumber(kpis.certificationExpired)}
        unit="sertifikat"
        icon={<BadgeCheck className="size-5" />}
        watermarkIcon={<BadgeCheck className="size-16" />}
        tone={kpis.certificationExpired > 0 ? 'rose' : 'blue'}
        variant="colorful"
        badge={kpis.certificationExpired > 0 ? 'Perlu Renewal' : undefined}
        description="Sertifikasi perlu follow up"
      />

      <HeroKpiCard
        title="Near Miss"
        value={formatNumber(kpis.nearMiss)}
        unit="laporan"
        icon={<ShieldCheck className="size-5" />}
        watermarkIcon={<ShieldCheck className="size-16" />}
        tone="cyan"
        variant="colorful"
        description="Laporan near miss YTD"
      />
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
