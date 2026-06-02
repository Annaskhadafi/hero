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
  LabelList,
} from "recharts"

import { Card } from "@/components/ui/card"

// Vibrant colors for a colorful "super keren" look
const COLORS = ["#0ea5e9", "#f43f5e", "#8b5cf6", "#10b981", "#f59e0b", "#06b6d4"]

type SafetyCharts = {
  incidentTrend: Array<Record<string, string | number>>
  certificationStatus: Array<{ name: string; value: number }>
  weeklyActivitiesByCategory: Array<{ category: string; count: number }>
  manHoursByLocation: Array<{ location: string; manHours: number; target: number }>
  monthlyManHoursTrend: Array<{ month: string; manHours: number }>
  performanceComparison: Array<Record<string, string | number>>
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="surface-module-card relative overflow-hidden rounded-[1.2rem] border border-border/50 bg-gradient-to-br from-surface-container-lowest to-surface-container-low/30 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 space-y-1">
        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="h-[300px] min-w-0">{children}</div>
    </Card>
  )
}

export function SafetyDashboardCharts({ charts }: { charts: SafetyCharts }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard title="Incident Trend" description="Tren kategori incident per bulan.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={charts.incidentTrend} margin={{ left: 0, right: 16, top: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
            />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />
            <Line type="monotone" dataKey="Total" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="MTC" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="PD" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="NearMiss" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Safety Man Hours" description="Jam kerja aman dibanding target per lokasi.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.manHoursByLocation} margin={{ left: 0, right: 16, top: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="location" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
            />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />
            <Bar dataKey="manHours" fill="#0ea5e9" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="manHours" position="top" fill="#0ea5e9" fontSize={11} fontWeight={600} />
            </Bar>
            <Bar dataKey="target" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Certification Status" description="Distribusi status sertifikasi alat.">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={charts.certificationStatus}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={96}
              innerRadius={56}
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
            >
              {charts.certificationStatus.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
            />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Weekly Activities" description="Jumlah aktivitas K3 per kategori.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.weeklyActivitiesByCategory} margin={{ left: 0, right: 16, top: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="count" position="top" fill="#8b5cf6" fontSize={11} fontWeight={600} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="xl:col-span-2">
        <ChartCard title="Performance Threshold vs Actual" description="Perbandingan threshold dan actual untuk indikator utama per site.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.performanceComparison} margin={{ left: 0, right: 16, top: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="site" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px" }} />
              <Bar dataKey="propertyDamageThreshold" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="PD Threshold" />
              <Bar dataKey="propertyDamageActual" fill="#f43f5e" radius={[6, 6, 0, 0]} name="PD Actual">
                <LabelList dataKey="propertyDamageActual" position="top" fill="#f43f5e" fontSize={11} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="xl:col-span-2">
        <ChartCard title="Safety Man Hours Per Bulan" description="Tren jam kerja aman bulanan.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.monthlyManHoursTrend} margin={{ left: 0, right: 16, top: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
              />
              <Bar dataKey="manHours" fill="#10b981" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="manHours" position="top" fill="#10b981" fontSize={11} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

