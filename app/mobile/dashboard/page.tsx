import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSignature,
  MapPin,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Trophy,
  MessageSquare,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MobilePortalChitraSlider } from "@/components/mobile/mobile-portal-chitra-slider";
import { getApprovalCenterData } from "@/lib/approval-workspace";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";
import { getVisiblePortalChitraAppsForEmail } from "@/lib/portal-chitra";
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

function getNextAction(data: NonNullable<Awaited<ReturnType<typeof getDailyActivityEmployeeData>>>) {
  if (data.standaloneOvertimeChecklist || data.routeChecklist?.activeSpl) {
    return {
      label: "Kerjakan SPL",
      href: "/mobile/activity/input",
      detail: "Isi evidence lembur",
    };
  }

  const hasAssignment = data.assignments.length > 0;
  const hasActivity = data.activities.length > 0;
  const needsActivity = hasAssignment && data.summary.jobsCompleted < data.summary.jobsAssigned;

  if (needsActivity || (!hasActivity && hasAssignment)) {
    return {
      label: "Input Activity",
      href: "/mobile/activity/input",
      detail: "Submit progress kerja",
    };
  }

  if (!hasActivity) {
    return {
      label: "Check-In Work",
      href: "/mobile/attendance",
      detail: "Mulai presensi lapangan",
    };
  }

  return {
    label: "Review Activity",
    href: "/mobile/activity",
    detail: "Cek log hari ini",
  };
}

function formatFeedTime(value: Date) {
  return value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildRecentFeed(data: NonNullable<Awaited<ReturnType<typeof getDailyActivityEmployeeData>>>) {
  return [
    ...data.activities.map((activity) => ({
      id: `activity-${activity.id}`,
      title: activity.title,
      detail: `${activity.statusLabel} • ${activity.durationLabel}`,
      at: activity.submissionTime ?? activity.startTime,
      tone: "activity" as const,
    })),
    ...data.pointsFeed.map((event) => ({
      id: `point-${event.id}`,
      title: event.label,
      detail: `+${event.points} poin • ${event.category}`,
      at: event.createdAt,
      tone: "point" as const,
    })),
    ...data.penalties.map((penalty) => ({
      id: `penalty-${penalty.id}`,
      title: penalty.penaltyCode,
      detail: `-${penalty.pointsDeducted} poin • ${penalty.description}`,
      at: penalty.createdAt,
      tone: "penalty" as const,
    })),
  ]
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, 4);
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

  const [data, approvalData, portalApps] = await Promise.all([
    getDailyActivityEmployeeData(session.user.email, { ensureSeed: false }),
    getApprovalCenterData(session.user.email),
    getVisiblePortalChitraAppsForEmail(session.user.email, { mobileOnly: true }),
  ]);

  if (!data) {
    return (
      <div className="rounded-[1.5rem] bg-white p-5 text-sm font-semibold text-[#486275] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        Data employee belum tersedia untuk akun ini.
      </div>
    );
  }

  const primaryAssignment = data.assignments[0];
  const nextAction = getNextAction(data);
  const recentFeed = buildRecentFeed(data);
  const progressPercent =
    data.summary.jobsAssigned > 0
      ? Math.min(100, Math.round((data.summary.jobsCompleted / data.summary.jobsAssigned) * 100))
      : 0;
  const levelProgress = Math.max(8, Math.min(96, data.employee.totalPoints % 100));
  const reliability = Math.min(99, 88 + Math.min(data.summary.streakDays, 10));
  const activeSplCard = data.standaloneOvertimeChecklist
    ? {
        splNumber: data.standaloneOvertimeChecklist.splNumber,
        title: data.standaloneOvertimeChecklist.title,
        lineCount: data.standaloneOvertimeChecklist.lineCount,
        plannedPointsTotal: data.standaloneOvertimeChecklist.plannedPointsTotal,
        checkedCount: data.standaloneOvertimeChecklist.checkedCount,
        progressPercent: data.standaloneOvertimeChecklist.progressPercent,
        detail:
          data.standaloneOvertimeChecklist.requestNotes ||
          data.standaloneOvertimeChecklist.executionNotes ||
          "SPL aktif siap diisi evidence.",
      }
    : data.routeChecklist?.activeSpl
      ? {
          splNumber: data.routeChecklist.activeSpl.splNumber,
          title: data.routeChecklist.activeSpl.title,
          lineCount: data.routeChecklist.activeSpl.lineCount,
          plannedPointsTotal: data.routeChecklist.activeSpl.plannedPointsTotal,
          checkedCount: 0,
          progressPercent: 0,
          detail: data.routeChecklist.activeSpl.requestNotes || "SPL aktif dari route checklist.",
        }
      : null;

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

      <Link
        prefetch={false}
        href={nextAction.href}
        className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-white px-4 py-4 text-[#082033] shadow-[0_14px_30px_rgba(8,32,51,0.08)] active:scale-[0.98]"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#486275]">Next action</p>
          <p className="mt-1 text-base font-black">{nextAction.label}</p>
          <p className="mt-1 text-xs font-semibold text-[#486275]">{nextAction.detail}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
          <ArrowRight className="size-4" />
        </span>
      </Link>

      <section className="grid grid-cols-2 gap-3">
        <Link
          prefetch={false}
          href="/mobile/attendance"
          className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-[1.25rem] bg-white text-center text-[#003461] shadow-[0_14px_30px_rgba(8,32,51,0.08)] ring-1 ring-[#d8e8f3] active:scale-[0.98]"
        >
          <BriefcaseBusiness className="size-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em]">Check-In Work</span>
        </Link>
        <Link
          prefetch={false}
          href="/mobile/hse"
          className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-[1.25rem] bg-white text-center text-[#5a2200] shadow-[0_14px_30px_rgba(90,34,0,0.08)] ring-1 ring-[#ead8ce] active:scale-[0.98]"
        >
          <ShieldCheck className="size-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em]">HSE Report</span>
        </Link>
      </section>

      <section>
        <Link
          prefetch={false}
          href="/api/lms/sso"
          target="_blank"
          className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-4 text-[#14532d] shadow-[0_14px_30px_rgba(20,83,45,0.06)] active:scale-[0.98]"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#166534]">Chitra Learning LMS</p>
            <p className="mt-1 text-base font-black text-[#14532d]">Buka LMS & Mulai Belajar</p>
            <p className="mt-1 text-xs font-semibold text-[#166534]">Akses ribuan materi sertifikasi online</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#15803d]">
            <Sparkles className="size-4" />
          </span>
        </Link>
      </section>

      <section>
        <Link
          prefetch={false}
          href="/mobile/curhat"
          className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-white px-4 py-4 text-[#003461] shadow-[0_14px_30px_rgba(8,32,51,0.08)] active:scale-[0.98]"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#486275]">Bantuan Karyawan</p>
            <p className="mt-1 text-base font-black">Curhat Dengan HR</p>
            <p className="mt-1 text-xs font-semibold text-[#486275]">Konsultasi tertutup dan rahasia</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
            <MessageSquare className="size-4" />
          </span>
        </Link>
      </section>

      {(data.employee.section === "HRGA" || data.employee.section === "HR-GA") && (
        <section>
          <Link
            prefetch={false}
            href="/mobile/hr-counseling"
            className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-gradient-to-r from-[#003461] to-[#005193] px-4 py-4 text-white shadow-[0_14px_30px_rgba(8,32,51,0.2)] active:scale-[0.98]"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#93c5fd]">Human Capital Panel</p>
              <p className="mt-1 text-base font-black">Inbox HR Counseling</p>
              <p className="mt-1 text-xs font-semibold text-[#bfdbfe]">Kelola sesi curhat karyawan</p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#003f78]">
              <MessageSquare className="size-4" />
            </span>
          </Link>
        </section>
      )}

      <MobilePortalChitraSlider apps={portalApps} />

      <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Approval Snapshot</p>
            <h2 className="mt-1 text-lg font-black leading-tight text-[#082033]">
              {approvalData.inboxMetrics.pendingActivities > 0
                ? `${approvalData.inboxMetrics.pendingActivities} item menunggu`
                : "Inbox approval clear"}
            </h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#486275]">
              {approvalData.inboxMetrics.pendingGroups} group • {approvalData.inboxMetrics.dueSoon} due soon •{" "}
              {approvalData.inboxMetrics.overdue} overdue
            </p>
          </div>
          <Link
            prefetch={false}
            href="/mobile/approval"
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-3 text-[10px] font-black uppercase tracking-[0.08em] active:scale-[0.98]",
              approvalData.inboxMetrics.overdue > 0 || approvalData.inboxMetrics.dueSoon > 0
                ? "bg-[#f6dfcf] text-[#5a2200]"
                : "bg-[#e9f6fd] text-[#003f78]",
            )}
          >
            Review
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            ["Group", approvalData.inboxMetrics.pendingGroups],
            ["Item", approvalData.inboxMetrics.pendingActivities],
            ["Soon", approvalData.inboxMetrics.dueSoon],
            ["Late", approvalData.inboxMetrics.overdue],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-[#f6fbff] px-2 py-2">
              <p className="text-base font-black leading-none text-[#082033]">{value}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#486275]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {activeSplCard ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#5a2200]" />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Active SPL</p>
          </div>

          <div className="rounded-[1.3rem] bg-white p-4 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                  {activeSplCard.splNumber}
                </p>
                <h2 className="mt-1 text-lg font-black leading-tight text-[#082033]">{activeSplCard.title}</h2>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#486275]">{activeSplCard.detail}</p>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f6dfcf] text-[#5a2200]">
                <FileSignature className="size-5" />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#f6fbff] px-3 py-3">
                <p className="text-lg font-black leading-none text-[#082033]">{activeSplCard.lineCount}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#486275]">Line</p>
              </div>
              <div className="rounded-xl bg-[#f6fbff] px-3 py-3">
                <p className="text-lg font-black leading-none text-[#082033]">{activeSplCard.progressPercent}%</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#486275]">Progress</p>
              </div>
              <div className="rounded-xl bg-[#f6fbff] px-3 py-3">
                <p className="text-lg font-black leading-none text-[#082033]">{activeSplCard.plannedPointsTotal}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#486275]">Point</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#e9f6fd] px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Evidence target</p>
                <p className="mt-1 text-sm font-black text-[#082033]">
                  {activeSplCard.checkedCount > 0
                    ? `${activeSplCard.checkedCount} line sudah terisi`
                    : "Belum ada evidence masuk"}
                </p>
              </div>
              <Link
                prefetch={false}
                href="/mobile/activity/input"
                className="flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#003f78] px-4 text-[10px] font-black uppercase tracking-[0.08em] text-white active:scale-[0.98]"
              >
                Kerjakan
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[#5a2200]" />
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Pekerjaan Aktual</p>
        </div>

        <div className="rounded-[1.3rem] bg-white p-4 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
          {primaryAssignment ? (
            <div className="border-l-4 border-[#003f78] pl-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black leading-tight text-[#082033]">
                    {primaryAssignment.customJobName || primaryAssignment.activityName || "Pekerjaan Aktual"}
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
            <div className="rounded-2xl bg-[#f6fbff] p-4 text-center">
              <p className="text-sm font-black text-[#082033]">Belum ada assignment aktif hari ini.</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#486275]">
                Tetap bisa input aktivitas mandiri atau buka menu kerja.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  prefetch={false}
                  href="/mobile/activity/input"
                  className="flex min-h-11 items-center justify-center rounded-lg bg-[#003f78] px-3 text-[10px] font-black uppercase tracking-[0.08em] text-white active:scale-[0.98]"
                >
                  Input
                </Link>
                <Link
                  prefetch={false}
                  href="/mobile/approval"
                  className="flex min-h-11 items-center justify-center rounded-lg bg-white px-3 text-[10px] font-black uppercase tracking-[0.08em] text-[#003f78] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)] active:scale-[0.98]"
                >
                  Approval
                </Link>
              </div>
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
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Jobs Today</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <Clock3 className="size-5 text-[#5a2200]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.summary.syncAt}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Last Sync</p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Recent Activity</p>
        {recentFeed.length > 0 ? (
          <div className="space-y-2">
            {recentFeed.map((item) => {
              const Icon =
                item.tone === "penalty" ? TriangleAlert : item.tone === "point" ? Sparkles : CheckCircle2;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-[1.1rem] bg-white p-3 shadow-[0_10px_24px_rgba(8,32,51,0.06)]"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      item.tone === "penalty" ? "bg-[#f6dfcf] text-[#5a2200]" : "bg-[#e9f6fd] text-[#003f78]",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[#082033]">{item.title}</p>
                    <p className="truncate text-xs font-semibold text-[#486275]">{item.detail}</p>
                  </div>
                  <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">
                    {formatFeedTime(item.at)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada aktivitas, poin, atau penalty hari ini.
          </div>
        )}
      </section>
    </div>
  );
}
