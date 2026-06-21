'use client'

import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PaginatedTable } from '@/components/ui/paginated-table'

const CHART_COLORS = ['#0b4f4e', '#2d7270', '#8c5818', '#4f7573', '#a8d0cd']
const SEVERITY_ORDER = ['Low', 'Medium', 'High', 'Critical']
const OBSERVATION_STATUS_ORDER = ['open', 'action_taken', 'closed']
const INCIDENT_STATUS_ORDER = ['open', 'investigating', 'closed']

function labelStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function buildStatusComposition(rows: { status: string }[], order: string[], colors: string[]) {
  const counts: Record<string, number> = {}
  rows.forEach((row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  })

  const total = rows.length || 1
  const data = order
    .filter((status) => (counts[status] ?? 0) > 0)
    .map((status, index) => ({
      name: labelStatus(status),
      status,
      value: counts[status] ?? 0,
      percentage: (((counts[status] ?? 0) / total) * 100).toFixed(2),
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value)

  return { data, total: rows.length }
}

function buildSeverityStatusMatrix(rows: { status: string; severity: string }[]) {
  const statuses = Array.from(new Set(rows.map((row) => row.status))).sort()
  const severities = SEVERITY_ORDER.filter((severity) =>
    rows.some((row) => row.severity === severity)
  )

  const statusTotals: Record<string, number> = {}
  statuses.forEach((status) => {
    statusTotals[status] = rows.filter((row) => row.status === status).length
  })

  const chartData = statuses.map((status) => {
    const entry: Record<string, number | string> = { status: labelStatus(status) }
    severities.forEach((severity) => {
      entry[severity] = rows.filter(
        (row) => row.status === status && row.severity === severity
      ).length
    })
    return entry
  })

  const tableRows = severities.map((severity) => {
    const rowTotal = rows.filter((row) => row.severity === severity).length
    const cells = statuses.map((status) => {
      const count = rows.filter((row) => row.severity === severity && row.status === status).length
      const pct = statusTotals[status] ? ((count / statusTotals[status]) * 100).toFixed(0) : '0'
      return { status, count, pct }
    })
    return { severity, rowTotal, cells }
  })

  return { statuses, severities, chartData, tableRows, total: rows.length }
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

export function HseDashboardCharts({
  observations,
  incidents,
}: {
  observations: { status: string; severity: string }[]
  incidents: { status: string }[]
}) {
  const obsFull = buildStatusComposition(observations, OBSERVATION_STATUS_ORDER, CHART_COLORS)
  const incFull = buildStatusComposition(incidents, INCIDENT_STATUS_ORDER, CHART_COLORS)
  const severityMatrix = buildSeverityStatusMatrix(observations)

  const obsChart = { ...obsFull, data: obsFull.data.slice(0, 5) }
  const incChart = { ...incFull, data: incFull.data.slice(0, 5) }

  const dominantObservation = obsChart.data.reduce(
    (max, item) => (item.value > max.value ? item : max),
    obsChart.data[0] ?? { name: '-', value: 0, percentage: '0' }
  )
  const dominantIncident = incChart.data.reduce(
    (max, item) => (item.value > max.value ? item : max),
    incChart.data[0] ?? { name: '-', value: 0, percentage: '0' }
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SectionCard
        title="Komposisi Status Observasi"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
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
                data={obsChart.data}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="85%"
                stroke="#ffffff"
                strokeWidth={3}
              >
                {obsChart.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} (${props?.payload?.percentage}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="bg-surface-container-low text-muted-foreground rounded-lg px-3 py-2 text-xs">
          <span className="text-foreground font-semibold">Anotasi:</span> Mayoritas observasi
          berstatus {dominantObservation.name} ({dominantObservation.percentage}%).
        </p>
        <PaginatedTable
          columns={['Status', 'Qty', 'Percentage']}
          rows={obsFull.data.map((item) => [item.name, item.value, `${item.percentage}%`])}
        />
      </SectionCard>

      <SectionCard
        title="Analisis Status Insiden"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
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
            <BarChart data={incChart.data} margin={{ top: 8, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(45,114,112,0.12)"
              />
              <XAxis
                dataKey="name"
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
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} (${props?.payload?.percentage}%)`,
                  name,
                ]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {incChart.data.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="bg-surface-container-low text-muted-foreground rounded-lg px-3 py-2 text-xs">
          <span className="text-foreground font-semibold">Anotasi:</span> Proporsi terbesar insiden
          berstatus {dominantIncident.name} ({dominantIncident.percentage}%).
        </p>
        <PaginatedTable
          columns={['Status', 'Qty', 'Percentage']}
          rows={incFull.data.map((item) => [item.name, item.value, `${item.percentage}%`])}
        />
      </SectionCard>

      <SectionCard
        title="Severity vs Status Observasi"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
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
            <BarChart data={severityMatrix.chartData} margin={{ top: 8, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(45,114,112,0.12)"
              />
              <XAxis
                dataKey="status"
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
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {severityMatrix.severities.map((severity, index) => (
                <Bar
                  key={severity}
                  dataKey={severity}
                  name={severity}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="bg-surface-container-low text-muted-foreground rounded-lg px-3 py-2 text-xs">
          <span className="text-foreground font-semibold">Anotasi:</span> Distribusi severity
          menunjukkan fokus area risiko pada setiap status observasi.
        </p>
        <div className="ring-outline-ghost overflow-hidden rounded-lg ring-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="text-muted-foreground px-2 py-2 text-left text-[0.65rem] font-bold tracking-[0.08em] uppercase">
                  Severity
                </th>
                {severityMatrix.statuses.map((status) => (
                  <th
                    key={status}
                    colSpan={2}
                    className="text-muted-foreground px-2 py-2 text-center text-[0.65rem] font-bold tracking-[0.08em] uppercase"
                  >
                    {labelStatus(status)}
                  </th>
                ))}
                <th
                  colSpan={2}
                  className="text-muted-foreground px-2 py-2 text-center text-[0.65rem] font-bold tracking-[0.08em] uppercase"
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {severityMatrix.tableRows.map((row) => (
                <tr key={row.severity} className="border-outline-ghost border-b last:border-b-0">
                  <td className="text-foreground px-2 py-2 font-medium">{row.severity}</td>
                  {row.cells.map((cell) => (
                    <React.Fragment key={cell.status}>
                      <td className="text-foreground px-2 py-2 text-center tabular-nums">
                        {cell.count}
                      </td>
                      <td className="text-muted-foreground px-2 py-2 text-center tabular-nums">
                        {cell.pct}%
                      </td>
                    </React.Fragment>
                  ))}
                  <td className="text-foreground px-2 py-2 text-center font-medium tabular-nums">
                    {row.rowTotal}
                  </td>
                  <td className="text-muted-foreground px-2 py-2 text-center tabular-nums">
                    {severityMatrix.total
                      ? ((row.rowTotal / severityMatrix.total) * 100).toFixed(0)
                      : 0}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
