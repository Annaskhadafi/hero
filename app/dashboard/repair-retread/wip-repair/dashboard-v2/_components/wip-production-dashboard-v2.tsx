"use client"

import { useMemo, useState } from "react"
import { Activity, CalendarDays, Factory, Gauge } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { WipRepairRecord, WipRepairWorkOrderDetailRecord } from "@/lib/types/wip-repair"
import { buildWipRepairProductionData } from "@/lib/wip-repair-dashboard"

type Props = {
  data: WipRepairRecord[]
  workOrderDetails: WipRepairWorkOrderDetailRecord[]
}

const chartConfig = {
  total: { label: "Out", color: "#2563eb" },
  average: { label: "Average", color: "#ef4444" },
} satisfies ChartConfig

function formatNumber(value: number) {
  return value.toLocaleString("id-ID")
}

function getProductionPeriods(details: WipRepairWorkOrderDetailRecord[]) {
  return Array.from(
    new Set(
      details.flatMap((detail) => {
        const finalStage = ["finishing", "painting"].includes(detail.job?.trim().toLowerCase() ?? "")
        const period = detail.date?.match(/^(\d{4})-(\d{2})/)?.[0]
        return finalStage && period ? [period] : []
      })
    )
  ).sort((left, right) => right.localeCompare(left))
}

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number)
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1))
}

function Metric({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: typeof Factory }) {
  return (
    <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 font-[Manrope] text-3xl font-bold tracking-tight text-slate-950 tabular-nums">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  )
}

function DataStrip({ rows }: { rows: Array<{ label: string; color: string; values: number[] }> }) {
  const contentWidth = Math.max(580, ...rows.map((row) => row.values.length * 64 + 90))

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 text-xs">
      <div style={{ minWidth: contentWidth }}>
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[90px_1fr] border-b border-slate-200 last:border-b-0">
            <div className="sticky left-0 z-10 flex items-center gap-2 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: row.color }} />
              {row.label}
            </div>
            <div className="grid bg-white" style={{ gridTemplateColumns: `repeat(${Math.max(row.values.length, 1)}, minmax(64px, 1fr))` }}>
              {row.values.map((value, index) => (
                <span key={index} className="border-l border-slate-100 px-2 py-2 text-center font-medium text-slate-700 tabular-nums">
                  {formatNumber(value)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WipProductionDashboardV2({ data, workOrderDetails }: Props) {
  const periods = useMemo(() => getProductionPeriods(workOrderDetails), [workOrderDetails])
  const fallbackPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  const periodOptions = periods.length > 0 ? periods : [fallbackPeriod]
  const [period, setPeriod] = useState(periodOptions[0])
  const [year, month] = period.split("-").map(Number)
  const production = useMemo(
    () => buildWipRepairProductionData(data, workOrderDetails, year, month),
    [data, month, workOrderDetails, year]
  )
  const topSite = production.ytdBySite[0]
  const siteChartWidth = Math.max(920, production.ytdBySite.length * 92)
  const monthName = periodLabel(period)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[Manrope] text-2xl font-bold tracking-tight text-slate-950">WIP Dashboard V2</h1>
          <p className="mt-1 text-sm text-slate-500">Production repair berdasarkan output tahap Finishing/Painting dengan nama site yang sudah digabungkan.</p>
        </div>
        <label className="grid w-full gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:w-auto">
          Periode MTD
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium normal-case text-slate-800 shadow-sm sm:h-10 sm:min-w-52"
          >
            {periodOptions.map((item) => <option key={item} value={item}>{periodLabel(item)}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title={`YTD Produksi ${year}`} value={`${formatNumber(production.ytdTotal)} pcs`} detail={`Januari–${monthName}`} icon={Factory} />
        <Metric title="MTD Produksi" value={`${formatNumber(production.mtdTotal)} pcs`} detail={monthName} icon={CalendarDays} />
        <Metric title="Site Berproduksi" value={formatNumber(production.ytdBySite.length)} detail={`Aktif sampai ${monthName}`} icon={Gauge} />
        <Metric title="Top Site YTD" value={topSite ? `${formatNumber(topSite.total)} pcs` : "0 pcs"} detail={topSite?.name ?? "Belum ada output"} icon={Activity} />
      </div>

      <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base text-slate-950">YTD Production Repair {year} — All Site</CardTitle>
          <CardDescription>Output produksi seluruh site per bulan.</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-5 sm:pb-5">
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[720px]">
              <ChartContainer config={chartConfig} className="h-[300px] w-full sm:h-[330px]">
                <BarChart data={production.monthlyAllSites} margin={{ top: 28, right: 16, bottom: 4, left: -12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" name="Out" fill="#2563eb" radius={[5, 5, 0, 0]}>
                    <LabelList dataKey="total" position="top" className="fill-slate-700 text-[10px]" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
          <DataStrip rows={[{ label: "Out", color: "#2563eb", values: production.monthlyAllSites.map((item) => item.total) }]} />
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base text-slate-950">Average YTD Production Repair All Site {year}</CardTitle>
          <CardDescription>Batang Out dan garis Average = Out ÷ {month} bulan YTD, mengikuti grafik referensi.</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-5 sm:pb-5">
          <div className="overflow-x-auto pb-2">
            <div style={{ width: siteChartWidth }}>
              <ChartContainer config={chartConfig} className="h-[390px] w-full">
                <ComposedChart data={production.ytdBySite} margin={{ top: 32, right: 22, bottom: 74, left: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis yAxisId="out" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <YAxis yAxisId="average" orientation="right" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend verticalAlign="top" height={28} />
                  <Bar yAxisId="out" dataKey="total" name="Out" fill="#2563eb" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="total" position="top" className="fill-slate-700 text-[10px]" />
                  </Bar>
                  <Line yAxisId="average" type="linear" dataKey="average" name="Average" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, fill: "#ef4444" }}>
                    <LabelList dataKey="average" position="right" className="fill-rose-600 text-[10px]" />
                  </Line>
                </ComposedChart>
              </ChartContainer>
              <DataStrip rows={[
                { label: "Out", color: "#2563eb", values: production.ytdBySite.map((item) => item.total) },
                { label: "Average", color: "#ef4444", values: production.ytdBySite.map((item) => item.average) },
              ]} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base text-slate-950">MTD Production Repair Per Size — {monthName}</CardTitle>
          <CardDescription>Output bulan berjalan dikelompokkan berdasarkan tyre size.</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-5 sm:pb-5">
          <div className="overflow-x-auto pb-2">
            <div style={{ minWidth: Math.max(620, production.mtdBySize.length * 90) }}>
              <ChartContainer config={chartConfig} className="h-[320px] w-full sm:h-[350px]">
                <BarChart data={production.mtdBySize} margin={{ top: 28, right: 16, bottom: 52, left: -12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" name="Out" fill="#0e7490" radius={[5, 5, 0, 0]}>
                    <LabelList dataKey="total" position="top" className="fill-slate-700 text-[10px]" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
          <DataStrip rows={[{ label: "Out", color: "#0e7490", values: production.mtdBySize.map((item) => item.total) }]} />
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-[Manrope] text-lg font-bold text-slate-950">Grafik Masing-Masing Site</h2>
            <p className="text-sm text-slate-500">Batang output bulanan dan garis running average.</p>
          </div>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{production.siteTrends.length} site</Badge>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {production.siteTrends.map((site) => (
            <Card key={site.site} className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
              <CardHeader className="flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:px-5">
                <div>
                  <CardTitle className="text-base text-slate-950">{site.site}</CardTitle>
                  <CardDescription>Monthly output & average {year}</CardDescription>
                </div>
                <Badge variant="secondary" className="tabular-nums">{formatNumber(site.total)} pcs YTD</Badge>
              </CardHeader>
              <CardContent className="px-3 pb-4 sm:px-5 sm:pb-5">
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[620px]">
                    <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
                      <ComposedChart data={site.months} margin={{ top: 24, right: 8, bottom: 4, left: -18 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} />
                        <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total" name="Out" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Line type="linear" dataKey="average" name="Average" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2.5, fill: "#ef4444" }} />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
