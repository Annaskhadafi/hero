"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  dailyReportSections,
  dailyReportSummary,
  reportActivities,
  reportExports,
} from "@/lib/daily-report-data";
import {
  Download,
  FileSpreadsheet,
  FileText,
  HardHat,
  ImageIcon,
  MailCheck,
  ShieldCheck,
  Users,
} from "lucide-react";

const sectionStyles: Record<string, string> = {
  Ready: "bg-emerald-100 text-emerald-900",
  Waiting: "bg-amber-100 text-amber-900",
};

const activityStyles: Record<string, string> = {
  Emergency: "bg-rose-100 text-rose-900",
  Safety: "bg-amber-100 text-amber-900",
  Normal: "bg-slate-200 text-slate-800",
};

export function DailyReportOverview() {
  return (
    <div className="space-y-4 pb-6">
      <Card className="rounded-[1.75rem] border-0 bg-[linear-gradient(135deg,#1f2937_0%,#155e75_44%,#0f766e_100%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)]">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">
          M4 • Daily Report Generator
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Laporan harian siap kirim ke customer</h3>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Sistem merangkai header site, manpower, aktivitas approved, HSE summary,
          dan dokumentasi foto dalam format yang seragam.
        </p>

        <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">
            {dailyReportSummary.date}
          </p>
          <h4 className="mt-1 text-lg font-semibold">{dailyReportSummary.site}</h4>
          <p className="mt-1 text-sm text-white/75">
            {dailyReportSummary.customer} • Kontrak {dailyReportSummary.contract}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Manpower hadir"
          value={`${dailyReportSummary.manpowerPresent}`}
          caption={`${dailyReportSummary.manpowerLeave} tidak hadir`}
          icon={<Users className="h-4 w-4 text-sky-600" />}
        />
        <MetricCard
          label="Pekerjaan selesai"
          value={`${dailyReportSummary.jobsCompleted}`}
          caption="Dari aktivitas approved"
          icon={<HardHat className="h-4 w-4 text-amber-600" />}
        />
        <MetricCard
          label="Status HSE"
          value={dailyReportSummary.hseStatus}
          caption="Masuk ke report customer"
          icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
        />
        <MetricCard
          label="Distribusi"
          value="Email + S3"
          caption="PDF dan Excel"
          icon={<MailCheck className="h-4 w-4 text-violet-600" />}
        />
      </div>

      <Button asChild variant="outline" className="h-11 w-full rounded-2xl">
        <Link href="/dashboard/hse">Lihat detail HSE Module</Link>
      </Button>

      <section className="space-y-3">
        <div>
          <h4 className="text-lg font-semibold">Status Komponen Report</h4>
          <p className="text-sm text-muted-foreground">
            Cocok untuk cek cepat sebelum generate atau kirim ke customer.
          </p>
        </div>

        {dailyReportSections.map((section) => (
          <Card key={section.title} className="surface-module-card rounded-[1.5rem] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{section.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p>
              </div>
              <Badge className={`rounded-full border-0 px-3 py-1 ${sectionStyles[section.status]}`}>
                {section.status}
              </Badge>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold">Aktivitas yang Masuk Report</h4>
            <p className="text-sm text-muted-foreground">
              Aktivitas approved yang terpilih untuk laporan harian customer.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            <ImageIcon className="mr-1 h-3.5 w-3.5" />
            {reportActivities.length} foto
          </Badge>
        </div>

        {reportActivities.map((item) => (
          <Card
            key={`${item.unit}-${item.service}`}
            className="surface-module-card rounded-[1.5rem] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{item.service}</p>
                <p className="text-sm text-slate-500">{item.unit}</p>
              </div>
              <Badge className={`rounded-full border-0 px-3 py-1 ${activityStyles[item.status]}`}>
                {item.status}
              </Badge>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              <p>Teknisi/PIC: {item.technician}</p>
              <p className="mt-1">Waktu kerja: {item.time}</p>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <h4 className="text-lg font-semibold">Generate & Export</h4>
          <p className="text-sm text-muted-foreground">
            Output disiapkan untuk customer dan arsip internal.
          </p>
        </div>

        {reportExports.map((item) => (
          <Card key={item.id} className="surface-module-card rounded-[1.5rem] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {item.id}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {item.format} Daily Report
                </p>
                <p className="mt-1 text-sm text-slate-500">{item.destination}</p>
              </div>
              <Badge className="rounded-full border-0 bg-emerald-100 px-3 py-1 text-emerald-900">
                {item.status}
              </Badge>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full">
                {item.format === "PDF" ? (
                  <FileText className="mr-2 h-4 w-4" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Preview
              </Button>
              <Button className="flex-1 rounded-full">
                <Download className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="surface-module-card rounded-[1.4rem] p-4">
      <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </Card>
  );
}
