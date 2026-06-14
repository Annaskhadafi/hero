"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  Label,
} from "recharts"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const PALETTE = [
  "#0b4f4e",
  "#2d7270",
  "#8c5818",
  "#4f7573",
  "#a8d0cd",
  "#c44e52",
  "#5c9ece",
  "#d4a843",
  "#7b68a8",
  "#e07b54",
  "#3d9a8f",
  "#b35c6e",
]

function getColor(i: number) {
  return PALETTE[i % PALETTE.length]
}

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-border/40 bg-surface-container-lowest transition hover:bg-surface-container-low ${className}`}
    >
      <div className="px-5 pb-2 pt-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex-1 px-4 pb-4">{children}</div>
    </div>
  )
}

function renderBarLabel(props: { x?: number; y?: number; width?: number; value?: number }) {
  const { x = 0, y = 0, width = 0, value } = props
  if (!value) return <></>
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="var(--foreground)"
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
      fontFamily="var(--font-manrope)"
    >
      {value}
    </text>
  )
}

function renderHorizontalBarLabel(props: { x?: number; y?: number; width?: number; value?: number }) {
  const { x = 0, y = 0, width = 0, value } = props
  if (!value) return <></>
  return (
    <text
      x={x + width + 6}
      y={y + 4}
      fill="var(--foreground)"
      textAnchor="start"
      fontSize={11}
      fontWeight={600}
      fontFamily="var(--font-manrope)"
    >
      {value}
    </text>
  )
}

function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; name: string; value: number
}) {
  const RADIAN = Math.PI / 180
  const labelRadius = outerRadius + 20
  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN)
  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN)
  const textAnchor = x > cx ? 'start' : 'end'
  const displayName = name.length > 14 ? name.slice(0, 12) + '…' : name
  return (
    <text
      x={x}
      y={y - 6}
      fill="var(--foreground)"
      textAnchor={textAnchor}
      fontSize={10}
      fontWeight={500}
    >
      {displayName}
    </text>
  )
}

function renderPieLabelLine({ cx, cy, midAngle, innerRadius, outerRadius }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number
}) {
  const RADIAN = Math.PI / 180
  const labelRadius = outerRadius + 14
  const x1 = cx + outerRadius * Math.cos(-midAngle * RADIAN)
  const y1 = cy + outerRadius * Math.sin(-midAngle * RADIAN)
  const x2 = cx + labelRadius * Math.cos(-midAngle * RADIAN)
  const y2 = cy + labelRadius * Math.sin(-midAngle * RADIAN)
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="var(--muted-foreground)"
      strokeWidth={1}
      strokeOpacity={0.5}
    />
  )
}

export function SickByCategoryPie({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title="Sakit berdasarkan kategori" subtitle="Distribusi kategori penyakit">
        <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">Belum ada data.</div>
      </ChartCard>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartCard title="Sakit berdasarkan kategori" subtitle={`${data.length} kategori · ${total} total`}>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="42%"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
              stroke="transparent"
              label={renderPieLabel}
              labelLine={renderPieLabelLine}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(i)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value} kasus (${((value / total) * 100).toFixed(1)}%)`, name]}
            />
            <Legend
              verticalAlign="bottom"
              height={32}
              formatter={(value: string) => (
                <span className="text-[11px] text-muted-foreground truncate max-w-[100px] inline-block">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function LateByReasonBar({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title="Terlambat berdasarkan alasan" subtitle="Top alasan keterlambatan">
        <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">Belum ada data.</div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Terlambat berdasarkan alasan" subtitle={`${data.length} alasan teratas`}>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 30, top: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <Tooltip formatter={(value: number) => [`${value} kasus`]} />
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              barSize={20}
              label={renderHorizontalBarLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(i)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function SickByDayBar({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title="Hari paling banyak sakit" subtitle="Distribusi sakit per hari">
        <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">Belum ada data.</div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Hari paling banyak sakit" subtitle="Distribusi sakit per hari dalam minggu">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(value: number) => [`${value} kasus`]} />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              barSize={30}
              label={renderBarLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(i)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function FrequentLateEmployees({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title="Karyawan sering terlambat" subtitle="Top karyawan terlambat">
        <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">Belum ada data.</div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Karyawan sering terlambat" subtitle={`${data.length} karyawan teratas`}>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 30, top: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <Tooltip formatter={(value: number) => [`${value} kali terlambat`]} />
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              barSize={18}
              label={renderHorizontalBarLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(i + 4)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function FrequentSickEmployees({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title="Karyawan sering sakit" subtitle="Top karyawan sakit">
        <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">Belum ada data.</div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Karyawan sering sakit" subtitle={`${data.length} karyawan teratas`}>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 30, top: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <Tooltip formatter={(value: number) => [`${value} kali sakit`]} />
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              barSize={18}
              label={renderHorizontalBarLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(i + 2)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function DepartmentBar({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title="Departemen paling banyak izin" subtitle="Distribusi izin per departemen">
        <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">Belum ada data.</div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Departemen paling banyak izin" subtitle={`${data.length} departemen teratas`}>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(value: number) => [`${value} izin`]} />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              barSize={26}
              label={renderBarLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(i + 6)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function MonthlyTrendArea({
  data,
}: {
  data: { label: string; sick: number; late: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title="Tren bulanan" subtitle="Perbandingan sakit & terlambat per bulan" className="lg:col-span-2">
        <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">Belum ada data.</div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Tren bulanan" subtitle="Perbandingan sakit & terlambat per bulan" className="lg:col-span-2">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSick" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c44e52" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#c44e52" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradLate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4a843" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#d4a843" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="sick"
              name="Sakit"
              stroke="#c44e52"
              fill="url(#gradSick)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#c44e52", stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Area
              type="monotone"
              dataKey="late"
              name="Terlambat"
              stroke="#d4a843"
              fill="url(#gradLate)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#d4a843", stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function SiteDistributionPie({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title="Distribusi per site" subtitle="Izin berdasarkan lokasi site">
        <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">Belum ada data.</div>
      </ChartCard>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartCard title="Distribusi per site" subtitle={`${data.length} site · ${total} total`}>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="42%"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
              stroke="transparent"
              label={renderPieLabel}
              labelLine={renderPieLabelLine}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(i)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value} kasus (${((value / total) * 100).toFixed(1)}%)`, name]}
            />
            <Legend
              verticalAlign="bottom"
              height={32}
              formatter={(value: string) => (
                <span className="text-[11px] text-muted-foreground truncate max-w-[100px] inline-block">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function LocationBar({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  if (!data.length) {
    return (
      <ChartCard title="Izin berdasarkan lokasi kerja" subtitle="Distribusi izin per lokasi">
        <div className="grid h-[320px] place-items-center text-sm text-muted-foreground">Belum ada data.</div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Izin berdasarkan lokasi kerja" subtitle={`${data.length} lokasi · Berdasarkan lokasi site`}>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 30, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(value: number) => [`${value} izin`]} />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              barSize={28}
              label={renderBarLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(i + 8)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
