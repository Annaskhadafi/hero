'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PaginatedTable } from '@/components/ui/paginated-table'

const CHART_COLORS = ['#0ea5e9', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#6366f1']

type SafetyCharts = {
  incidentTrend: Array<Record<string, string | number>>
  certificationStatus: Array<{ name: string; value: number }>
  weeklyActivitiesByCategory: Array<{ category: string; count: number }>
  manHoursByLocation: Array<{ location: string; manHours: number; target: number }>
  monthlyManHoursTrend: Array<{ month: string; manHours: number }>
  performanceComparison: Array<Record<string, string | number>>
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="surface-module-card overflow-hidden rounded-[1.1rem]">
      <div className="flex items-center justify-center gap-2 bg-[#1e40af] px-4 py-2.5 text-white">
        {icon}
        <h3 className="text-xs font-bold tracking-[0.12em] uppercase">{title}</h3>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </div>
  )
}

export function SafetyDashboardCharts({ charts }: { charts: SafetyCharts }) {
  // ── Certification ──────────────────────────────────────────────
  const totalCert = charts.certificationStatus.reduce((s, i) => s + i.value, 0)
  const certFull = charts.certificationStatus.map((item, i) => ({
    ...item,
    color: CHART_COLORS[i % CHART_COLORS.length],
    percentage: totalCert ? ((item.value / totalCert) * 100).toFixed(1) : '0',
  }))
  const certChart = [...certFull].sort((a, b) => b.value - a.value).slice(0, 5)

  // ── Incident Trend ─────────────────────────────────────────────
  const incidentFull = charts.incidentTrend
    .map((r) => ({
      month: String(r.month ?? '-'),
      total: Number(r.Total ?? 0),
    }))
    .reverse()
  const totalIncident = incidentFull.reduce((s, r) => s + r.total, 0)
  const incidentChart = incidentFull.slice(0, 5)

  // ── Man Hours ──────────────────────────────────────────────────
  const manHoursFull = charts.manHoursByLocation.map((r) => ({
    ...r,
    achievement: r.target > 0 ? Math.round((r.manHours / r.target) * 100) : 0,
  }))
  const totalManHours = manHoursFull.reduce((s, r) => s + r.manHours, 0)
  const manHoursChart = [...manHoursFull].sort((a, b) => b.manHours - a.manHours).slice(0, 5)

  // ── Weekly Activities ──────────────────────────────────────────
  const weeklyFull = charts.weeklyActivitiesByCategory.map((r, i) => ({
    ...r,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))
  const totalWeekly = weeklyFull.reduce((s, r) => s + r.count, 0)
  const weeklyChart = [...weeklyFull].sort((a, b) => b.count - a.count).slice(0, 5)

  // ── Monthly Man Hours Trend ────────────────────────────────────
  const monthlyFull = charts.monthlyManHoursTrend
    .map((r) => ({
      month: r.month,
      manHours: r.manHours,
    }))
    .reverse()
  const totalMonthly = monthlyFull.reduce((s, r) => s + r.manHours, 0)
  const monthlyChart = monthlyFull.slice(0, 5)

  // ── Performance Comparison ─────────────────────────────────────
  const perfFull = charts.performanceComparison.map((r) => ({
    site: String(r.site ?? '-'),
    propertyDamageThreshold: Number(r.propertyDamageThreshold ?? 0),
    propertyDamageActual: Number(r.propertyDamageActual ?? 0),
  }))
  const perfChart = [...perfFull]
    .sort((a, b) => b.propertyDamageActual - a.propertyDamageActual)
    .slice(0, 5)

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* Card 1: Certification Status */}
      <SectionCard
        title="Status Sertifikasi"
        icon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        }
      >
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={certChart}
                dataKey="value"
                nameKey="name"
                innerRadius="50%"
                outerRadius="80%"
                stroke="#fff"
                strokeWidth={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              >
                {certChart.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, n: string, p: any) => [
                  `${v} (${p?.payload?.percentage}%)`,
                  n,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="bg-surface-container-low text-muted-foreground rounded-lg px-3 py-2 text-xs">
          <span className="text-foreground font-semibold">Anotasi:</span> Total sertifikasi{' '}
          {totalCert}.
        </p>
        <PaginatedTable
          columns={['Status', 'Qty', '%']}
          rows={certFull.map((e) => [e.name, e.value, `${e.percentage}%`])}
        />
      </SectionCard>

      {/* Card 2: Incident Trend */}
      <SectionCard
        title="Tren Insiden"
        icon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
        }
      >
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incidentChart} margin={{ top: 20, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(45,114,112,0.12)"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(45,114,112,0.16)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip formatter={(v: number) => [formatNumber(v), 'Total']} />
              <Bar dataKey="total" fill="#0ea5e9" radius={[6, 6, 0, 0]}>
                <LabelList
                  dataKey="total"
                  position="top"
                  fill="#0ea5e9"
                  fontSize={11}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="bg-surface-container-low text-muted-foreground rounded-lg px-3 py-2 text-xs">
          <span className="text-foreground font-semibold">Anotasi:</span> Total{' '}
          {formatNumber(totalIncident)} insiden.
        </p>
        <PaginatedTable
          columns={['Bulan', 'Total']}
          rows={incidentFull.map((e) => [e.month, formatNumber(e.total)])}
        />
      </SectionCard>

      {/* Card 3: Man Hours per Lokasi */}
      <SectionCard
        title="Safety Man Hours"
        icon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
        }
      >
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={manHoursChart} margin={{ top: 20, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(45,114,112,0.12)"
              />
              <XAxis
                dataKey="location"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(45,114,112,0.16)' }}
                tickLine={false}
                angle={-20}
                textAnchor="end"
                height={40}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip formatter={(v: number, n: string) => [formatNumber(v), n]} />
              <Bar dataKey="manHours" fill="#10b981" radius={[6, 6, 0, 0]} name="Man Hours">
                <LabelList
                  dataKey="manHours"
                  position="top"
                  fill="#10b981"
                  fontSize={10}
                  fontWeight={600}
                  formatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
              </Bar>
              <Bar dataKey="target" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="bg-surface-container-low text-muted-foreground rounded-lg px-3 py-2 text-xs">
          <span className="text-foreground font-semibold">Anotasi:</span> Total{' '}
          {formatNumber(totalManHours)} jam kerja aman.
        </p>
        <PaginatedTable
          columns={['Lokasi', 'Jam', 'Target', '%']}
          rows={manHoursFull.map((e) => [
            e.location,
            formatNumber(e.manHours),
            formatNumber(e.target),
            `${e.achievement}%`,
          ])}
        />
      </SectionCard>

      {/* Card 4: Weekly Activities */}
      <SectionCard
        title="Aktivitas K3"
        icon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
        }
      >
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyChart} margin={{ top: 20, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(45,114,112,0.12)"
              />
              <XAxis
                dataKey="category"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(45,114,112,0.16)' }}
                tickLine={false}
                angle={-20}
                textAnchor="end"
                height={40}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip formatter={(v: number, n: string, p: any) => [v, n]} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Aktivitas">
                <LabelList
                  dataKey="count"
                  position="top"
                  fill="#8b5cf6"
                  fontSize={11}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="bg-surface-container-low text-muted-foreground rounded-lg px-3 py-2 text-xs">
          <span className="text-foreground font-semibold">Anotasi:</span>{' '}
          {formatNumber(totalWeekly)} aktivitas.
        </p>
        <PaginatedTable
          columns={['Kategori', 'Jumlah']}
          rows={weeklyFull.map((e) => [e.category, e.count])}
        />
      </SectionCard>

      {/* Card 5: Performance Threshold vs Actual */}
      <div className="xl:col-span-2">
        <SectionCard
          title="Performance Threshold vs Actual"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfChart} margin={{ top: 20, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(45,114,112,0.12)"
                />
                <XAxis
                  dataKey="site"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(45,114,112,0.16)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip formatter={(v: number) => [formatNumber(v), '']} />
                <Bar
                  dataKey="propertyDamageThreshold"
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                  name="PD Threshold"
                />
                <Bar
                  dataKey="propertyDamageActual"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  name="PD Actual"
                >
                  <LabelList
                    dataKey="propertyDamageActual"
                    position="top"
                    fill="#f43f5e"
                    fontSize={10}
                    fontWeight={600}
                    formatter={(v: number) => Math.round(v)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <PaginatedTable
            columns={['Site', 'PD Threshold', 'PD Actual']}
            rows={perfFull.map((e) => [
              e.site,
              formatNumber(e.propertyDamageThreshold),
              formatNumber(e.propertyDamageActual),
            ])}
          />
        </SectionCard>
      </div>

      {/* Card 6: Monthly Man Hours Trend */}
      <div className="xl:col-span-2">
        <SectionCard
          title="Safety Man Hours Per Bulan"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart} margin={{ top: 20, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(45,114,112,0.12)"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(45,114,112,0.16)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip formatter={(v: number) => [formatNumber(v), 'Man Hours']} />
                <Bar dataKey="manHours" fill="#06b6d4" radius={[6, 6, 0, 0]}>
                  <LabelList
                    dataKey="manHours"
                    position="top"
                    fill="#06b6d4"
                    fontSize={10}
                    fontWeight={600}
                    formatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="bg-surface-container-low text-muted-foreground rounded-lg px-3 py-2 text-xs">
            <span className="text-foreground font-semibold">Anotasi:</span> Total{' '}
            {formatNumber(totalMonthly)} jam.
          </p>
          <PaginatedTable
            columns={['Bulan', 'Man Hours']}
            rows={monthlyFull.map((e) => [e.month, formatNumber(e.manHours)])}
          />
        </SectionCard>
      </div>
    </div>
  )
}
