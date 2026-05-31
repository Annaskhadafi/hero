import Link from "next/link"
import { Activity, AlertTriangle, BadgeCheck, Clock, Database, FileWarning, ShieldCheck } from "lucide-react"

import { AdminPageShell } from "@/components/admin-page-shell"
import { SafetyDashboardCharts } from "@/components/safety-dashboard/safety-dashboard-charts"
import { SafetyDashboardFilter } from "./safety-filter"
import { Button } from "@/components/ui/button"
import { EnterpriseScorecards } from "@/components/ui/enterprise-table-kit"
import { getSafetyDashboardData } from "@/lib/safety-dashboard/queries"

function formatNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return new Intl.NumberFormat("id-ID").format(Number.isFinite(parsed) ? parsed : 0)
}

export default async function SafetyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; location?: string }>
}) {
  const params = await searchParams
  const data = await getSafetyDashboardData(params)

  return (
    <AdminPageShell
      eyebrow="Safety Dashboard"
      title="Safety Dashboard"
      description="Overview KPI dan grafik K3 untuk manajemen. Form, import, dan tabel data dipisah ke halaman Data Management."
      actions={(
        <div className="flex flex-wrap items-center gap-3">
          <SafetyDashboardFilter filterOptions={data.filterOptions} />
          <Button asChild>
            <Link href="/dashboard/safety/data">
              <Database className="size-4" />
              Kelola Data Safety
            </Link>
          </Button>
        </div>
      )}
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
    </AdminPageShell>
  )
}
