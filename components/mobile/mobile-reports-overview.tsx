"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Download, FileCheck2, HardHat, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type ReportsPayload = {
  context: {
    site: {
      name: string;
      customerName: string;
    };
  };
  reports: Array<{
    id: number;
    reportDate: string;
    readySections: number;
    totalSections: number;
    jobsCompleted: number;
    manpowerPresent: number;
    hseSummary: string;
    status: string;
  }>;
  chartSeries: Array<{
    label: string;
    readiness: number;
    jobsCompleted: number;
    manpowerPresent: number;
  }>;
};

const reportChartConfig = {
  readiness: {
    label: "Readiness",
    color: "#003f78",
  },
  jobsCompleted: {
    label: "Jobs",
    color: "#f4a78d",
  },
  manpowerPresent: {
    label: "Manpower",
    color: "#8c5818",
  },
} satisfies ChartConfig;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function MobileReportsOverview({
  initialData,
}: {
  initialData: ReportsPayload;
}) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const refreshData = useEffectEvent(async () => {
    const response = await fetch("/api/mobile/reports", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const next = (await response.json()) as ReportsPayload;
    startTransition(() => setData(next));
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshData();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(Math.max(data.reports.length, 1) / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [data.reports.length, page, pageSize]);

  const latest = data.reports[0];
  const readiness = latest ? Math.round((latest.readySections / Math.max(1, latest.totalSections)) * 100) : 0;
  const totalPages = Math.max(1, Math.ceil(Math.max(data.reports.length, 1) / pageSize));
  const paginatedReports = data.reports.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Daily Report</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0b4f4e]">Site Summary</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#486275]">{data.context.site.customerName}</p>
      </section>

      <section className="rounded-[1.35rem] bg-[#003f78] p-5 text-white shadow-[0_20px_42px_rgba(0,63,120,0.24)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b9dff6]">Latest Readiness</p>
            <p className="mt-3 text-5xl font-black leading-none">{readiness}%</p>
          </div>
          <Badge className="border-0 bg-white/14 text-white">{latest?.status ?? "No Report"}</Badge>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#0a5798]">
          <div className="h-full rounded-full bg-[#f4a78d]" style={{ width: `${readiness}%` }} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <HardHat className="size-5 text-[#003f78]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{latest?.jobsCompleted ?? 0}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Jobs Done</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <UsersRound className="size-5 text-[#8c5818]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{latest?.manpowerPresent ?? 0}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Manpower</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Productivity Metrics</p>
          <Badge className="border-0 bg-[#e9f6fd] text-[#003f78]">Auto refresh 30s</Badge>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <ChartContainer config={reportChartConfig} className="h-[220px] w-full">
            <BarChart data={data.chartSeries}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="readiness" radius={[8, 8, 4, 4]} fill="var(--color-readiness)" />
              <Bar dataKey="jobsCompleted" radius={[8, 8, 4, 4]} fill="var(--color-jobsCompleted)" />
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Report History</p>
        {paginatedReports.map((report) => (
          <article key={report.id} className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#082033]">{formatDate(report.reportDate)}</h2>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  {report.readySections}/{report.totalSections} sections · {report.jobsCompleted} jobs
                </p>
              </div>
              <FileCheck2 className="size-5 text-[#003f78]" />
            </div>
            <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">{report.hseSummary}</p>
            <Button asChild className="mt-4 min-h-11 rounded-2xl bg-[#003f78] text-white">
              <Link prefetch={false} href={`/api/mobile/reports/${report.id}/pdf`}>
                <Download className="size-4" />
                Export PDF
              </Link>
            </Button>
          </article>
        ))}
        {data.reports.length > 0 ? (
          <div className="flex items-center justify-between rounded-[1rem] bg-white px-4 py-3 text-xs font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <span>
              {Math.min((page - 1) * pageSize + 1, data.reports.length)}-
              {Math.min(page * pageSize, data.reports.length)} / {data.reports.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-8 rounded-xl px-3 text-[11px] font-black text-[#003f78]"
              >
                Prev
              </Button>
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#486275]">
                Page {page}/{totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="h-8 rounded-xl px-3 text-[11px] font-black text-[#003f78]"
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
