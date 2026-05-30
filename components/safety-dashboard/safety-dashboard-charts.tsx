"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card } from "@/components/ui/card"

const COLORS = ["#003461", "#0ea5e9", "#f59e0b", "#ef4444", "#22c55e", "#8b5cf6"]

type SafetyCharts = {
  incidentTrend: Array<Record<string, string | number>>
  certificationStatus: Array<{ name: string; value: number }>
  weeklyActivitiesByCategory: Array<{ category: string; count: number }>
  manHoursByLocation: Array<{ location: string; manHours: number; target: number }>
  performanceComparison: Array<Record<string, string | number>>
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="surface-module-card rounded-[1.2rem] border-0 p-4">
      <div className="mb-3 space-y-1">
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="h-[280px] min-w-0">{children}</div>
    </Card>
  )
}

export function SafetyDashboardCharts({ charts }: { charts: SafetyCharts }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Incident trend" description="Tren kategori incident per bulan.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={charts.incidentTrend} margin={{ left: 0, right: 16, top: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Total" stroke="#003461" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="MTC" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="PD" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="NearMiss" stroke="#22c55e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Safety man hours" description="Jam kerja aman dibanding target per lokasi.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.manHoursByLocation} margin={{ left: 0, right: 16, top: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="location" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="manHours" fill="#003461" radius={[8, 8, 0, 0]} />
            <Bar dataKey="target" fill="#94a3b8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Certification status" description="Distribusi status sertifikasi alat.">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={charts.certificationStatus} dataKey="value" nameKey="name" outerRadius={92} label>
              {charts.certificationStatus.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Weekly activities" description="Jumlah aktivitas K3 per kategori.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.weeklyActivitiesByCategory} margin={{ left: 0, right: 16, top: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip />
            <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="xl:col-span-2">
        <ChartCard title="Performance threshold vs actual" description="Perbandingan threshold dan actual untuk indikator utama per site.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.performanceComparison} margin={{ left: 0, right: 16, top: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="site" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="propertyDamageThreshold" fill="#94a3b8" radius={[8, 8, 0, 0]} />
              <Bar dataKey="propertyDamageActual" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
