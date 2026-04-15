"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  exportQueue,
  overtimeRules,
  timesheetCrew,
  timesheetSummary,
} from "@/lib/timesheet-data";
import {
  Calculator,
  Clock3,
  Download,
  FileSpreadsheet,
  ReceiptText,
  WalletCards,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  "Ready for payroll": "bg-emerald-100 text-emerald-900",
  "Pending approval": "bg-amber-100 text-amber-900",
  "Need correction": "bg-rose-100 text-rose-900",
  Ready: "bg-emerald-100 text-emerald-900",
  "Waiting final approval": "bg-amber-100 text-amber-900",
};

export function TimesheetOverview() {
  return (
    <div className="space-y-4 pb-6">
      <Card className="rounded-[1.75rem] border-0 bg-[linear-gradient(135deg,#1d4ed8_0%,#155e75_48%,#0f172a_100%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)]">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-100">
          M3 • Timesheet & Payroll Support
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Rekap jam kerja yang siap diproses</h3>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Semua jam reguler dan lembur diturunkan dari aktivitas yang sudah
          di-approve, lalu diringkas agar cepat dicek dari HP.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-sm text-white/70">Regular hours</p>
            <p className="mt-1 text-2xl font-semibold">{timesheetSummary.regularHours}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-sm text-white/70">Overtime hours</p>
            <p className="mt-1 text-2xl font-semibold">{timesheetSummary.overtimeHours}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/75">
          <span className="rounded-full bg-white/10 px-3 py-1">
            {timesheetSummary.site}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            {timesheetSummary.period}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            {timesheetSummary.pendingReview} item menunggu review
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-[1.4rem] border-slate-200 bg-white p-4">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
            <WalletCards className="h-4 w-4 text-emerald-600" />
            Estimasi lembur
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {timesheetSummary.overtimeCost}
          </p>
          <p className="mt-1 text-xs text-slate-500">Support untuk payroll bulanan</p>
        </Card>
        <Card className="rounded-[1.4rem] border-slate-200 bg-white p-4">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
            <ReceiptText className="h-4 w-4 text-sky-600" />
            Ready employees
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {timesheetSummary.approvedEmployees}
          </p>
          <p className="mt-1 text-xs text-slate-500">Sudah lolos approval berjenjang</p>
        </Card>
      </div>

      <Button asChild variant="outline" className="h-11 w-full rounded-2xl">
        <Link href="/dashboard/reports">
          Lanjut ke Daily Report Generator
        </Link>
      </Button>

      <Tabs defaultValue="crew" className="gap-4">
        <TabsList className="grid h-auto grid-cols-3 rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="crew" className="rounded-xl py-2 text-xs sm:text-sm">
            Crew recap
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-xl py-2 text-xs sm:text-sm">
            Overtime rules
          </TabsTrigger>
          <TabsTrigger value="exports" className="rounded-xl py-2 text-xs sm:text-sm">
            Export queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crew" className="space-y-3">
          {timesheetCrew.map((member) => (
            <Card
              key={member.name}
              className="rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{member.name}</p>
                  <p className="text-sm text-slate-500">{member.role}</p>
                </div>
                <Badge
                  className={`rounded-full border-0 px-3 py-1 ${statusStyles[member.status]}`}
                >
                  {member.status}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <MetricTile
                  label="Jam reguler"
                  value={member.regularHours}
                  icon={<Clock3 className="h-4 w-4 text-sky-600" />}
                />
                <MetricTile
                  label="Jam lembur"
                  value={member.overtimeHours}
                  icon={<Calculator className="h-4 w-4 text-amber-600" />}
                />
                <MetricTile
                  label="Tipe rate"
                  value={member.overtimeType}
                  icon={<ReceiptText className="h-4 w-4 text-slate-700" />}
                />
                <MetricTile
                  label="Estimasi"
                  value={member.estimatedPay}
                  icon={<WalletCards className="h-4 w-4 text-emerald-600" />}
                />
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full">
                  Koreksi
                </Button>
                <Button className="flex-1 rounded-full">Lock timesheet</Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rules" className="space-y-3">
          {overtimeRules.map((rule) => (
            <Card key={rule.label} className="rounded-[1.5rem] border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{rule.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{rule.note}</p>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {rule.multiplier}
                </Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="exports" className="space-y-3">
          {exportQueue.map((item) => (
            <Card key={item.id} className="rounded-[1.5rem] border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {item.id}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Update terakhir {item.updatedAt}
                  </p>
                </div>
                <Badge
                  className={`rounded-full border-0 px-3 py-1 ${statusStyles[item.status] ?? "bg-slate-200 text-slate-800"}`}
                >
                  {item.status}
                </Badge>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Format {item.format}
                </div>
                <Button size="sm" className="rounded-full px-4">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
