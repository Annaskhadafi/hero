"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { approvalQueue, approvalSummary } from "@/lib/approval-data";
import {
  CheckCheck,
  CircleAlert,
  Clock3,
  FileCheck2,
  ImageIcon,
  ShieldAlert,
} from "lucide-react";

const riskStyles: Record<string, string> = {
  Emergency: "bg-rose-100 text-rose-900",
  Safety: "bg-amber-100 text-amber-900",
  Normal: "bg-slate-200 text-slate-800",
};

const statusBuckets = {
  review: approvalQueue.filter((item) => item.status === "Need Review"),
  approved: approvalQueue.filter((item) => item.status === "Approved Today"),
  escalated: approvalQueue.filter((item) => item.status === "Escalated"),
};

export function ApprovalQueue() {
  return (
    <div className="space-y-4 pb-6">
      <Card className="rounded-[1.75rem] border-0 bg-[linear-gradient(135deg,#172554_0%,#0f766e_45%,#164e63_100%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)]">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">
          M2 • Approval Engine
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Approval harian dari HP</h3>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Foreman dan PJO bisa review aktivitas, overtime, dan risiko pekerjaan
          tanpa menunggu rekap manual di akhir hari.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-sm text-white/70">Waiting L1</p>
            <p className="mt-1 text-2xl font-semibold">
              {approvalSummary.waitingLevel1}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-sm text-white/70">Approved today</p>
            <p className="mt-1 text-2xl font-semibold">
              {approvalSummary.approvedToday}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/75">
          <span className="rounded-full bg-white/10 px-3 py-1">
            {approvalSummary.waitingLevel2} item menunggu Level 2
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            {approvalSummary.escalated} item butuh eskalasi cepat
          </span>
        </div>
      </Card>

      <Tabs defaultValue="review" className="gap-4">
        <TabsList className="grid h-auto grid-cols-3 rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="review" className="rounded-xl py-2 text-xs sm:text-sm">
            Need Review
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-xl py-2 text-xs sm:text-sm">
            Approved
          </TabsTrigger>
          <TabsTrigger value="escalated" className="rounded-xl py-2 text-xs sm:text-sm">
            Escalated
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-3">
          {statusBuckets.review.map((item) => (
            <ApprovalCard key={item.id} item={item} />
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-3">
          {statusBuckets.approved.map((item) => (
            <ApprovalCard key={item.id} item={item} />
          ))}
        </TabsContent>

        <TabsContent value="escalated" className="space-y-3">
          {statusBuckets.escalated.map((item) => (
            <ApprovalCard key={item.id} item={item} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApprovalCard({
  item,
}: {
  item: (typeof approvalQueue)[number];
}) {
  return (
    <Card className="rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            {item.id} • {item.level}
          </p>
          <h4 className="mt-1 text-base font-semibold text-slate-900">
            {item.employee}
          </h4>
          <p className="text-sm text-slate-500">
            {item.role} • {item.site}
          </p>
        </div>
        <Badge className={`rounded-full border-0 px-3 py-1 ${riskStyles[item.risk]}`}>
          {item.risk}
        </Badge>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-900">{item.type}</p>
        <p className="mt-1 text-sm text-slate-600">{item.unit}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{item.notes}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-slate-500">Submit</p>
          <p className="mt-1 font-semibold text-slate-900">{item.submittedAt}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-slate-500">Kerja</p>
          <p className="mt-1 font-semibold text-slate-900">{item.workedHours}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-slate-500">Lembur</p>
          <p className="mt-1 font-semibold text-slate-900">{item.overtime}</p>
        </div>
      </div>

        <div className="mt-4 flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 rounded-full">
              Detail
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[90svh] rounded-t-[2rem]">
            <SheetHeader>
              <SheetTitle>{item.employee}</SheetTitle>
              <SheetDescription>
                {item.type} • {item.level} • {item.site}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Submitted"
                  value={item.submittedAt}
                  icon={<Clock3 className="h-4 w-4 text-sky-600" />}
                />
                <MetricCard
                  label="Risk"
                  value={item.risk}
                  icon={<ShieldAlert className="h-4 w-4 text-amber-600" />}
                />
                <MetricCard
                  label="Photos"
                  value={`${item.photos} file`}
                  icon={<ImageIcon className="h-4 w-4 text-emerald-600" />}
                />
                <MetricCard
                  label="Overtime"
                  value={item.overtime}
                  icon={<CircleAlert className="h-4 w-4 text-rose-600" />}
                />
              </div>

              <Card className="rounded-[1.5rem] border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Catatan pekerjaan</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.notes}</p>
              </Card>

              <Card className="rounded-[1.5rem] border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Checklist approval
                </p>
                <div className="mt-3 space-y-3">
                  {item.checklist.map((check) => (
                    <div key={check} className="flex items-start gap-3 text-sm text-slate-700">
                      <FileCheck2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <span>{check}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <SheetFooter className="border-t bg-background/95">
              <Button variant="outline" className="rounded-full">
                Request revision
              </Button>
              <Button className="rounded-full">
                <CheckCheck className="mr-2 h-4 w-4" />
                Approve now
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Button className="flex-1 rounded-full">
          <CheckCheck className="mr-2 h-4 w-4" />
          Approve
        </Button>
        </div>
        <Button asChild variant="ghost" className="mt-2 h-10 w-full rounded-full text-slate-600">
          <Link href="/dashboard/timesheet">Lihat impact ke timesheet</Link>
        </Button>
      </Card>
    );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-[1.25rem] border-slate-200 bg-slate-50 p-3 shadow-none">
      <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </Card>
  );
}
