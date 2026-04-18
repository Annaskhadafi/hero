import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { myDayJobs, myDaySummary, myDayTimeline } from "@/lib/activity-hub-data";
import { Camera, Clock3, MapPinned, Signal, Star, Zap } from "lucide-react";

const statusStyles: Record<string, string> = {
  "In Progress": "bg-amber-100 text-amber-900",
  Queued: "bg-slate-200 text-slate-800",
  "Waiting Submit": "bg-emerald-100 text-emerald-900",
};

export function ActivityHubMyDay() {
  const completion =
    myDaySummary.jobsAssigned > 0
      ? Math.round((myDaySummary.jobsCompleted / myDaySummary.jobsAssigned) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[1.75rem] border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#14532d_100%)] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">
              On field now
            </p>
            <h3 className="mt-2 text-2xl font-semibold">{myDaySummary.site}</h3>
            <p className="mt-1 text-sm text-white/75">{myDaySummary.shift}</p>
          </div>
          <Badge className="rounded-full border-0 bg-white/14 px-3 py-1 text-white">
            {myDaySummary.weather}
          </Badge>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-white/70">Pekerjaan selesai</p>
            <p className="mt-2 text-2xl font-semibold">
              {myDaySummary.jobsCompleted}/{myDaySummary.jobsAssigned}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-white/70">Poin hari ini</p>
            <p className="mt-2 text-2xl font-semibold">{myDaySummary.pointsToday}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Progress shift</span>
            <span className="font-medium">{completion}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/15">
            <div
              className="h-2 rounded-full bg-emerald-300 transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span className="inline-flex items-center gap-1">
              <Signal className="h-3.5 w-3.5" />
              {myDaySummary.signal}
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              Level {myDaySummary.currentLevel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              Sync terakhir {myDaySummary.syncAt}
            </span>
          </div>
        </div>

        <Button
          asChild
          variant="secondary"
          className="mt-4 h-11 rounded-2xl border-0 bg-white/14 text-white hover:bg-white/20"
        >
          <Link href="/dashboard/leaderboard">Lihat poin, level, dan badge</Link>
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button className="h-auto justify-start rounded-2xl bg-emerald-600 px-4 py-4 text-left shadow-sm hover:bg-emerald-700">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4" />
              Check-in kerja
            </div>
            <p className="mt-1 text-xs text-emerald-100">
              Mulai job terpilih dengan timestamp otomatis
            </p>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-auto justify-start rounded-2xl bg-surface-container-lowest px-4 py-4 text-left text-foreground shadow-sm"
        >
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Camera className="h-4 w-4" />
              Upload foto
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Maks 500KB per foto untuk koneksi site lambat
            </p>
          </div>
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold">Job List Hari Ini</h4>
            <p className="text-sm text-muted-foreground">
              Dibuat foreman, tinggal update progres dari HP.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {myDayJobs.length} item
          </Badge>
        </div>

        {myDayJobs.map((job) => (
          <Card
            key={job.id}
            className="surface-module-card rounded-[1.5rem] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {job.id} • {job.type}
                </p>
                <h5 className="mt-1 text-base font-semibold text-slate-900">
                  {job.title}
                </h5>
              </div>
              <Badge
                className={`rounded-full border-0 px-3 py-1 ${statusStyles[job.status]}`}
              >
                {job.status}
              </Badge>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <div className="inline-flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-emerald-600" />
                Unit {job.unit}
              </div>
              <div className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-amber-600" />
                Window kerja {job.window}
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">{job.note}</p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">PIC: {job.lead}</div>
              <Button size="sm" className="rounded-full px-4">
                Update job
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3 pb-6">
        <div>
          <h4 className="text-lg font-semibold">Aktivitas Terkini</h4>
          <p className="text-sm text-muted-foreground">
            Ringkasan cepat untuk memastikan semua bukti kerja sudah tercatat.
          </p>
        </div>

        <Card className="surface-module-card rounded-[1.5rem] p-4">
          <div className="space-y-4">
            {myDayTimeline.map((item, index) => (
              <div key={`${item.time}-${item.title}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  {index < myDayTimeline.length - 1 ? (
                    <div className="mt-1 h-full w-px bg-slate-200" />
                  ) : null}
                </div>
                <div className="pb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {item.time}
                  </p>
                  <p className="mt-1 font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Button className="h-12 w-full rounded-2xl text-base">
          Submit daily activity
        </Button>
      </section>
    </div>
  );
}
