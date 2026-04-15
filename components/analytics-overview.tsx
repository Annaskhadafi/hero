"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  analyticsHighlights,
  analyticsKpis,
  analyticsOverview,
  analyticsSections,
} from "@/lib/analytics-data";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export function AnalyticsOverview() {
  return (
    <div className="space-y-4 pb-6">
      <Card className="rounded-[1.75rem] border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_42%,#0f766e_100%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)]">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-100">
          M8 • Dashboard & Analytics
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Satu layar untuk lihat kondisi site</h3>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Dashboard lintas modul untuk foreman, PJO, HC, dan manajemen agar cepat
          membaca kondisi operasional harian tanpa membuka banyak halaman dulu.
        </p>

        <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-100">
            {analyticsOverview.date}
          </p>
          <h4 className="mt-1 text-lg font-semibold">{analyticsOverview.site}</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="rounded-full border-0 bg-white/14 px-3 py-1 text-white">
              {analyticsOverview.attendanceRate} attendance
            </Badge>
            <Badge className="rounded-full border-0 bg-white/14 px-3 py-1 text-white">
              {analyticsOverview.hseStatus} hari zero incident
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {analyticsKpis.map((kpi) => (
          <Card key={kpi.label} className="rounded-[1.4rem] border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{kpi.value}</p>
            <p className="mt-1 text-xs text-slate-500">{kpi.note}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold">Cross-Module Snapshot</h4>
            <p className="text-sm text-muted-foreground">
              Jalur cepat ke modul yang butuh perhatian sekarang.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            <BarChart3 className="mr-1 h-3.5 w-3.5" />
            Live summary
          </Badge>
        </div>

        {analyticsSections.map((section) => (
          <Card
            key={section.title}
            className="rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{section.title}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{section.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{section.detail}</p>
              </div>
              <Button asChild size="sm" variant="outline" className="rounded-full px-4">
                <Link href={section.route}>
                  Open
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <h4 className="text-lg font-semibold">Highlights</h4>
          <p className="text-sm text-muted-foreground">
            Insight cepat untuk performer, disiplin, dan people operations.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {analyticsHighlights.map((item, index) => (
            <Card key={item.label} className="rounded-[1.5rem] border-slate-200 bg-white p-4">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                {index === 0 ? (
                  <Sparkles className="h-4 w-4 text-amber-600" />
                ) : index === 1 ? (
                  <ClipboardList className="h-4 w-4 text-sky-600" />
                ) : (
                  <Users className="h-4 w-4 text-emerald-600" />
                )}
                {item.label}
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                {item.value}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="rounded-2xl">
          <ShieldCheck className="mr-2 h-4 w-4" />
          Export KPI
        </Button>
        <Button className="rounded-2xl">
          <BarChart3 className="mr-2 h-4 w-4" />
          Open executive view
        </Button>
      </div>
    </div>
  );
}
