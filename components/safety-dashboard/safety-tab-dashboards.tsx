"use client"

import * as React from "react"
import { ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Wrench, Activity, Clock, TrendingUp, Users, Target, CheckCircle2 } from "lucide-react"
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
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  ComposedChart,
  LabelList,
} from "recharts"

import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import type { getSafetyDashboardData } from "@/lib/safety-dashboard/queries"

type SafetyData = Awaited<ReturnType<typeof getSafetyDashboardData>>

// Premium Color Palette
const PREMIUM_COLORS = {
  red: "#ff4757",
  green: "#2ed573",
  blue: "#1e90ff",
  purple: "#9b59b6",
  yellow: "#ffa502",
  teal: "#1abc9c",
  orange: "#ff7f50",
  pink: "#ff6b81",
}

const CHART_COLORS = Object.values(PREMIUM_COLORS)

export function CollapsibleTabDashboard({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-8 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-300"
    >
      <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl bg-gradient-to-r from-muted/50 via-muted/20 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{title}</h3>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">HSE Analytics Module</p>
          </div>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-9 h-9 p-0 rounded-full bg-background/50 hover:bg-background/80 border-border/50 shadow-sm transition-transform hover:scale-105">
            {isOpen ? <ChevronUp className="h-4 w-4 text-foreground/70" /> : <ChevronDown className="h-4 w-4 text-foreground/70" />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="border-t border-border/40 p-6 sm:p-8">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Reusable Premium KPI Card
function KpiCard({ title, value, subtext, icon: Icon, color, isPercentage = false }: { title: string, value: string | number, subtext?: string, icon: any, color: string, isPercentage?: boolean }) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl border-border/50 bg-card/50 backdrop-blur-sm">
      <div 
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-40" 
        style={{ background: color }} 
      />
      <div 
        className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full opacity-10 blur-2xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-30" 
        style={{ background: color }} 
      />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
            <div className="flex items-baseline gap-1">
              <p className="text-4xl font-black tracking-tighter" style={{ color: color }}>
                {value}
              </p>
              {isPercentage && <span className="text-2xl font-bold text-muted-foreground/50">%</span>}
            </div>
            {subtext && <p className="text-xs font-medium text-muted-foreground/80 bg-muted/50 inline-block px-2 py-1 rounded-md">{subtext}</p>}
          </div>
          <div 
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" 
            style={{ backgroundColor: `${color}15`, color: color, border: `1px solid ${color}30` }}
          >
            <Icon className="h-7 w-7" strokeWidth={2.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 1. Incident Reports
export function IncidentReportsDashboard({ data }: { data: SafetyData }) {
  const categoryCount = data.incidentReports.reduce<Record<string, number>>((acc, row) => {
    const key = row.category || "Uncategorized"
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const chartData = Object.entries(categoryCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  
  const chartConfig = {
    value: { label: "Total Incidents" },
    ...Object.fromEntries(
      chartData.map((item, index) => [
        item.name,
        { label: item.name, color: CHART_COLORS[index % CHART_COLORS.length] },
      ])
    ),
  }

  const openIncidents = data.incidentReports.filter((r) => r.status === "open").length
  const totalIncidents = data.incidentReports.length
  const closureRate = totalIncidents ? Math.round(((totalIncidents - openIncidents) / totalIncidents) * 100) : 0

  const incidentDates = data.incidentReports
    .filter(r => r.incidentDate)
    .map(r => new Date(r.incidentDate as Date | string))

  return (
    <div className="grid gap-6 xl:grid-cols-4">
      <div className="xl:col-span-1 flex flex-col gap-4">
        <KpiCard 
          title="Open Incidents" 
          value={openIncidents} 
          subtext="Requires Immediate Attention" 
          icon={AlertTriangle} 
          color={PREMIUM_COLORS.red} 
        />
        <KpiCard 
          title="Closure Rate" 
          value={closureRate} 
          isPercentage
          subtext="Resolution Efficiency" 
          icon={ShieldCheck} 
          color={PREMIUM_COLORS.green} 
        />
        <KpiCard 
          title="Total Recorded" 
          value={totalIncidents} 
          subtext="All Time Incidents" 
          icon={Activity} 
          color={PREMIUM_COLORS.blue} 
        />
      </div>
      
      <Card className="xl:col-span-3 border-border/40 shadow-sm bg-card/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold">Incident Calendar View</CardTitle>
          <CardDescription>Calendar heat map indicating dates when incidents or accidents occurred.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center overflow-x-auto">
          {incidentDates.length > 0 ? (
            <div className="scale-125 transform origin-top my-4">
              <Calendar
                mode="multiple"
                selected={incidentDates}
                defaultMonth={incidentDates[0] || new Date()}
                className="rounded-xl border border-border/50 bg-background/50 shadow-inner"
                classNames={{
                  day_selected: "bg-red-500 text-white hover:bg-red-600 hover:text-white focus:bg-red-500 focus:text-white",
                }}
              />
            </div>
          ) : (
            <div className="flex h-[350px] items-center justify-center text-sm font-medium text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">No incidents to display</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 2. Yearly Summary
export function YearlySummaryDashboard({ data }: { data: SafetyData }) {
  const chartData = data.yearlySummaries.map((r) => ({
    year: r.year,
    Fatality: r.fatality,
    LTI: r.lostDayInjury,
    RWDI: r.restrictedWorkDayInjury,
    MTC: r.medicalTreatmentCase,
    FA: r.firstAid,
    PD: r.propertyDamage,
  })).reverse()

  const chartConfig = {
    Fatality: { label: "Fatality", color: PREMIUM_COLORS.red },
    LTI: { label: "Lost Time Injury", color: PREMIUM_COLORS.yellow },
    RWDI: { label: "Restricted Work", color: PREMIUM_COLORS.blue },
    MTC: { label: "Medical Treatment", color: PREMIUM_COLORS.purple },
    FA: { label: "First Aid", color: PREMIUM_COLORS.teal },
    PD: { label: "Property Damage", color: PREMIUM_COLORS.orange },
  }

  return (
    <Card className="border-border/40 shadow-sm bg-card/30">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-2 rounded-full bg-primary" />
          <div>
            <CardTitle className="text-lg font-bold">Historical Safety Events (Year-over-Year)</CardTitle>
            <CardDescription>Stacked severity analysis showing how incident types evolve annually.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 13, fontWeight: 'bold' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <ChartTooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Fatality" stackId="a" fill="var(--color-Fatality)" animationDuration={1000} />
              <Bar dataKey="LTI" stackId="a" fill="var(--color-LTI)" animationDuration={1100} />
              <Bar dataKey="RWDI" stackId="a" fill="var(--color-RWDI)" animationDuration={1200} />
              <Bar dataKey="MTC" stackId="a" fill="var(--color-MTC)" animationDuration={1300} />
              <Bar dataKey="FA" stackId="a" fill="var(--color-FA)" animationDuration={1400} />
              <Bar dataKey="PD" stackId="a" fill="var(--color-PD)" radius={[6, 6, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[400px] items-center justify-center text-sm font-medium text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">No data available</div>
        )}
      </CardContent>
    </Card>
  )
}

// 3. Monthly Summary
export function MonthlySummaryDashboard({ data }: { data: SafetyData }) {
  const chartData = [...data.charts.incidentTrend].reverse()
  
  const chartConfig = {
    Total: { label: "Total Events", color: PREMIUM_COLORS.purple },
    LTI: { label: "Lost Time Injury", color: PREMIUM_COLORS.red },
    PD: { label: "Property Damage", color: PREMIUM_COLORS.yellow },
  }

  return (
    <Card className="border-border/40 shadow-sm bg-card/30 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl" />
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-2 rounded-full bg-purple-500" />
          <div>
            <CardTitle className="text-lg font-bold">Monthly Incident Trajectory</CardTitle>
            <CardDescription>Smoothing out frequency trends over the recent months to anticipate risks.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[380px] w-full">
            <AreaChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-Total)" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="var(--color-Total)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLTI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-LTI)" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="var(--color-LTI)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={30} tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <ChartTooltip cursor={{ stroke: 'var(--color-Total)', strokeWidth: 2, strokeDasharray: '5 5' }} content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ paddingTop: '15px' }} />
              <Area type="natural" dataKey="Total" stroke="var(--color-Total)" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} activeDot={{ r: 8, strokeWidth: 0 }} animationDuration={1500} />
              <Area type="natural" dataKey="LTI" stroke="var(--color-LTI)" fillOpacity={1} fill="url(#colorLTI)" strokeWidth={3} animationDuration={1500} />
              <Area type="natural" dataKey="PD" stroke="var(--color-PD)" fillOpacity={0} strokeWidth={3} strokeDasharray="6 6" animationDuration={1500} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[380px] items-center justify-center text-sm font-medium text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">No data available</div>
        )}
      </CardContent>
    </Card>
  )
}

// 4. Certifications
export function CertificationsDashboard({ data }: { data: SafetyData }) {
  const chartData = data.charts.certificationStatus
  const activeCount = chartData.find((c) => c.name.toUpperCase() === "AKTIF")?.value || 0
  const expiredCount = chartData.find((c) => c.name.toUpperCase() === "EXPIRED")?.value || 0
  const total = activeCount + expiredCount
  const safePercentage = total ? Math.round((activeCount/total)*100) : 0

  const chartConfig = {
    value: { label: "Equipments" },
    ...Object.fromEntries(
      chartData.map((item) => [
        item.name,
        { 
          label: item.name, 
          color: item.name.toUpperCase() === "EXPIRED" ? PREMIUM_COLORS.red : PREMIUM_COLORS.teal 
        },
      ])
    ),
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <KpiCard 
        title="Equipment Readiness" 
        value={safePercentage} 
        isPercentage
        subtext={`${activeCount} out of ${total} equipments active`} 
        icon={Target} 
        color={PREMIUM_COLORS.teal} 
      />
      <KpiCard 
        title="Expired Certificates" 
        value={expiredCount} 
        subtext="Requires Recertification" 
        icon={Wrench} 
        color={PREMIUM_COLORS.red} 
      />
      
      <Card className="md:col-span-2 border-border/40 shadow-sm bg-card/30">
        <CardHeader className="pb-0 text-center">
          <CardTitle className="text-lg font-bold">Certification Status Proportion</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full max-w-md">
              <PieChart>
                <defs>
                   <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                </defs>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={75}
                  paddingAngle={6}
                  cornerRadius={8}
                  stroke="none"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name.toUpperCase() === "EXPIRED" ? PREMIUM_COLORS.red : PREMIUM_COLORS.teal} 
                      filter="url(#shadow)"
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] w-full items-center justify-center text-sm font-medium text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">No data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 5. Performance
export function PerformanceDashboard({ data }: { data: SafetyData }) {
  const chartData = data.charts.performanceComparison

  const chartConfig = {
    ltiThreshold: { label: "LTI Threshold (Limit)", color: PREMIUM_COLORS.pink },
    ltiActual: { label: "LTI Actual", color: PREMIUM_COLORS.blue },
  }

  return (
    <Card className="border-border/40 shadow-sm bg-card/30">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-2 rounded-full bg-blue-500" />
          <div>
            <CardTitle className="text-lg font-bold">LTI Performance vs Threshold</CardTitle>
            <CardDescription>Tracking Actual Lost Time Injuries strictly against established limits.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[380px] w-full">
            <ComposedChart data={chartData} margin={{ top: 40, right: 0, left: -20, bottom: 0 }}>
               <defs>
                <linearGradient id="colorLtiActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-ltiActual)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--color-ltiActual)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="site" tickLine={false} axisLine={false} tick={{ fontWeight: 'bold' }} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="ltiActual" fill="url(#colorLtiActual)" radius={[6, 6, 0, 0]} maxBarSize={70} animationDuration={1500}>
                <LabelList dataKey="ltiActual" position="top" style={{ fill: 'currentColor', fontSize: 14, fontWeight: '900' }} />
              </Bar>
              <Line type="stepAfter" dataKey="ltiThreshold" stroke="var(--color-ltiThreshold)" strokeWidth={4} dot={{ r: 6, strokeWidth: 2, fill: "var(--background)", stroke: "var(--color-ltiThreshold)" }} activeDot={{ r: 8, fill: "var(--color-ltiThreshold)" }} animationDuration={1500} />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[380px] items-center justify-center text-sm font-medium text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">No data available</div>
        )}
      </CardContent>
    </Card>
  )
}

// 6. Man Hours
export function ManHoursDashboard({ data }: { data: SafetyData }) {
  const chartData = data.charts.manHoursByLocation

  const chartConfig = {
    manHours: { label: "Achieved Safe Hours", color: PREMIUM_COLORS.green },
    target: { label: "Target Safe Hours", color: PREMIUM_COLORS.orange },
  }

  const totalManHours = chartData.reduce((acc, curr) => acc + curr.manHours, 0)
  const formattedTotal = totalManHours > 1000000 ? `${(totalManHours/1000000).toFixed(1)}M` : `${(totalManHours/1000).toFixed(0)}K`

  return (
    <div className="grid gap-6 xl:grid-cols-4">
      <div className="xl:col-span-1">
        <KpiCard 
          title="Total Safe Man Hours" 
          value={formattedTotal} 
          subtext="Cumulative Across Sites" 
          icon={Clock} 
          color={PREMIUM_COLORS.green} 
        />
      </div>
      <Card className="xl:col-span-3 border-border/40 shadow-sm bg-card/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold">Man Hours Achievement by Location</CardTitle>
          <CardDescription>Benchmarking achieved safe working hours against set targets per site.</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <ComposedChart data={chartData} margin={{ top: 30, right: 0, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorManHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-manHours)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--color-manHours)" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="location" tickLine={false} axisLine={false} tick={{ fontWeight: 'bold' }} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                <ChartTooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="manHours" fill="url(#colorManHours)" radius={[6, 6, 0, 0]} maxBarSize={90} animationDuration={1500}>
                   <LabelList dataKey="manHours" position="top" formatter={(val: number) => val.toLocaleString()} style={{ fill: 'currentColor', fontSize: 13, fontWeight: 'bold' }} />
                </Bar>
                <Line type="monotone" dataKey="target" stroke="var(--color-target)" strokeWidth={4} strokeDasharray="6 6" dot={{ r: 6, fill: "var(--color-target)" }} activeDot={{ r: 8 }} animationDuration={1500} />
              </ComposedChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[320px] items-center justify-center text-sm font-medium text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">No data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 7. Monthly Man Hours
export function MonthlyManHoursDashboard({ data }: { data: SafetyData }) {
  const chartData = [...data.charts.monthlyManHoursTrend].reverse()

  const chartConfig = {
    manHours: { label: "Monthly Safe Hours", color: PREMIUM_COLORS.blue },
  }

  return (
    <Card className="border-border/40 shadow-sm bg-card/30 overflow-hidden relative">
      <div className="absolute top-10 left-10 p-32 bg-blue-500/5 rounded-full blur-3xl" />
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-2 rounded-full bg-blue-500" />
          <div>
            <CardTitle className="text-lg font-bold">Monthly Safe Hours Trajectory</CardTitle>
            <CardDescription>Tracking month-over-month safety hour accumulation to ensure consistent compliance.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[380px] w-full">
            <AreaChart data={chartData} margin={{ top: 30, right: 0, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMonthlyHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-manHours)" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="var(--color-manHours)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={20} tick={{ fontWeight: 500 }} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
              <ChartTooltip cursor={{ stroke: 'var(--color-manHours)', strokeWidth: 2 }} content={<ChartTooltipContent />} />
              <Area type="natural" dataKey="manHours" stroke="var(--color-manHours)" fillOpacity={1} fill="url(#colorMonthlyHours)" strokeWidth={4} activeDot={{ r: 8, strokeWidth: 0 }} animationDuration={1500}>
                <LabelList dataKey="manHours" position="top" formatter={(val: number) => val.toLocaleString()} style={{ fill: 'currentColor', fontSize: 12, fontWeight: 'bold' }} />
              </Area>
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[380px] items-center justify-center text-sm font-medium text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">No data available</div>
        )}
      </CardContent>
    </Card>
  )
}

// 8. Weekly Activities
export function WeeklyActivitiesDashboard({ data }: { data: SafetyData }) {
  const chartData = data.charts.weeklyActivitiesByCategory.sort((a, b) => b.count - a.count)

  const chartConfig = {
    count: { label: "Total Activities" },
    ...Object.fromEntries(
      chartData.map((item, index) => [
        item.category,
        { label: item.category, color: CHART_COLORS[index % CHART_COLORS.length] },
      ])
    ),
  }

  return (
    <Card className="border-border/40 shadow-sm bg-card/30">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-2 rounded-full bg-orange-500" />
          <div>
            <CardTitle className="text-lg font-bold">Weekly HSE Activities Matrix</CardTitle>
            <CardDescription>Volume of proactive safety measures performed, categorized by intervention type.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }} layout="vertical">
              <defs>
                  {chartData.map((entry, index) => (
                    <linearGradient key={`gradH-${index}`} id={`colorH-${index}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={1} />
                    </linearGradient>
                  ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={150} tick={{ fontSize: 13, fontWeight: 500 }} />
              <ChartTooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={45} animationDuration={1500}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#colorH-${index})`} />
                ))}
                <LabelList dataKey="count" position="right" style={{ fill: 'currentColor', fontSize: 15, fontWeight: '900' }} />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[400px] items-center justify-center text-sm font-medium text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">No data available</div>
        )}
      </CardContent>
    </Card>
  )
}
