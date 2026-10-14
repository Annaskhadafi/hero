'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts'
import {
  Layers,
  CircleDot,
  Truck,
  ListChecks,
  ChevronRight,
  TrendingUp,
  Info,
} from 'lucide-react'
import type { ActivityGroupingResult, ActivityGroupSummary } from '@/lib/ewh/calculate-activity-grouping'

interface Props {
  summary: ActivityGroupingResult
  dateStr: string
}

type MetricMode = 'tire' | 'unit'

const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#64748b', // slate
]

export function ActivityGroupingTab({ summary, dateStr }: Props) {
  const [metricMode, setMetricMode] = useState<MetricMode>('tire')
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null)

  const { groups, overall } = summary

  // Tentukan grup aktif (default ke grup pertama jika belum dipilih atau pilihan lama hilang)
  const activeGroup: ActivityGroupSummary | null = useMemo(() => {
    if (!groups.length) return null
    if (selectedGroupName) {
      const found = groups.find((g) => g.groupName === selectedGroupName)
      if (found) return found
    }
    return groups[0]
  }, [groups, selectedGroupName])

  // Data untuk Master Chart (Level 1: Overview Seluruh Grup)
  const masterChartData = useMemo(() => {
    return groups.map((g) => ({
      name: g.groupName,
      value: metricMode === 'tire' ? g.totalTireCount : g.totalUnitCount,
      itemCount: g.itemCount,
      tireCount: g.totalTireCount,
      unitCount: g.totalUnitCount,
      rawGroup: g,
    }))
  }, [groups, metricMode])

  // Data untuk Child Detail Chart (Level 2: Rincian Aktivitas dalam Grup Terpilih)
  const childChartData = useMemo(() => {
    if (!activeGroup) return []
    return activeGroup.activities.map((act) => ({
      name: act.activityLabel,
      value: metricMode === 'tire' ? act.tireCount : act.unitCount,
      tireCount: act.tireCount,
      unitCount: act.unitCount,
      itemCount: act.itemCount,
      units: act.units,
    }))
  }, [activeGroup, metricMode])

  const metricLabel = metricMode === 'tire' ? 'Jumlah Ban (Tire)' : 'Jumlah Unit'
  const metricUnitName = metricMode === 'tire' ? 'Ban' : 'Unit'

  if (groups.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
        <Layers className="h-12 w-12 stroke-[1.2] text-muted-foreground/60 mb-3" />
        <p className="text-base font-semibold text-foreground">Tidak Ada Data Aktivitas</p>
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          Belum ada catatan aktivitas pada tanggal ini ({dateStr}). Pastikan karyawan telah mengisi laporan Daily Activity.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Grup Aktivitas</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{overall.totalGroups}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CircleDot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Ban (Tires)</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{overall.totalTireCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Unit Terlibat</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{overall.totalUnitCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Input Aktivitas</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{overall.totalItems}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Control Bar: Metric Toggle Switch */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card/40 p-3 shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span>Metrik Analisis Grafik:</span>
          <span className="font-semibold text-foreground">{metricLabel}</span>
        </div>

        <div className="inline-flex items-center rounded-lg border bg-muted/50 p-1">
          <Button
            type="button"
            variant={metricMode === 'tire' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMetricMode('tire')}
            className={`h-8 px-3 text-xs font-medium transition-all ${
              metricMode === 'tire' ? 'shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CircleDot className="mr-1.5 h-3.5 w-3.5" />
            Total Ban (Tire Count)
          </Button>
          <Button
            type="button"
            variant={metricMode === 'unit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMetricMode('unit')}
            className={`h-8 px-3 text-xs font-medium transition-all ${
              metricMode === 'unit' ? 'shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Truck className="mr-1.5 h-3.5 w-3.5" />
            Total Unit (Unit Count)
          </Button>
        </div>
      </div>

      {/* Charts Grid: Master (Left / Top) & Detail (Right / Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MASTER CHART: Ringkasan Group Aktivitas */}
        <Card className="lg:col-span-5 p-5 flex flex-col gap-4 border shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Grafik Grup Aktivitas
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Klik salah satu bar atau daftar grup di bawah untuk melihat rincian aktivitasnya.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {groups.length} Grup
            </Badge>
          </div>

          {/* Master Recharts BarChart */}
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={masterChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={110}
                  tickFormatter={(val: string) => (val.length > 14 ? `${val.slice(0, 14)}…` : val)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md">
                          <p className="font-semibold text-foreground">{data.name}</p>
                          <div className="mt-1.5 space-y-1 text-muted-foreground">
                            <p className="flex justify-between gap-4">
                              <span>Total Ban:</span>
                              <strong className="text-foreground">{data.tireCount} ban</strong>
                            </p>
                            <p className="flex justify-between gap-4">
                              <span>Total Unit:</span>
                              <strong className="text-foreground">{data.unitCount} unit</strong>
                            </p>
                            <p className="flex justify-between gap-4">
                              <span>Input Aktivitas:</span>
                              <strong className="text-foreground">{data.itemCount} kali</strong>
                            </p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry) => setSelectedGroupName(entry.name)}
                  cursor="pointer"
                >
                  {masterChartData.map((entry, index) => {
                    const isSelected = activeGroup?.groupName === entry.name
                    return (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        opacity={isSelected ? 1 : 0.65}
                        stroke={isSelected ? '#000000' : 'transparent'}
                        strokeWidth={isSelected ? 1.5 : 0}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Group Selector List */}
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
            {groups.map((group, idx) => {
              const isSelected = activeGroup?.groupName === group.groupName
              const val = metricMode === 'tire' ? group.totalTireCount : group.totalUnitCount
              const color = CHART_COLORS[idx % CHART_COLORS.length]

              return (
                <button
                  key={group.groupName}
                  type="button"
                  onClick={() => setSelectedGroupName(group.groupName)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-accent/70 border-primary/50 text-foreground shadow-xs font-semibold'
                      : 'hover:bg-muted/50 border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{group.groupName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-foreground">
                      {val} {metricUnitName}
                    </span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform ${
                        isSelected ? 'text-primary translate-x-0.5' : 'text-muted-foreground/50'
                      }`}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* DETAIL DRILLDOWN CHART: Rincian Aktivitas di Dalam Grup Terpilih */}
        <Card className="lg:col-span-7 p-5 flex flex-col gap-4 border shadow-sm">
          {activeGroup ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                      Detail Drilldown
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {activeGroup.groupName}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-0.5">
                    Rincian Aktivitas di Dalam Grup
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border">
                  <div>
                    Total Ban:{' '}
                    <span className="font-semibold text-foreground">{activeGroup.totalTireCount}</span>
                  </div>
                  <span className="text-muted-foreground/40">•</span>
                  <div>
                    Total Unit:{' '}
                    <span className="font-semibold text-foreground">{activeGroup.totalUnitCount}</span>
                  </div>
                </div>
              </div>

              {/* Child Chart */}
              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={childChartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={45}
                      tickFormatter={(val: string) =>
                        val.length > 18 ? `${val.slice(0, 18)}…` : val
                      }
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md max-w-xs">
                              <p className="font-semibold text-foreground">{data.name}</p>
                              <div className="mt-1.5 space-y-1 text-muted-foreground">
                                <p className="flex justify-between gap-4">
                                  <span>Jumlah Ban:</span>
                                  <strong className="text-foreground">{data.tireCount} ban</strong>
                                </p>
                                <p className="flex justify-between gap-4">
                                  <span>Jumlah Unit:</span>
                                  <strong className="text-foreground">{data.unitCount} unit</strong>
                                </p>
                                <p className="flex justify-between gap-4">
                                  <span>Frekuensi Input:</span>
                                  <strong className="text-foreground">{data.itemCount} kali</strong>
                                </p>
                                {data.units && data.units.length > 0 && (
                                  <div className="mt-2 pt-2 border-t text-[11px]">
                                    <span className="block text-muted-foreground mb-1">Unit Dikerjakan:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {data.units.map((u: string) => (
                                        <span
                                          key={u}
                                          className="bg-accent px-1.5 py-0.5 rounded font-mono text-[10px]"
                                        >
                                          {u}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    >
                      {childChartData.map((_, index) => (
                        <Cell
                          key={`child-cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detail Table / Cards for Activities inside this Group */}
              <div className="flex flex-col gap-2 mt-2">
                <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Daftar Rincian Aktivitas & Unit Terkait</span>
                  <span>{activeGroup.activities.length} Aktivitas Terdaftar</span>
                </div>

                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {activeGroup.activities.map((act) => (
                    <div
                      key={act.activityLabel}
                      className="p-3 rounded-lg border bg-card/60 flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {act.activityLabel}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {act.tireCount} Ban
                          </Badge>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {act.unitCount} Unit
                          </Badge>
                        </div>
                      </div>

                      {act.units.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Unit:
                          </span>
                          {act.units.map((unitNo) => (
                            <Badge
                              key={unitNo}
                              variant="outline"
                              className="font-mono text-[10px] px-1.5 py-0 bg-muted/30"
                            >
                              {unitNo}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                          <Info className="h-3 w-3" /> Tidak ada nomor unit yang tercatat pada aktivitas ini
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Pilih grup aktivitas di sebelah kiri untuk melihat rinciannya.
              </div>
            )}
        </Card>
      </div>

      {/* Global Units Tag Summary Card */}
      {overall.allUnits.length > 0 && (
        <Card className="p-4 border shadow-xs bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-primary" />
              Seluruh Unit Yang Ditangani Pada Tanggal Ini ({dateStr})
            </span>
            <Badge variant="outline" className="text-xs font-mono">
              {overall.allUnits.length} Unit Total
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {overall.allUnits.map((u) => (
              <span
                key={u}
                className="inline-flex items-center rounded-md border bg-card px-2 py-0.5 text-xs font-mono font-medium text-foreground shadow-2xs"
              >
                {u}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
