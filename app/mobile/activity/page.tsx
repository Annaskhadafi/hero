import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MobileActivityLog } from "@/components/mobile/mobile-activity-log";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";

function formatTime(value?: Date | null) {
  if (!value) return "--:--";

  return value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("approved")) {
    return "border-0 bg-[#dff4e8] text-[#14532d]";
  }

  if (normalized.includes("pending")) {
    return "border-0 bg-[#fff1cf] text-[#8a5a00]";
  }

  return "border-0 bg-[#eaf4fb] text-[#003f78]";
}

export default async function MobileActivityPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityEmployeeData(session.user.email, { ensureSeed: false });

  if (!data) {
    return (
      <div className="rounded-lg bg-white p-5 text-sm font-semibold leading-6 text-[#486275] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        Data employee belum tersedia untuk akun ini. Hubungkan email user dengan employee record dulu.
      </div>
    );
  }

  const productivityPercent =
    data.summary.jobsAssigned > 0
      ? Math.round((data.summary.jobsCompleted / data.summary.jobsAssigned) * 100)
      : data.activities.length > 0
        ? 100
        : 0;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Daily Activity</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Activity List</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-[#486275]">
              Input activity pribadi, lihat log hari ini, lalu pantau produktivitas langsung dari HP.
            </p>
          </div>
          <Link
            prefetch={false}
            href="/mobile/activity/input"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)] active:scale-[0.98]"
            aria-label="Tambah activity"
          >
            <Plus className="size-5" />
          </Link>
        </div>

        <div className="rounded-[1.35rem] bg-[#003f78] p-4 text-white shadow-[0_20px_42px_rgba(0,63,120,0.26)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="border-0 bg-white/16 text-[9px] font-black uppercase tracking-[0.16em] text-white">
                <Sparkles className="mr-1 size-3" />
                Productivity
              </Badge>
              <p className="mt-3 text-3xl font-black leading-none">{productivityPercent}%</p>
              <p className="mt-2 text-xs font-semibold text-[#b9dff6]">
                {data.summary.jobsCompleted}/{data.summary.jobsAssigned} job tercapai hari ini
              </p>
            </div>
            <Link
              prefetch={false}
              href="/mobile/activity/input"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-[#003f78] active:scale-[0.98]"
            >
              Add
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-[1rem] bg-white/10 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b9dff6]">Points</p>
              <p className="mt-1 text-lg font-black">{data.summary.pointsToday}</p>
            </div>
            <div className="rounded-[1rem] bg-white/10 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b9dff6]">Streak</p>
              <p className="mt-1 text-lg font-black">{data.summary.streakDays}</p>
            </div>
            <div className="rounded-[1rem] bg-white/10 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b9dff6]">Sync</p>
              <p className="mt-1 text-lg font-black">{data.summary.syncAt}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_30px_rgba(8,32,51,0.08)]">
          <ClipboardList className="size-5 text-[#003f78]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.summary.jobsAssigned}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Queue</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_30px_rgba(8,32,51,0.08)]">
          <CheckCircle2 className="size-5 text-[#1f7a4f]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.summary.jobsCompleted}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Done</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_30px_rgba(8,32,51,0.08)]">
          <Target className="size-5 text-[#5a2200]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.activities.length}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Log</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Assignment Queue</p>
          <Badge className="border-0 bg-[#eaf4fb] text-[9px] font-black uppercase tracking-[0.14em] text-[#003f78]">
            {data.assignments.length} item
          </Badge>
        </div>

        {data.assignments.length > 0 ? (
          data.assignments.map((assignment) => (
            <article
              key={assignment.id}
              className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
                    {assignment.activityCode ?? "Custom Job"}
                  </p>
                  <h2 className="mt-1 text-base font-black leading-tight text-[#082033]">
                    {assignment.customJobName || assignment.activityName || "Assignment Lapangan"}
                  </h2>
                  <p className="mt-2 text-xs font-semibold text-[#486275]">
                    {assignment.assignedByName} • {assignment.durationLabel}
                  </p>
                </div>
                <Badge className={statusBadgeClass(assignment.statusLabel)}>{assignment.statusLabel}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-[#486275]">
                <div className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Deadline</p>
                  <p className="mt-1 text-sm text-[#082033]">{formatTime(assignment.deadline)}</p>
                </div>
                <div className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Priority</p>
                  <p className="mt-1 text-sm text-[#082033]">{assignment.priority}</p>
                </div>
              </div>

              {assignment.notes ? (
                <p className="mt-3 text-xs leading-5 text-[#486275]">{assignment.notes}</p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-[1.25rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada assignment hari ini.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Activity Log</p>
          <Link
            prefetch={false}
            href="/mobile/activity/input"
            className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-[#003f78]"
          >
            Add Activity
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <MobileActivityLog
          activities={data.activities.map((activity) => ({
            ...activity,
            startTime: activity.startTime.toISOString(),
            endTime: activity.endTime.toISOString(),
            submissionTime: activity.submissionTime?.toISOString() ?? null,
          }))}
        />
      </section>
    </div>
  );
}
