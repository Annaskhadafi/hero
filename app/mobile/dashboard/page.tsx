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
  Stethoscope,
  TriangleAlert,
  Trophy,
  MessageSquare,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MobileDashboardServices } from "@/components/mobile/mobile-dashboard-services";
import { MobileDashboardHeader } from "@/components/mobile/mobile-dashboard-header";
import { MobileDashboardTabs } from "@/components/mobile/mobile-dashboard-tabs";
import { getApprovalCenterData } from "@/lib/approval-workspace";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";
import { getSidebarDataForUser } from "@/lib/hero-admin";
import { buildMobileAllowedLinks, getMobileUrlForDesktopUrl } from "@/lib/mobile-access";
import { getMobileHc } from "@/lib/mobile-data";
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

  let data: Awaited<ReturnType<typeof getDailyActivityEmployeeData>> = null;
  let approvalData: Awaited<ReturnType<typeof getApprovalCenterData>> | null = null;
  let sidebarData: Awaited<ReturnType<typeof getSidebarDataForUser>> | null = null;
  let wellnessData: Awaited<ReturnType<typeof getMobileHc>> | null = null;

  try {
    [data, approvalData, sidebarData, wellnessData] = await Promise.all([
      getDailyActivityEmployeeData(session.user.email, { ensureSeed: false }),
      getApprovalCenterData(session.user.email),
      getSidebarDataForUser(session.user.email),
      getMobileHc(session.user.email),
    ]);
  } catch (err) {
    console.error("[mobile/dashboard] data fetch failed:", err);
    return (
      <div className="space-y-4 rounded-[1.25rem] bg-white p-5 text-sm font-semibold text-[#486275] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        <p>Gagal memuat dashboard.</p>
        <p className="text-xs font-normal text-slate-400">
          {err instanceof Error ? err.message : "Terjadi kesalahan saat mengambil data."}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[1.5rem] bg-white p-5 text-sm font-semibold text-[#486275] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        Data employee belum tersedia untuk akun ini.
      </div>
    );
  }
  
  const isHR = data.employee.section === "HRGA" || data.employee.section === "HR-GA";

  const rawSidebarItems = [...(sidebarData?.navMain ?? []), ...(sidebarData?.navSecondary ?? [])];
  const allowedLinks = buildMobileAllowedLinks([
    ...(sidebarData?.navMain ?? []),
    ...(sidebarData?.navSecondary ?? []),
    ...(sidebarData?.documents ?? []),
  ]);
  const seenUrls = new Set<string>();
  const sidebarItems = rawSidebarItems
    .map((item) => {
      const mobileUrl = getMobileUrlForDesktopUrl(item.url || "");
      if (!mobileUrl) return null;
      return {
        ...item,
        url: mobileUrl,
      };
    })
    .filter((item): item is NonNullable<typeof item> => {
      if (item === null) return false;
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

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
      <MobileDashboardHeader 
        employeeName={data.employee.name} 
        totalPoints={data.employee.totalPoints} 
        currentLevel={data.summary.currentLevel} 
      />



      <MobileDashboardServices isHR={isHR} sidebarItems={sidebarItems} allowedLinks={allowedLinks} />

      <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] border border-slate-100/80 border-l-4 border-l-[#f4b183]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#f4a78d]">Approval Center</p>
            <h2 className="mt-1 text-base font-black leading-tight text-[#082033]">
              {(approvalData?.inboxMetrics.pendingActivities ?? 0) > 0
                ? `${approvalData.inboxMetrics.pendingActivities} Item Menunggu`
                : "Inbox Approval Bersih"}
            </h2>
          </div>
          <Link
            prefetch={false}
            href="/mobile/approval"
            className="flex h-9 items-center gap-1 rounded-xl bg-[#003f78] px-3.5 text-[9px] font-black uppercase tracking-[0.12em] text-white active:scale-95 transition-transform"
          >
            Review
            <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Sleek inline metrics */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-center gap-2">
          <div className="flex-1">
            <span className="block text-xs font-black text-[#082033]">{approvalData?.inboxMetrics.pendingGroups ?? 0}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Group</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-100" />
          <div className="flex-1">
            <span className="block text-xs font-black text-[#082033]">{approvalData?.inboxMetrics.pendingActivities ?? 0}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-100" />
          <div className="flex-1">
            <span className="block text-xs font-black text-amber-600">{approvalData?.inboxMetrics.dueSoon ?? 0}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Soon</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-100" />
          <div className="flex-1">
            <span className="block text-xs font-black text-rose-600">{approvalData?.inboxMetrics.overdue ?? 0}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Late</span>
          </div>
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

      <MobileDashboardTabs 
        primaryAssignment={primaryAssignment} 
        recentFeed={recentFeed} 
        siteName={data.site?.name ?? ""} 
        workLocation={data.employee.workLocation ?? ""} 
      />

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

      {/* MCU Wellness shortcut */}
      {wellnessData?.mcuHistory && wellnessData.mcuHistory.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Medical Check Up</p>
          <Link
            prefetch={false}
            href="/mobile/wellness"
            className="flex items-center justify-between rounded-[1.25rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)] active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                "flex size-11 items-center justify-center rounded-2xl",
                wellnessData.mcuHistory[0].status === "fit"
                  ? "bg-emerald-50 text-emerald-600"
                  : wellnessData.mcuHistory[0].status === "unfit"
                  ? "bg-rose-50 text-rose-600"
                  : "bg-amber-50 text-amber-600"
              )}>
                <Stethoscope className="size-5" />
              </span>
              <div>
                <p className="text-sm font-black text-[#082033]">
                  MCU {wellnessData.mcuHistory[0].mcuDate
                    ? new Date(wellnessData.mcuHistory[0].mcuDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                    : "-"}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[#486275]">
                  {wellnessData.mcuHistory[0].aiKategori || wellnessData.mcuHistory[0].status || "Lihat detail"}
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-[#486275]" />
          </Link>
        </section>
      )}

    </div>
  );
}
