"use client"

import {
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  FileWarning,
  Stethoscope,
  TrendingUp,
  XCircle,
} from "lucide-react"

type KpiItem = {
  label: string
  value: number | string
  meta?: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  iconColor: string
  valueColor: string
}

const kpiDefs: KpiItem[] = [
  {
    label: "Total Izin",
    value: 0,
    icon: Activity,
    accent: "border-l-primary",
    iconColor: "bg-primary/10 text-primary",
    valueColor: "text-foreground",
    meta: "Semua data izin",
  },
  {
    label: "Total Sakit",
    value: 0,
    icon: Stethoscope,
    accent: "border-l-red-500",
    iconColor: "bg-red-500/10 text-red-600",
    valueColor: "text-red-600",
    meta: "Dengan kategori penyakit",
  },
  {
    label: "Total Terlambat",
    value: 0,
    icon: Clock,
    accent: "border-l-amber-500",
    iconColor: "bg-amber-500/10 text-amber-600",
    valueColor: "text-amber-600",
    meta: "Dengan alasan & jam masuk",
  },
  {
    label: "Departemen Terdampak",
    value: 0,
    icon: Building2,
    accent: "border-l-violet-500",
    iconColor: "bg-violet-500/10 text-violet-600",
    valueColor: "text-violet-600",
    meta: "Unit kerja terdampak",
  },
  {
    label: "Pending Approval",
    value: 0,
    icon: FileWarning,
    accent: "border-l-orange-500",
    iconColor: "bg-orange-500/10 text-orange-600",
    valueColor: "text-orange-600",
    meta: "Butuh action HR",
  },
  {
    label: "Approved",
    value: 0,
    icon: CheckCircle2,
    accent: "border-l-emerald-500",
    iconColor: "bg-emerald-500/10 text-emerald-600",
    valueColor: "text-emerald-600",
    meta: "Sudah masuk attendance",
  },
  {
    label: "Rejected",
    value: 0,
    icon: XCircle,
    accent: "border-l-rose-500",
    iconColor: "bg-rose-500/10 text-rose-600",
    valueColor: "text-rose-600",
    meta: "Ditolak",
  },
  {
    label: "Bulan Ini",
    value: 0,
    icon: TrendingUp,
    accent: "border-l-sky-500",
    iconColor: "bg-sky-500/10 text-sky-600",
    valueColor: "text-sky-600",
    meta: "Izin bulan berjalan",
  },
]

export function IzinKpiGrid({ data }: { data: Record<string, number> }) {
  const items = kpiDefs.map((item) => ({
    ...item,
    value: data[item.label.toLowerCase().replace(/\s/g, "_")] ?? 0,
  }))

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className={`group relative overflow-hidden rounded-xl border border-border/40 bg-surface-container-lowest border-l-[3px] ${item.accent} px-4 py-3 transition hover:bg-surface-container-low`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p className={`mt-1 tabular-nums font-display text-2xl font-bold leading-none ${item.valueColor}`}>
                  {item.value}
                </p>
                {item.meta && (
                  <p className="mt-1 text-[10px] text-muted-foreground">{item.meta}</p>
                )}
              </div>
              <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.iconColor}`}>
                <Icon className="size-4" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
