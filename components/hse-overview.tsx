"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  apdStatus,
  hseSummary,
  incidentFeed,
  patrolChecklist,
  safetyObservations,
} from "@/lib/hse-data";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  HardHat,
  MapPinned,
  ShieldCheck,
  Siren,
} from "lucide-react";

const severityStyles: Record<string, string> = {
  Medium: "bg-amber-100 text-amber-900",
  Low: "bg-sky-100 text-sky-900",
};

const statusStyles: Record<string, string> = {
  Open: "bg-rose-100 text-rose-900",
  "Action Taken": "bg-emerald-100 text-emerald-900",
  Done: "bg-emerald-100 text-emerald-900",
  "In Progress": "bg-amber-100 text-amber-900",
  Scheduled: "bg-slate-200 text-slate-800",
  Investigating: "bg-amber-100 text-amber-900",
  Closed: "bg-emerald-100 text-emerald-900",
};

export function HseOverview() {
  return (
    <div className="space-y-4 pb-6">
      <Card className="rounded-[1.75rem] border-0 bg-[linear-gradient(135deg,#14532d_0%,#155e75_42%,#0f172a_100%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)]">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-100">
          M6 • HSE Module
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Safety visibility dari HP lapangan</h3>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Observasi, patrol, incident, dan kepatuhan APD diringkas dalam satu
          layar supaya HSE officer dan foreman bisa bertindak cepat.
        </p>

        <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-100">
            {hseSummary.shift}
          </p>
          <h4 className="mt-1 text-lg font-semibold">{hseSummary.site}</h4>
          <p className="mt-1 text-sm text-white/75">
            {hseSummary.zeroIncidentDays} hari tanpa incident recordable
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Open observations"
          value={`${hseSummary.openObservations}`}
          caption="Perlu tindak lanjut"
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
        />
        <MetricCard
          label="Patrol done"
          value={`${hseSummary.patrolCompleted}`}
          caption="Sampai shift ini"
          icon={<MapPinned className="h-4 w-4 text-sky-600" />}
        />
        <MetricCard
          label="APD compliance"
          value={hseSummary.apdCompliance}
          caption="Rata-rata tim"
          icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
        />
        <MetricCard
          label="Quick action"
          value="Ready"
          caption="Foto + GPS + checklist"
          icon={<Camera className="h-4 w-4 text-violet-600" />}
        />
      </div>

      <Tabs defaultValue="observation" className="gap-4">
        <TabsList className="grid h-auto grid-cols-3 rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="observation" className="rounded-xl py-2 text-xs sm:text-sm">
            Observation
          </TabsTrigger>
          <TabsTrigger value="patrol" className="rounded-xl py-2 text-xs sm:text-sm">
            Patrol
          </TabsTrigger>
          <TabsTrigger value="incident" className="rounded-xl py-2 text-xs sm:text-sm">
            Incident
          </TabsTrigger>
        </TabsList>

        <TabsContent value="observation" className="space-y-3">
          {safetyObservations.map((item) => (
            <Card key={item.id} className="rounded-[1.5rem] border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {item.id} • {item.category}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.location} • {item.reporter}
                  </p>
                </div>
                <Badge className={`rounded-full border-0 px-3 py-1 ${severityStyles[item.severity]}`}>
                  {item.severity}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.note}</p>
              <div className="mt-4 flex items-center justify-between">
                <Badge className={`rounded-full border-0 px-3 py-1 ${statusStyles[item.status]}`}>
                  {item.status}
                </Badge>
                <Button size="sm" className="rounded-full px-4">
                  Follow up
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="patrol" className="space-y-3">
          {patrolChecklist.map((item) => (
            <Card key={item.label} className="rounded-[1.5rem] border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
                </div>
                <Badge className={`rounded-full border-0 px-3 py-1 ${statusStyles[item.status]}`}>
                  {item.status}
                </Badge>
              </div>
            </Card>
          ))}

          <Button className="h-11 w-full rounded-2xl">
            <MapPinned className="mr-2 h-4 w-4" />
            Start patrol with GPS
          </Button>
        </TabsContent>

        <TabsContent value="incident" className="space-y-3">
          {incidentFeed.map((item) => (
            <Card
              key={item.id}
              className="rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {item.id} • {item.time}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{item.type}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.unit}</p>
                </div>
                <Badge className={`rounded-full border-0 px-3 py-1 ${statusStyles[item.status]}`}>
                  {item.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-slate-600">Impact: {item.impact}</p>
            </Card>
          ))}

          <Button variant="outline" className="h-11 w-full rounded-2xl">
            <Siren className="mr-2 h-4 w-4" />
            Create incident report
          </Button>
        </TabsContent>
      </Tabs>

      <section className="space-y-3">
        <div>
          <h4 className="text-lg font-semibold">APD Compliance</h4>
          <p className="text-sm text-muted-foreground">
            Cek ringkas kepatuhan harian per tim sebelum masuk report dan evaluasi.
          </p>
        </div>

        {apdStatus.map((item) => (
          <Card key={item.team} className="rounded-[1.5rem] border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{item.team}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                <HardHat className="mr-1 h-3.5 w-3.5" />
                {item.compliance}
              </Badge>
            </div>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="rounded-2xl">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Close action
        </Button>
        <Button className="rounded-2xl">
          <ShieldCheck className="mr-2 h-4 w-4" />
          Send HSE summary
        </Button>
      </div>
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
    <Card className="rounded-[1.4rem] border-slate-200 bg-white p-4">
      <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </Card>
  );
}
