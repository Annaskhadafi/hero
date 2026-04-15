"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  attendanceFeed,
  hcSummary,
  trainingStatus,
  wellnessStatus,
} from "@/lib/hc-data";
import {
  ActivitySquare,
  GraduationCap,
  HeartPulse,
  MapPin,
  ScanFace,
  ShieldPlus,
  Users,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  Verified: "bg-emerald-100 text-emerald-900",
  "Needs Review": "bg-amber-100 text-amber-900",
  Overtime: "bg-sky-100 text-sky-900",
  "Expiring Soon": "bg-amber-100 text-amber-900",
  Active: "bg-emerald-100 text-emerald-900",
  Urgent: "bg-rose-100 text-rose-900",
  Healthy: "bg-emerald-100 text-emerald-900",
  "Follow Up": "bg-amber-100 text-amber-900",
  Attention: "bg-rose-100 text-rose-900",
};

export function HcOverview() {
  return (
    <div className="space-y-4 pb-6">
      <Card className="rounded-[1.75rem] border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_42%,#0f766e_100%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)]">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-100">
          M7 • Human Capital Suite
        </p>
        <h3 className="mt-2 text-2xl font-semibold">People visibility dari absensi sampai wellness</h3>
        <p className="mt-2 text-sm leading-6 text-white/80">
          HC, training, dan wellness dirangkum dalam satu layar mobile-first untuk
          memantau siapa yang hadir, siapa yang butuh renewal training, dan siapa
          yang perlu follow-up kesehatan.
        </p>

        <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-100">
            {hcSummary.site}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-white/70">Active headcount</p>
              <p className="mt-1 text-2xl font-semibold">{hcSummary.activeHeadcount}</p>
            </div>
            <div>
              <p className="text-sm text-white/70">Present today</p>
              <p className="mt-1 text-2xl font-semibold">{hcSummary.presentToday}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Attendance review"
          value={`${hcSummary.pendingAttendanceReview}`}
          caption="Selfie/GPS perlu dicek"
          icon={<ScanFace className="h-4 w-4 text-sky-600" />}
        />
        <MetricCard
          label="Training alerts"
          value={`${hcSummary.expiringCertificates}`}
          caption="Sertifikat hampir habis"
          icon={<GraduationCap className="h-4 w-4 text-amber-600" />}
        />
        <MetricCard
          label="Fit for work"
          value={hcSummary.fitForWorkRate}
          caption="Status sehat harian"
          icon={<HeartPulse className="h-4 w-4 text-emerald-600" />}
        />
        <MetricCard
          label="People ops"
          value="Live"
          caption="Absensi, training, wellness"
          icon={<Users className="h-4 w-4 text-violet-600" />}
        />
      </div>

      <Tabs defaultValue="attendance" className="gap-4">
        <TabsList className="grid h-auto grid-cols-3 rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="attendance" className="rounded-xl py-2 text-xs sm:text-sm">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="training" className="rounded-xl py-2 text-xs sm:text-sm">
            Training
          </TabsTrigger>
          <TabsTrigger value="wellness" className="rounded-xl py-2 text-xs sm:text-sm">
            Wellness
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-3">
          {attendanceFeed.map((item) => (
            <Card key={`${item.name}-${item.time}`} className="rounded-[1.5rem] border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.type} • {item.time}</p>
                </div>
                <Badge className={`rounded-full border-0 px-3 py-1 ${statusStyles[item.status]}`}>
                  {item.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
            </Card>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-2xl">
              <MapPin className="mr-2 h-4 w-4" />
              Review GPS
            </Button>
            <Button className="rounded-2xl">
              <ScanFace className="mr-2 h-4 w-4" />
              Approve attendance
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="training" className="space-y-3">
          {trainingStatus.map((item) => (
            <Card key={`${item.employee}-${item.training}`} className="rounded-[1.5rem] border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{item.employee}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.training}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.expiry}</p>
                </div>
                <Badge className={`rounded-full border-0 px-3 py-1 ${statusStyles[item.status]}`}>
                  {item.status}
                </Badge>
              </div>
            </Card>
          ))}

          <Button className="h-11 w-full rounded-2xl">
            <GraduationCap className="mr-2 h-4 w-4" />
            Sync training reminders
          </Button>
        </TabsContent>

        <TabsContent value="wellness" className="space-y-3">
          {wellnessStatus.map((item) => (
            <Card key={`${item.employee}-${item.metric}`} className="rounded-[1.5rem] border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{item.employee}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.metric}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
                </div>
                <Badge className={`rounded-full border-0 px-3 py-1 ${statusStyles[item.status]}`}>
                  {item.status}
                </Badge>
              </div>
            </Card>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-2xl">
              <HeartPulse className="mr-2 h-4 w-4" />
              Update BMI
            </Button>
            <Button className="rounded-2xl">
              <ShieldPlus className="mr-2 h-4 w-4" />
              Set fit status
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="rounded-2xl">
          <ActivitySquare className="mr-2 h-4 w-4" />
          Open HR export
        </Button>
        <Button asChild className="rounded-2xl">
          <Link href="/dashboard/analytics">Open site analytics</Link>
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
