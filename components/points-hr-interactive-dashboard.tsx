"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PointsEmployee = {
  rank: number;
  name: string;
  role: string;
  department: string;
  levelName: string;
  totalPoints: number;
  periodPoints: number;
  penaltyPoints: number;
  trend: string;
  needsReview: boolean;
};

type DepartmentPerformance = {
  department: string;
  employees: number;
  points: number;
  penalties: number;
};

type TimelineRow = {
  id: string;
  employeeName: string;
  type: string;
  category: string;
  label: string;
  points: number;
  createdAt: string;
};

type PointsHrInteractiveDashboardProps = {
  leaderboard: PointsEmployee[];
  departments: DepartmentPerformance[];
  timeline: TimelineRow[];
};

function formatPoint(value: number) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID")}`;
}

function toneClass(tone: "good" | "warn" | "bad" | "neutral") {
  return {
    good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    bad: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    neutral: "bg-surface-container text-muted-foreground",
  }[tone];
}

function signalTone(row: PointsEmployee): "good" | "warn" | "bad" | "neutral" {
  if (row.periodPoints < 0 || row.trend === "Turun") return "bad";
  if (row.needsReview || row.penaltyPoints > 0) return "warn";
  if (row.trend === "Naik") return "good";
  return "neutral";
}

export function PointsHrInteractiveDashboard({ leaderboard, departments, timeline }: PointsHrInteractiveDashboardProps) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [signal, setSignal] = useState("all");

  const departmentOptions = useMemo(
    () => ["all", ...Array.from(new Set(leaderboard.map((row) => row.department || "Tanpa department")))],
    [leaderboard]
  );

  const filteredLeaderboard = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return leaderboard.filter((row) => {
      const matchesQuery = !needle || `${row.name} ${row.role} ${row.department}`.toLowerCase().includes(needle);
      const matchesDepartment = department === "all" || (row.department || "Tanpa department") === department;
      const tone = signalTone(row);
      const matchesSignal = signal === "all" || signal === tone || (signal === "review" && row.needsReview);
      return matchesQuery && matchesDepartment && matchesSignal;
    });
  }, [department, leaderboard, query, signal]);

  const filteredTimeline = useMemo(() => {
    const employeeNames = new Set(filteredLeaderboard.map((row) => row.name));
    return timeline.filter((row) => employeeNames.has(row.employeeName)).slice(0, 40);
  }, [filteredLeaderboard, timeline]);

  const chartData = useMemo(
    () => filteredLeaderboard.slice(0, 10).map((row) => ({ name: row.name.split(" ").slice(0, 2).join(" "), points: row.periodPoints, penalty: row.penaltyPoints })),
    [filteredLeaderboard]
  );

  return (
    <Card className="surface-module-card overflow-hidden rounded-[1.35rem] border-0 p-0">
      <div className="border-b border-outline-ghost bg-surface-container-low px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Interactive HR Analysis</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-foreground">Cari orang, filter department, lihat signal cepat</h3>
            <p className="mt-1 text-sm text-muted-foreground">Pakai ini untuk HR review harian: siapa naik, siapa turun, siapa perlu follow-up.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[720px]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama / role / department" className="h-10 rounded-xl" />
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
              {departmentOptions.map((option) => (
                <option key={option} value={option}>{option === "all" ? "Semua department" : option}</option>
              ))}
            </select>
            <select value={signal} onChange={(event) => setSignal(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
              <option value="all">Semua signal</option>
              <option value="good">Naik / bagus</option>
              <option value="warn">Perlu review</option>
              <option value="bad">Turun / risiko</option>
              <option value="review">Review queue</option>
            </select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="people" className="p-4 sm:p-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-[0.68rem] uppercase text-muted-foreground">
                <th className="py-3 pr-3">Rank</th>
                <th className="py-3 pr-3">Employee</th>
                <th className="py-3 pr-3">Department</th>
                <th className="py-3 pr-3">Level</th>
                <th className="py-3 pr-3">Total</th>
                <th className="py-3 pr-3">This Month</th>
                <th className="py-3 pr-3">Penalty</th>
                <th className="py-3 pr-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaderboard.map((row) => {
                const tone = signalTone(row);
                return (
                  <tr key={`${row.rank}-${row.name}`} className="border-b border-outline-ghost last:border-0">
                    <td className="py-3 pr-3 font-semibold">#{row.rank}</td>
                    <td className="py-3 pr-3">
                      <div className="font-medium text-foreground">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.role}</div>
                    </td>
                    <td className="py-3 pr-3">{row.department}</td>
                    <td className="py-3 pr-3">{row.levelName}</td>
                    <td className="py-3 pr-3 tabular-nums">{row.totalPoints.toLocaleString("id-ID")}</td>
                    <td className="py-3 pr-3 tabular-nums">{formatPoint(row.periodPoints)}</td>
                    <td className="py-3 pr-3 tabular-nums">{row.penaltyPoints ? `-${row.penaltyPoints}` : "0"}</td>
                    <td className="py-3 pr-3">
                      <Badge className={`rounded-full px-2.5 py-1 text-[11px] ${toneClass(tone)}`}>
                        {row.needsReview ? "Review" : row.trend}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="chart" className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="h-[320px] rounded-[1.2rem] bg-surface-container-low p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 16, left: -8, bottom: 36 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={56} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="points" radius={[10, 10, 4, 4]}>
                  {chartData.map((row) => (
                    <Cell key={row.name} fill={row.points < 0 ? "#ef4444" : "#0ea5e9"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {departments.slice(0, 6).map((row) => (
              <div key={row.department} className="rounded-2xl bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{row.department}</p>
                  <Badge className={`rounded-full px-2.5 py-1 text-[11px] ${row.penalties > 0 ? toneClass("warn") : toneClass("good")}`}>
                    {row.penalties > 0 ? "Review" : "OK"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{row.employees} orang • {formatPoint(row.points)} poin • -{row.penalties} penalty</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-3">
          {filteredTimeline.map((row) => (
            <div key={row.id} className="flex flex-col gap-2 rounded-2xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{row.employeeName}</p>
                  <Badge className={`rounded-full px-2.5 py-1 text-[11px] ${row.points < 0 ? toneClass("warn") : toneClass("good")}`}>{row.type}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{row.category} • {row.label}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-semibold tabular-nums">{formatPoint(row.points)}</p>
                <p className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleDateString("id-ID")}</p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
