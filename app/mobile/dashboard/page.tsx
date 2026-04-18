import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";
import { cn } from "@/lib/utils";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 19) return "Selamat Sore";
  return "Selamat Malam";
}

function formatShortTime(value?: Date | null) {
  if (!value) return "--:--";

  return value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "User";
}

function MiniAvatar({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 items-center justify-center rounded-full text-[10px] font-black",
        active ? "bg-[#f4b183] text-[#5a2200]" : "bg-[#003f78] text-white",
      )}
    >
      {label}
    </span>
  );
}

export default async function MobileDashboardPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityEmployeeData(session.user.email);

  if (!data) {
    return (
      <div className="rounded-[1.5rem] bg-white p-5 text-sm font-semibold text-[#5d7485] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        Data employee belum tersedia untuk akun ini.
      </div>
    );
  }

  const primaryAssignment = data.assignments[0];
  const progressPercent =
    data.summary.jobsAssigned > 0
      ? Math.min(100, Math.round((data.summary.jobsCompleted / data.summary.jobsAssigned) * 100))
      : 0;
  const levelProgress = Math.max(8, Math.min(96, data.employee.totalPoints % 100));
  const reliability = Math.min(99, 88 + Math.min(data.summary.streakDays, 10));

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Command Center</p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">
          {getGreeting()}, {firstName(data.employee.name)}
        </h1>
      </section>

      <section className="overflow-hidden rounded-[1.35rem] bg-[#003f78] p-4 text-white shadow-[0_20px_42px_rgba(0,63,120,0.26)]">
        <div className="flex items-start justify-between">
          <div>
            <Badge className="border-0 bg-white/16 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white">
              <Trophy className="mr-1 size-3" />
              Current Rank
            </Badge>
            <p className="mt-2 text-2xl font-black italic leading-none tracking-tight">
              {data.summary.currentLevel.toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">PTS</p>
            <p className="text-3xl font-black leading-none">{data.employee.totalPoints.toLocaleString("id-ID")}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-[9px] font-black uppercase tracking-[0.18em] text-[#b9dff6]">
          <span>XP Progress</span>
          <span className="text-right">Next Level · Pro</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#0a5798]">
          <div
            className="h-full rounded-full bg-[#f4a78d] shadow-[0_0_18px_rgba(244,167,141,0.55)]"
            style={{ width: `${levelProgress}%` }}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/mobile/activity/input"
          className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-[1.25rem] bg-white text-center text-[#003461] shadow-[0_14px_30px_rgba(8,32,51,0.08)] ring-1 ring-[#d8e8f3] active:scale-[0.98]"
        >
          <BriefcaseBusiness className="size-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em]">Check-In Work</span>
        </Link>
        <Link
          href="/mobile/hse"
          className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-[1.25rem] bg-white text-center text-[#5a2200] shadow-[0_14px_30px_rgba(90,34,0,0.08)] ring-1 ring-[#ead8ce] active:scale-[0.98]"
        >
          <ShieldCheck className="size-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em]">HSE Report</span>
        </Link>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[#5a2200]" />
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Ongoing Assignment</p>
        </div>

        <div className="rounded-[1.3rem] bg-white p-4 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
          {primaryAssignment ? (
            <div className="border-l-4 border-[#003f78] pl-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black leading-tight text-[#082033]">
                    {primaryAssignment.customJobName || primaryAssignment.activityName || "Assignment Lapangan"}
                  </h2>
                  <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#486275]">
                    <MapPin className="size-3.5" />
                    {data.site?.name ?? data.employee.workLocation ?? "Site"}
                  </div>
                </div>
                <Badge className="border-0 bg-[#eaf4fb] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#003f78]">
                  {primaryAssignment.statusLabel}
                </Badge>
              </div>

              <div className="mt-4 border-t border-dashed border-[#d8e8f3] pt-3">
                <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">
                  <div>
                    <p>Started</p>
                    <p className="mt-1 text-xs text-[#082033]">{formatShortTime(primaryAssignment.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p>E.T.A</p>
                    <p className="mt-1 text-xs text-[#082033]">{formatShortTime(primaryAssignment.deadline)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-28 items-center justify-center rounded-2xl bg-[#f6fbff] text-center text-sm font-semibold text-[#5d7485]">
              Belum ada assignment aktif hari ini.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Attendance Summary</p>
        <div className="flex items-center justify-between rounded-[1.25rem] bg-[#e9f6fd] p-4 shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#d7ecf9] text-[#003f78]">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="text-xl font-black leading-none text-[#082033]">{reliability}%</p>
              <p className="mt-1 text-[10px] font-bold text-[#486275]">Monthly Reliability</p>
            </div>
          </div>
          <div className="flex -space-x-2">
            <MiniAvatar label="M" />
            <MiniAvatar label="T" />
            <MiniAvatar label="W" />
            <MiniAvatar label="T" active />
            <MiniAvatar label="F" active={progressPercent >= 80} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <CheckCircle2 className="size-5 text-[#003f78]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.summary.jobsCompleted}/{data.summary.jobsAssigned}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5d7485]">Jobs Today</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <Clock3 className="size-5 text-[#5a2200]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.summary.syncAt}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5d7485]">Last Sync</p>
        </div>
      </section>
    </div>
  );
}
