"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RecruitmentTabBar } from "@/components/hc/recruitment-tab-bar";
import {
  IconBriefcase,
  IconUsers,
  IconUserCheck,
  IconClock,
  IconAlertCircle,
  IconMail,
  IconTrendingUp,
  IconTrendingDown,
  IconChartBar,
  IconChartPie,
  IconChartLine,
  IconActivity,
  IconCalendarEvent,
  IconAward,
  IconUserPlus,
  IconTestPipe,
  IconStethoscope,
} from "@tabler/icons-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  Treemap,
  ComposedChart,
} from "recharts";

interface DashboardData {
  activeVacancies: number;
  totalCandidates: number;
  hiredThisMonth: number;
  avgTimeToFill: number;
  overdueVacancies: number;
  emailDeliveryRate: number;
  pipeline: { stage: string; count: number; conversionRate: number }[];
  sources: { source: string; count: number; percentage: number }[];
  topVacancies: { id: number; title: string; department: string; quota: number; applied: number }[];
  timeToFillTrend: { month: string; avgDays: number; vacancyCount: number }[];
  conversionRates: { from: string; to: string; rate: number; entered: number; progressed: number }[];
  aiScoreDistribution: { range: string; count: number; color: string }[];
  interviewResults: { result: string; count: number; color: string }[];
  vacancyFulfillment: { id: number; title: string; quota: number; hired: number; fulfillment: number }[];
  recentActivity: {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    icon?: string;
  }[];
  upcomingEvents: {
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    time?: string;
    status: string;
  }[];
}

interface RecruitmentDashboardClientProps {
  data: DashboardData;
  selectedYear: number;
  selectedMonth: number | null;
}

const MONTH_OPTIONS = [
  { value: "all", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

function DashboardFilters({ selectedYear, selectedMonth }: { selectedYear: number; selectedMonth: number | null }) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, index) => currentYear - index);

  const updateFilter = (next: { year?: string; month?: string }) => {
    const params = new URLSearchParams();
    params.set("year", next.year ?? String(selectedYear));
    params.set("month", next.month ?? (selectedMonth ? String(selectedMonth) : "all"));
    router.push(`/dashboard/hc/recruitment/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-100/80 p-2">
      <Select value={String(selectedYear)} onValueChange={(value) => updateFilter({ year: value })}>
        <SelectTrigger className="h-10 w-[120px] bg-white px-3 py-2">
          <SelectValue placeholder="Tahun" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedMonth ? String(selectedMonth) : "all"} onValueChange={(value) => updateFilter({ month: value })}>
        <SelectTrigger className="h-10 w-[160px] bg-white px-3 py-2">
          <SelectValue placeholder="Bulan" />
        </SelectTrigger>
        <SelectContent>
          {MONTH_OPTIONS.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 mb-4", className)}>
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: number;
  trendLabel?: string;
  color: string;
  delay?: number;
}) {
  return (
    <Card
      className={cn(
        "p-4 border-l-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
        `border-l-${color}-500 bg-${color}-50/50`
      )}
      style={{
        borderLeftColor: `var(--${color}-500)`,
        backgroundColor: `var(--${color}-50)`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl",
              `bg-${color}-100 text-${color}-700`
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
          </div>
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            )}
          >
            {trend >= 0 ? <IconTrendingUp className="w-3 h-3" /> : <IconTrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
            {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

function PipelineFunnel({ pipeline }: { pipeline: { stage: string; count: number; conversionRate: number }[] }) {
  const colors = ["#0f766e", "#059669", "#d97706", "#ea580c", "#dc2626", "#2563eb"];
  const maxCount = Math.max(...pipeline.map((p) => p.count), 1);

  return (
    <div className="space-y-2">
      {pipeline.map((stage, i) => {
        const width = (stage.count / maxCount) * 100;
        return (
          <div key={stage.stage} className="flex items-center gap-3">
            <div className="w-24 text-sm font-medium text-muted-foreground text-right">{stage.stage}</div>
            <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                style={{ width: `${width}%`, backgroundColor: colors[i] }}
              >
                <span className="text-xs font-semibold text-white">{stage.count}</span>
              </div>
              {width < 15 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-foreground">
                  {stage.count}
                </span>
              )}
            </div>
            <div className="w-12 text-xs text-muted-foreground text-right">
              {stage.conversionRate}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SourceDonut({ sources }: { sources: { source: string; count: number; percentage: number }[] }) {
  const colors = ["#0f766e", "#059669", "#d97706", "#ea580c", "#dc2626", "#2563eb", "#7c3aed", "#db2777"];
  const data = sources.map((s, i) => ({ name: s.source, value: s.count, percentage: s.percentage, color: colors[i % colors.length] }));

  return (
    <div className="flex items-center gap-6">
      <div className="w-[180px] h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover text-popover-foreground text-sm p-2 rounded-lg shadow-lg border">
                      <p className="font-medium">{payload[0].name}</p>
                      <p className="text-muted-foreground">
                        {payload[0].value} ({payload[0].payload.percentage}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((source, i) => (
          <div key={source.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
            <span className="text-sm text-muted-foreground w-24">{source.name}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${source.percentage}%`, backgroundColor: source.color }}
              />
            </div>
            <span className="text-sm font-medium w-8 text-right">{source.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopVacanciesChart({
  vacancies,
}: {
  vacancies: { id: number; title: string; department: string; quota: number; applied: number }[];
}) {
  const maxApplied = Math.max(...vacancies.map((v) => v.applied), 1);

  return (
    <div className="space-y-3">
      {vacancies.map((v, i) => {
        const width = (v.applied / maxApplied) * 100;
        return (
          <div key={v.id} className="flex items-center gap-3">
            <div className="w-8 text-sm text-muted-foreground text-right">{i + 1}</div>
            <div className="w-48">
              <p className="text-sm font-medium truncate">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.department}</p>
            </div>
            <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-500 bg-teal-500 flex items-center px-2"
                style={{ width: `${width}%` }}
              >
                {width > 10 && <span className="text-xs font-semibold text-white">{v.applied}</span>}
              </div>
              {width <= 10 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-foreground">
                  {v.applied}
                </span>
              )}
            </div>
            <div className="w-16 text-xs text-muted-foreground text-right">
              {v.applied}/{v.quota}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeToFillTrend({
  data,
}: {
  data: { month: string; avgDays: number; vacancyCount: number }[];
}) {
  const chartData = data.map((d) => ({
    month: new Date(d.month + "-01").toLocaleDateString("id-ID", { month: "short" }),
    avgDays: d.avgDays,
    vacancyCount: d.vacancyCount,
  }));

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAvgDays" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            label={{ value: "Days", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#6b7280" } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Area type="monotone" dataKey="avgDays" stroke="#0f766e" strokeWidth={2} fill="url(#colorAvgDays)" name="Avg Days" />
          <Line type="monotone" dataKey="vacancyCount" stroke="#d97706" strokeWidth={2} dot={false} name="Vacancies" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ConversionRatesChart({
  rates,
}: {
  rates: { from: string; to: string; rate: number; entered: number; progressed: number }[];
}) {
  const colors = ["#0f766e", "#059669", "#d97706", "#ea580c", "#dc2626"];
  const maxEntered = Math.max(...rates.map((rate) => rate.entered), 1);

  return (
    <div className="space-y-3">
      {rates.map((rate, index) => {
        const width = Math.max((rate.entered / maxEntered) * 100, rate.entered > 0 ? 18 : 8);
        return (
          <div key={`${rate.from}-${rate.to}`} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <div className="font-semibold text-slate-900">
                {rate.from} <span className="text-slate-400">→</span> {rate.to}
              </div>
              <div className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {rate.rate}%
              </div>
            </div>
            <div className="relative h-10 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
              <div
                className="flex h-full items-center justify-between px-3 text-xs font-semibold text-white transition-all duration-500"
                style={{
                  width: `${width}%`,
                  backgroundColor: colors[index % colors.length],
                  clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)",
                }}
              >
                <span>{rate.entered} masuk</span>
                <span>{rate.progressed} lanjut</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AIScoreDistribution({
  data,
}: {
  data: { range: string; count: number; color: string }[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percentage = (item.count / total) * 100;
        return (
          <div key={item.range} className="flex items-center gap-3">
            <div className="w-16 text-sm font-medium text-muted-foreground">{item.range}</div>
            <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                style={{ width: `${percentage}%`, backgroundColor: item.color }}
              >
                {percentage > 10 && <span className="text-xs font-semibold text-white">{item.count}</span>}
              </div>
              {percentage <= 10 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-foreground">
                  {item.count}
                </span>
              )}
            </div>
            <div className="w-12 text-sm text-muted-foreground text-right">{Math.round(percentage)}%</div>
          </div>
        );
      })}
    </div>
  );
}

function InterviewResultBreakdown({ data }: { data: { result: string; count: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl bg-slate-50 text-sm text-muted-foreground">
        No interview data in selected period
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="h-[220px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={4} dataKey="count" stroke="none">
              {data.map((entry) => (
                <Cell key={entry.result} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
              formatter={(value: number) => [value, "Candidates"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="min-w-[180px] space-y-3">
        {data.map((item) => {
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={item.result} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-semibold text-slate-800">{item.result}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{item.count}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{percentage}% dari interview</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VacancyFulfillmentChart({ data }: { data: { id: number; title: string; quota: number; hired: number; fulfillment: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl bg-slate-50 text-sm text-muted-foreground">
        No vacancy data in selected period
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const width = Math.min(item.fulfillment, 100);
        const color = item.fulfillment >= 100 ? "#059669" : item.fulfillment >= 60 ? "#d97706" : "#dc2626";
        return (
          <div key={item.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.hired}/{item.quota} hired</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {item.fulfillment}%
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityList({
  activities,
}: {
  activities: {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    icon?: string;
  }[];
}) {
  const iconMap: Record<string, React.ElementType> = {
    apply: IconUserPlus,
    stage: IconChartBar,
    test: IconTestPipe,
    mcu: IconStethoscope,
    hire: IconUserCheck,
    email: IconMail,
    default: IconActivity,
  };

  const colorMap: Record<string, string> = {
    apply: "bg-teal-100 text-teal-700",
    stage: "bg-amber-100 text-amber-700",
    test: "bg-blue-100 text-blue-700",
    mcu: "bg-purple-100 text-purple-700",
    hire: "bg-emerald-100 text-emerald-700",
    email: "bg-sky-100 text-sky-700",
    default: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = iconMap[activity.type] || iconMap.default;
        const color = colorMap[activity.type] || colorMap.default;
        return (
          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{activity.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UpcomingEvents({
  events,
}: {
  events: {
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    time?: string;
    status: string;
  }[];
}) {
  const iconMap: Record<string, React.ElementType> = {
    interview: IconCalendarEvent,
    test: IconTestPipe,
    mcu: IconStethoscope,
    default: IconCalendarEvent,
  };

  const colorMap: Record<string, string> = {
    interview: "bg-teal-100 text-teal-700",
    test: "bg-amber-100 text-amber-700",
    mcu: "bg-purple-100 text-purple-700",
    default: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const Icon = iconMap[event.type] || iconMap.default;
        const color = colorMap[event.type] || colorMap.default;
        return (
          <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {event.date}
                {event.time && ` at ${event.time}`}
              </p>
            </div>
            <div
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                event.status === "confirmed"
                  ? "bg-emerald-100 text-emerald-700"
                  : event.status === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-700"
              )}
            >
              {event.status}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </Card>
  );
}

function SkeletonChart() {
  return (
    <Card className="p-4">
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-[200px] w-full" />
    </Card>
  );
}

export function RecruitmentDashboardClient({ data, selectedYear, selectedMonth }: RecruitmentDashboardClientProps) {
  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-7 px-4 py-6 sm:px-6 lg:px-8 xl:px-8">
      <div className="flex flex-col gap-4 rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-slate-200/60 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recruitment Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time overview of recruitment metrics</p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <RecruitmentTabBar />
          <DashboardFilters selectedYear={selectedYear} selectedMonth={selectedMonth} />
        </div>
      </div>

      {/* ─── Section A: KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          icon={IconBriefcase}
          label="Active Vacancies"
          value={data.activeVacancies}
          trend={12}
          trendLabel="vs last month"
          color="teal"
          delay={0}
        />
        <KPICard
          icon={IconUsers}
          label="Total Candidates"
          value={data.totalCandidates}
          trend={8}
          trendLabel="vs last month"
          color="blue"
          delay={50}
        />
        <KPICard
          icon={IconUserCheck}
          label="Hired in Period"
          value={data.hiredThisMonth}
          trend={-5}
          trendLabel="vs last month"
          color="emerald"
          delay={100}
        />
        <KPICard
          icon={IconClock}
          label="Avg Time to Fill"
          value={`${data.avgTimeToFill}d`}
          trend={-3}
          trendLabel="vs last month"
          color="amber"
          delay={150}
        />
        <KPICard
          icon={IconAlertCircle}
          label="Overdue Vacancies"
          value={data.overdueVacancies}
          color="red"
          delay={200}
        />
        <KPICard
          icon={IconMail}
          label="Email Delivery"
          value={`${data.emailDeliveryRate}%`}
          trend={5}
          trendLabel="vs last month"
          color="sky"
          delay={250}
        />
      </div>

      {/* ─── Section B & C: Pipeline + Sources ───────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <SectionHeader icon={IconChartBar} title="Pipeline Funnel" description="Candidate flow through stages" />
          <PipelineFunnel pipeline={data.pipeline} />
        </Card>

        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <SectionHeader icon={IconChartPie} title="Source Breakdown" description="Where candidates come from" />
          <SourceDonut sources={data.sources} />
        </Card>
      </div>

      {/* ─── Section D: Top Vacancies ─────────────────────────────── */}
      <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
        <SectionHeader icon={IconChartBar} title="Top Vacancies" description="Most applied positions" />
        <TopVacanciesChart vacancies={data.topVacancies} />
      </Card>

      {/* ─── Section E & F: Time-to-Fill + Conversion ────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <SectionHeader icon={IconChartLine} title="Time-to-Fill Trend" description="Average days over 6 months" />
          <TimeToFillTrend data={data.timeToFillTrend} />
        </Card>

        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <SectionHeader icon={IconChartBar} title="Conversion Funnel" description="Stage-to-stage progression" />
          <ConversionRatesChart rates={data.conversionRates} />
        </Card>
      </div>

      {/* ─── Section G: AI Score Distribution ─────────────────────── */}
      <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
        <SectionHeader icon={IconAward} title="AI Score Distribution" description="Candidate quality breakdown" />
        <AIScoreDistribution data={data.aiScoreDistribution} />
      </Card>

      {/* ─── Section H: Extra Analytics ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <SectionHeader icon={IconActivity} title="Interview Result Breakdown" description="Pass, pending, and fail distribution" />
          <InterviewResultBreakdown data={data.interviewResults} />
        </Card>

        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <SectionHeader icon={IconChartBar} title="Vacancy Fulfillment" description="Hiring progress against requested quota" />
          <VacancyFulfillmentChart data={data.vacancyFulfillment} />
        </Card>
      </div>

      {/* ─── Section H (PRD): Recent Activity & Upcoming Events ──── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <SectionHeader icon={IconActivity} title="Recent Activity" description="Latest recruitment events" />
          {data.recentActivity.length > 0 ? (
            <ActivityList activities={data.recentActivity} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada aktivitas terbaru.</p>
          )}
        </Card>

        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <SectionHeader icon={IconCalendarEvent} title="Upcoming Events (7 days)" description="Scheduled interviews, MCU, and tests" />
          {data.upcomingEvents.length > 0 ? (
            <UpcomingEvents events={data.upcomingEvents} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Tidak ada jadwal dalam 7 hari ke depan.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
